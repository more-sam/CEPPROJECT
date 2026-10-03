"""Idempotent database seeding.

Running `python -m app.seed` repeatedly must be safe, so every step upserts on a
natural key rather than blindly inserting.

Data provenance is explicit: every seeded opportunity is written with
`source="DEMO"` because these are fictional listings, and the UI surfaces
that so nothing implies a live vacancy.
"""

import json
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.ai.resume_parser import clean_text
from app.ai.skill_extractor import extract_skills
from app.ai.taxonomy import get_taxonomy
from app.core.config import settings
from app.core.security import hash_password
from app.models.assessment import Assessment, AssessmentQuestion, AssessmentResult
from app.models.company import Company
from app.models.enums import SkillImportance
from app.models.job import Job, JobSkill
from app.models.match import JobMatch, SavedJob
from app.models.profile import StudentProfile
from app.models.progress import Progress
from app.models.resume import Resume
from app.models.roadmap import Roadmap
from app.models.skill import Skill, StudentSkill
from app.models.user import User

SAMPLE_SOURCE = "DEMO"
DEMO_SOURCE = "demo-profile"

# The skills the demo student starts with, chosen so the seeded dataset produces
# a realistic spread of compatibility scores rather than everything at 100%.
DEMO_SKILLS = ["Python", "JavaScript", "React", "SQL", "Git", "HTML", "CSS"]


def _load_json(*parts: str) -> dict:
    path = settings.data_path(*parts)
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _importance_for_index(index: int, total: int) -> str:
    """Derive a requirement's importance from its position in the listing.

    Job descriptions conventionally lead with the must-haves, so the first third
    are treated as high importance, the middle third as medium and the rest as
    low. This is a documented heuristic, not a claim about the employer's intent.
    """
    if total <= 0:
        return SkillImportance.MEDIUM.value
    share = index / total
    if share < 0.34:
        return SkillImportance.HIGH.value
    if share < 0.67:
        return SkillImportance.MEDIUM.value
    return SkillImportance.LOW.value


def seed_skills(db: Session) -> dict[str, Skill]:
    """Upsert every taxonomy skill. Returns slug -> Skill."""
    taxonomy = get_taxonomy()
    existing = {skill.slug: skill for skill in db.scalars(select(Skill)).all()}

    for entry in taxonomy.skills:
        row = existing.get(entry.slug)
        if row is None:
            row = Skill(
                name=entry.name,
                slug=entry.slug,
                category=entry.category,
                description=entry.description,
                aliases=list(entry.aliases),
            )
            db.add(row)
            existing[entry.slug] = row
        else:
            # Keep names, categories and aliases in step with the taxonomy file.
            row.name = entry.name
            row.category = entry.category
            row.description = entry.description
            row.aliases = list(entry.aliases)

    db.commit()
    return {slug: skill for slug, skill in existing.items()}


def seed_companies(db: Session, payload: dict) -> dict[str, Company]:
    existing = {company.name: company for company in db.scalars(select(Company)).all()}

    for entry in payload["companies"]:
        row = existing.get(entry["name"])
        if row is None:
            row = Company(name=entry["name"])
            db.add(row)
            existing[entry["name"]] = row
        row.description = entry.get("description")
        row.website_url = entry.get("website_url")
        row.location = entry.get("location")
        row.logo_url = entry.get("logo_url")
        # NULL when the seed entry has no industry label; never invented.
        row.industry = entry.get("industry")

    db.commit()
    return existing


