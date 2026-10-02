"""Dashboard aggregation.

One request returns everything the dashboard renders, so the page does not fan
out into a dozen round-trips.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.assessment import Assessment, AssessmentResult
from app.models.job import Job
from app.models.match import SavedJob
from app.models.profile import StudentProfile
from app.models.resume import Resume
from app.models.skill import Skill, StudentSkill
from app.services.profile_service import profile_completeness, student_skill_slugs
from app.services.progress_service import overview
from app.services.recommendation_service import (
    DEFAULT_GAP_ROLE_LIMIT,
    demand_summary,
    job_card_payload,
    recommend_for_student,
)
from app.utils.links import company_initials, company_name_from_card
from app.services.roadmap_service import active_roadmap, roadmap_summary
from app.services.resume_service import latest_resume


def _greeting_name(profile: StudentProfile, fallback_email: str) -> str:
    if profile.full_name:
        # Use the first name only, which reads more naturally in a greeting.
        return profile.full_name.strip().split()[0]
    return fallback_email.split("@")[0].title()


def _skill_constellation(db: Session, profile: StudentProfile) -> list[dict]:
    """The student's skills with a state, for the skill-network visual.

    `owned`    - explicitly on the profile
    `learning` - currently on the roadmap
    `gap`      - required by recommended roles but not yet present
    """
    owned_rows = db.execute(
        select(Skill.name, Skill.slug, Skill.category)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.student_id == profile.id)
        .order_by(Skill.category, Skill.name)
    ).all()
    owned = {slug for _, slug, _ in owned_rows}

    nodes = [
        {"name": name, "slug": slug, "category": category, "state": "owned"}
        for name, slug, category in owned_rows
    ]

    roadmap = active_roadmap(db, profile)
    learning: set[str] = set()
    if roadmap is not None:
        for item in roadmap.items:
            learning.add(item.skill.slug)
            nodes.append(
                {
                    "name": item.skill.name,
                    "slug": item.skill.slug,
                    "category": item.skill.category,
                    "state": "learning",
                }
            )

    for slug, info in demand_summary(db, profile, limit=DEFAULT_GAP_ROLE_LIMIT).items():
        if slug in owned or slug in learning:
            continue
        nodes.append(
            {
                "name": info["name"],
                "slug": slug,
                "category": info["category"],
                "state": "gap",
            }
        )

    return nodes[:40]


def _recent_activity(db: Session, profile: StudentProfile, limit: int = 8) -> list[dict]:
    events: list[dict] = []

    for resume in db.scalars(
        select(Resume)
        .where(Resume.student_id == profile.id)
        .order_by(Resume.uploaded_at.desc())
        .limit(3)
    ):
        events.append(
            {
                "kind": "resume",
                "title": f"Analysed {resume.filename}",
                "detail": f"{resume.skill_count} skills identified",
                "occurred_at": resume.uploaded_at,
            }
        )

    for result in db.scalars(
        select(AssessmentResult)
        .options(selectinload(AssessmentResult.assessment).selectinload(Assessment.skill))
        .where(AssessmentResult.student_id == profile.id)
        .order_by(AssessmentResult.completed_at.desc())
        .limit(4)
    ):
        label = "Passed" if result.passed else "Attempted"
        events.append(
            {
                "kind": "assessment",
                "title": f"{label} {result.assessment.title}",
                "detail": f"Scored {result.score:.0f}%",
                "occurred_at": result.completed_at,
            }
        )

    roadmap = active_roadmap(db, profile)
    if roadmap is not None:
        events.append(
            {
                "kind": "roadmap",
                "title": f"Roadmap: {roadmap.title}",
                "detail": f"{len(roadmap.items)} steps planned",
                "occurred_at": roadmap.updated_at,
            }
        )

    for saved in db.scalars(
        select(SavedJob)
        .options(selectinload(SavedJob.job).selectinload(Job.company))
        .where(SavedJob.student_id == profile.id)
        .order_by(SavedJob.created_at.desc())
        .limit(3)
    ):
        company = saved.job.company.name if saved.job.company else ""
        events.append(
            {
                "kind": "saved_job",
                "title": f"Saved {saved.job.title}",
                "detail": company,
                "occurred_at": saved.created_at,
            }
        )

    def sort_key(event: dict) -> datetime:
        occurred = event["occurred_at"]
        if occurred.tzinfo is None:
            occurred = occurred.replace(tzinfo=UTC)
        return occurred

    events.sort(key=sort_key, reverse=True)
    return events[:limit]


def build_dashboard(db: Session, profile: StudentProfile, email: str) -> dict:
    """Assemble the complete dashboard payload."""
    has_profile, onboarding_steps = profile_completeness(profile)
    resume = latest_resume(db, profile)
    slugs = student_skill_slugs(db, profile)

    progress = overview(db, profile)

    ranked, note = recommend_for_student(db, profile, limit=6, persist=True)

    saved_rows = db.scalars(
        select(SavedJob)
        .options(selectinload(SavedJob.job).selectinload(Job.company))
        .where(SavedJob.student_id == profile.id)
        .order_by(SavedJob.created_at.desc())
        .limit(4)
    ).all()
    saved_ids = {row.job_id for row in saved_rows}

    recommendations = [
        job_card_payload(item, saved_ids, semantic=True) for item in ranked
    ]

    # Gaps are counted across the student's TOP recommendations only, using the
    # shared scope constant so the dashboard, the Skill Gap page and roadmap
    # generation all report the same universe of gaps.
    # Note `limit` caps the number of roles considered, not the number of skills
    # returned, so the metric can legitimately exceed the limit.
    demands = demand_summary(db, profile, limit=DEFAULT_GAP_ROLE_LIMIT)
    total_required = sum(info["jobs_requiring"] for info in demands.values())

    roadmap = active_roadmap(db, profile)
    roadmap_preview = []
    if roadmap is not None:
        roadmap_preview = [
            {
                "id": item.id,
                "skill": item.skill.name,
                "priority": item.priority,
                "status": item.status,
                "estimated_hours": item.estimated_hours,
                "reason": item.reason,
            }
            for item in roadmap.items[:5]
        ]

    # Average compatibility across what was recommended, for the hero metric.
    average_compatibility = (
        round(sum(item.match.compatibility_score for item in ranked) / len(ranked), 2)
        if ranked
        else 0.0
    )

    category_counts: dict[str, int] = {}
    for (category,) in db.execute(
        select(Skill.category)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.student_id == profile.id)
    ):
        category_counts[category] = category_counts.get(category, 0) + 1

    metrics = [
        {
            "label": "Skills identified",
            "value": len(slugs),
            "suffix": "",
            "hint": f"Across {len(category_counts)} categories",
        },
        {
            "label": "Opportunities matched",
            "value": len(ranked),
            "suffix": "",
            "hint": f"Average {average_compatibility:.0f}% alignment",
        },
        {
            "label": "Skill gaps",
            "value": len(demands),
            "suffix": "",
            "hint": "Needed by your top recommended roles"
            if demands
            else "No gaps against your current targets",
        },
        {
            "label": "Roadmap progress",
            "value": progress["roadmap_progress_percentage"],
            "suffix": "%",
            "hint": f"{progress['roadmap_items_completed']} of "
            f"{progress['roadmap_items_total']} steps done"
            if progress["roadmap_items_total"]
            else "No roadmap generated yet",
        },
    ]

    return {
        "greeting_name": _greeting_name(profile, email),
        "has_profile": has_profile,
        "has_resume": resume is not None,
        "has_skills": bool(slugs),
        "skills_identified": len(slugs),
        "skills_by_category": [
            {"category": category, "count": count}
            for category, count in sorted(category_counts.items())
        ],
        "opportunities_matched": len(ranked),
        "skill_gaps": len(demands),
        "roadmap_progress_percentage": progress["roadmap_progress_percentage"],
        "average_compatibility": average_compatibility,
        "metrics": metrics,
        "recommendations": recommendations,
        "skill_constellation": _skill_constellation(db, profile),
        "recent_activity": _recent_activity(db, profile),
        "roadmap_preview": roadmap_preview,
        "saved_jobs": [
            {
                "id": row.job_id,
                "title": row.job.title,
                "company": row.job.company.name if row.job.company else "",
                "company_initials": company_initials(row.job.company) if row.job.company else "?",
                "company_name": company_name_from_card(row.job) if row.job else "",
                "location": row.job.location,
            }
            for row in saved_rows
        ],
        "onboarding_steps": onboarding_steps,
        "recommendation_note": note,
        "roadmap_summary": roadmap_summary(roadmap) if roadmap else None,
        "total_required_signal": total_required,
    }