def seed_jobs(db: Session, payload: dict, skills: dict[str, Skill]) -> int:
    """Upsert companies' opportunities and their required skills.

    Required skills come from two sources, merged:
      1. The explicit `required_skills` list in the seed file.
      2. Skills extracted from the free-text description and requirements.
    Running the real extractor here proves the job-analysis path works and
    catches skills the author of the seed file did not enumerate.
    """
    companies = seed_companies(db, payload)
    taxonomy = get_taxonomy()
    count = 0

    for entry in payload["jobs"]:
        company = companies.get(entry["company"])
        if company is None:
            continue

        posted = datetime.now(UTC) - timedelta(days=int(entry.get("posted_days_ago", 0)))

        job = db.scalar(
            select(Job).where(Job.company_id == company.id, Job.title == entry["title"])
        )
        if job is None:
            job = Job(company_id=company.id, title=entry["title"])
            db.add(job)

        job.description = entry["description"]
        job.requirements_text = entry.get("requirements_text")
        job.location = entry["location"]
        job.employment_type = entry["employment_type"]
        job.work_type = entry["work_type"]
        job.experience_level = entry["experience_level"]
        # Fictional demo companies have no real application page. Only use an
        # explicit application_url when the seed entry provides one; otherwise
        # clear any previously-seeded placeholder so the UI shows the unavailable
        # state instead of presenting a placeholder link.
        if "application_url" in entry:
            job.application_url = entry["application_url"]
        else:
            job.application_url = ""
        job.source = entry.get("source", SAMPLE_SOURCE)
        job.posted_at = posted
        # Application status comes ONLY from the explicit seed entry. A missing
        # status stays "unknown" — existence in the table does not prove that
        # applications are open (spec section 7).
        job.status = str(entry.get("status", "unknown"))
        # Demo rows are never "verified": no real source has confirmed them.
        job.last_verified_at = None
        job.expires_at = posted + timedelta(days=45)
        db.flush()

        # --- merge explicit + extracted requirements ---
        ordered_slugs: list[str] = []
        for name in entry.get("required_skills", []):
            resolved = taxonomy.find(name)
            if resolved is not None and resolved.slug not in ordered_slugs:
                ordered_slugs.append(resolved.slug)

        extracted_text = " ".join(
            filter(None, [entry["description"], entry.get("requirements_text")])
        )
        for item in extract_skills(clean_text(extracted_text)):
            if item.slug not in ordered_slugs and item.confidence >= 0.7:
                ordered_slugs.append(item.slug)

        total = len(ordered_slugs)
        explicit_count = len(entry.get("required_skills", []))

        existing_links = {
            link.skill_id: link for link in db.scalars(
                select(JobSkill).where(JobSkill.job_id == job.id)
            ).all()
        }

        for index, slug in enumerate(ordered_slugs):
            skill = skills.get(slug)
            if skill is None:
                continue

            # Skills listed explicitly are treated as stated requirements (high);
            # ones only inferred from prose start at medium.
            if index < explicit_count:
                importance = _importance_for_index(index, max(explicit_count, 1))
            else:
                importance = SkillImportance.MEDIUM.value

            link = existing_links.get(skill.id)
            if link is None:
                link = JobSkill(job_id=job.id, skill_id=skill.id)
                db.add(link)
            link.importance = importance
            link.weight = {
                SkillImportance.HIGH.value: 100,
                SkillImportance.MEDIUM.value: 50,
                SkillImportance.LOW.value: 25,
            }[importance]

        # Drop links that are no longer required (seed file changed).
        keep = {skills[slug].id for slug in ordered_slugs if slug in skills}
        for skill_id, link in existing_links.items():
            if skill_id not in keep:
                db.delete(link)

        count += 1

    db.commit()
    _refresh_search_text(db)
    return count


def _refresh_search_text(db: Session) -> None:
    """Rebuild each job's searchable haystack after skills change."""
    from app.services.job_service import build_search_text

    for job in db.scalars(
        select(Job).options(
            # company and job_skills are needed to build the haystack
        )
    ).all():
        job.search_text = build_search_text(job)
        db.add(job)
    db.commit()


def seed_assessments(db: Session, payload: dict, skills: dict[str, Skill]) -> int:
    taxonomy = get_taxonomy()
    count = 0

    for entry in payload["assessments"]:
        resolved = taxonomy.find(entry["skill"])
        if resolved is None:
            continue
        skill = skills.get(resolved.slug)
        if skill is None:
            continue

        assessment = db.scalar(
            select(Assessment).where(
                Assessment.skill_id == skill.id, Assessment.title == entry["title"]
            )
        )
        if assessment is None:
            assessment = Assessment(skill_id=skill.id, title=entry["title"])
            db.add(assessment)

        assessment.description = entry.get("description")
        assessment.difficulty = entry.get("difficulty", "beginner")
        assessment.pass_score = int(entry.get("pass_score", 60))
        db.flush()

        # Replace questions wholesale so edits to the JSON always take effect.
        for existing in db.scalars(
            select(AssessmentQuestion).where(
                AssessmentQuestion.assessment_id == assessment.id
            )
        ).all():
            db.delete(existing)
        db.flush()

        for index, question in enumerate(entry["questions"]):
            db.add(
                AssessmentQuestion(
                    assessment_id=assessment.id,
                    question=question["question"],
                    options=question["options"],
                    correct_answer=question["correct_answer"],
                    explanation=question.get("explanation", ""),
                    order_index=index,
                )
            )
        count += 1

    db.commit()
    return count


def seed_demo_user(db: Session, skills: dict[str, Skill]) -> tuple[User | None, bool]:
    """Create the development-only demo account. Returns (user, created)."""
    if not settings.seed_demo_user:
        return None, False

    taxonomy = get_taxonomy()

    email = settings.demo_user_email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    created = False

    if user is None:
        user = User(
            email=email,
            password_hash=hash_password(settings.demo_user_password),
        )
        db.add(user)
        db.flush()
        created = True

    profile = db.scalar(
        select(StudentProfile).where(StudentProfile.user_id == user.id)
    )
    if profile is None:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
        db.flush()

    # Only backfill the profile on first creation, so a demo user's own edits are
    # never overwritten by re-running the seeder.
    if created or not profile.full_name:
        profile.full_name = "Alex Sharma"
        profile.college = "Government College of Engineering"
        profile.degree = "B.Tech"
        profile.branch = "Computer Science"
        profile.graduation_year = datetime.now(UTC).year + 1
        profile.preferred_roles = ["Software Engineer", "Full Stack Developer", "Backend Developer"]
        profile.preferred_locations = ["Bengaluru", "Remote", "Hyderabad"]
        profile.work_type = "hybrid"
        profile.bio = (
            "Final-year Computer Science student interested in backend and "
            "full-stack development."
        )

    for name in DEMO_SKILLS:
        entry = taxonomy.find(name)
        resolved = skills.get(entry.slug) if entry is not None else None
        if resolved is None:
            continue
        exists = db.scalar(
            select(StudentSkill).where(
                StudentSkill.student_id == profile.id,
                StudentSkill.skill_id == resolved.id,
            )
        )
        if exists is None:
            db.add(
                StudentSkill(
                    student_id=profile.id,
                    skill_id=resolved.id,
                    proficiency="intermediate",
                    confidence=1.0,
                    source=DEMO_SOURCE,
                )
            )

    db.commit()
    return user, created


def _demo_baseline_skill_ids(db: Session, profile: StudentProfile) -> set[int]:
    """Skill ids the demo account should start with."""
    taxonomy = get_taxonomy()
    slugs = [
        entry.slug
        for entry in (taxonomy.find(name) for name in DEMO_SKILLS)
        if entry is not None
    ]
    if not slugs:
        return set()
    return set(db.scalars(select(Skill.id).where(Skill.slug.in_(slugs))))


def reset_demo_profile(db: Session) -> dict:
    """Restore the demo account to its documented starting state.

    Exploring the product as the demo user (uploading a resume, taking
    assessments, generating roadmaps) permanently changes that account, which
    makes the demo drift away from a realistic, gap-rich profile over time. This
    deliberately destructive reset is opt-in via `python -m app.seed
    --reset-demo`, and it only ever touches the configured demo account.
    """
    email = settings.demo_user_email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        return {"reset": False, "reason": "demo user not found"}

    profile = db.scalar(
        select(StudentProfile).where(StudentProfile.user_id == user.id)
    )
    if profile is None:
        return {"reset": False, "reason": "demo profile not found"}

    # Derived data first, so nothing is left pointing at deleted skills.
    for model, column in (
        (AssessmentResult, AssessmentResult.student_id),
        (Progress, Progress.student_id),
        (JobMatch, JobMatch.student_id),
        (SavedJob, SavedJob.student_id),
    ):
        db.execute(delete(model).where(column == profile.id))

    db.execute(delete(Roadmap).where(Roadmap.student_id == profile.id))

    # Remove stored resume files before dropping their rows.
    for resume in db.scalars(
        select(Resume).where(Resume.student_id == profile.id)
    ).all():
        if resume.storage_path:
            with suppress(OSError):
                Path(resume.storage_path).unlink()
        db.delete(resume)

    baseline = _demo_baseline_skill_ids(db, profile)
    removed = 0
    for row in db.scalars(
        select(StudentSkill).where(StudentSkill.student_id == profile.id)
    ).all():
        if row.skill_id not in baseline:
            db.delete(row)
            removed += 1

    profile.full_name = "Alex Sharma"
    profile.college = "Government College of Engineering"
    profile.degree = "B.Tech"
    profile.branch = "Computer Science"
    profile.graduation_year = datetime.now(UTC).year + 1
    profile.preferred_roles = [
        "Software Engineer",
        "Full Stack Developer",
        "Backend Developer",
    ]
    profile.preferred_locations = ["Bengaluru", "Remote", "Hyderabad"]
    profile.work_type = "hybrid"
    profile.bio = (
        "Final-year Computer Science student interested in backend and "
        "full-stack development."
    )

    db.commit()
    return {
        "reset": True,
        "email": email,
        "extra_skills_removed": removed,
        "baseline_skills": len(baseline),
    }


def run_seed(db: Session) -> dict:
    """Run every seeding step and return a summary."""
    skills = seed_skills(db)

    job_payload = _load_json("seed_jobs", "seed_jobs.json")
    jobs = seed_jobs(db, job_payload, skills)

    assessment_payload = _load_json("assessments", "assessments.json")
    assessments = seed_assessments(db, assessment_payload, skills)

    user, user_created = seed_demo_user(db, skills)

    return {
        "skills": len(skills),
        "companies": len(job_payload["companies"]),
        "jobs": jobs,
        "assessments": assessments,
        "questions": sum(
            len(entry["questions"]) for entry in assessment_payload["assessments"]
        ),
        "demo_user": user.email if user else None,
        "demo_user_created": user_created,
    }
