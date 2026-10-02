"""Profile and student-skill operations."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.ai.taxonomy import get_taxonomy, slugify
from app.models.enums import SkillSource
from app.models.profile import StudentProfile
from app.models.skill import Skill, StudentSkill
from app.schemas.profile import ProfileUpdateRequest, StudentSkillCreateRequest


class ProfileError(Exception):
    """A skill could not be resolved or stored."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def update_profile(
    db: Session,
    profile: StudentProfile,
    payload: ProfileUpdateRequest,
) -> StudentProfile:
    """Apply only the fields the client actually sent."""
    provided = payload.model_dump(exclude_unset=True)

    for field, value in provided.items():
        if field == "work_type" and value is not None:
            value = getattr(value, "value", value)
        setattr(profile, field, value)

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def list_student_skills(db: Session, profile: StudentProfile) -> list[StudentSkill]:
    """All skills on the profile, ordered by category then name."""
    return list(
        db.scalars(
            select(StudentSkill)
            .options(selectinload(StudentSkill.skill))
            .where(StudentSkill.student_id == profile.id)
            .join(Skill, StudentSkill.skill_id == Skill.id)
            .order_by(Skill.category, Skill.name)
        )
    )


def get_or_create_skill(db: Session, name: str) -> Skill:
    """Resolve a skill name against the taxonomy, creating a row if needed.

    The taxonomy is authoritative. An unrecognised name still gets a row (under
    "Other") rather than being silently dropped, so a student is never blocked
    from recording something the taxonomy has not heard of yet.
    """
    taxonomy = get_taxonomy()
    lookup = name.strip()
    if not lookup:
        raise ProfileError("Skill name cannot be empty.")

    known = taxonomy.find(lookup)
    if known is not None:
        existing = db.scalar(select(Skill).where(Skill.slug == known.slug))
        if existing is not None:
            return existing
        skill = Skill(
            name=known.name,
            slug=known.slug,
            category=known.category,
            description=known.description,
            aliases=list(known.aliases),
        )
        db.add(skill)
        db.flush()
        return skill

    slug = slugify(lookup)
    existing = db.scalar(select(Skill).where(Skill.slug == slug))
    if existing is not None:
        return existing

    skill = Skill(name=lookup, slug=slug, category="Other", description=None, aliases=[])
    db.add(skill)
    db.flush()
    return skill


def add_student_skill(
    db: Session,
    profile: StudentProfile,
    payload: StudentSkillCreateRequest,
    source: str = SkillSource.MANUAL.value,
) -> StudentSkill:
    """Attach a skill to the profile. Re-adding an existing skill updates it."""
    skill = get_or_create_skill(db, payload.skill_name)

    existing = db.scalar(
        select(StudentSkill).where(
            StudentSkill.student_id == profile.id,
            StudentSkill.skill_id == skill.id,
        )
    )
    if existing is not None:
        existing.proficiency = payload.proficiency.value
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    student_skill = StudentSkill(
        student_id=profile.id,
        skill_id=skill.id,
        proficiency=payload.proficiency.value,
        # Manually added skills are certain, unlike inferred extraction.
        confidence=1.0 if source == SkillSource.MANUAL.value else 0.6,
        source=source,
    )
    db.add(student_skill)
    db.commit()
    db.refresh(student_skill)
    return student_skill


def update_student_skill(
    db: Session,
    profile: StudentProfile,
    student_skill_id: int,
    proficiency: str,
    source: str,
) -> StudentSkill | None:
    student_skill = db.get(StudentSkill, student_skill_id)
    if student_skill is None or student_skill.student_id != profile.id:
        return None
    student_skill.proficiency = proficiency
    student_skill.source = source
    db.add(student_skill)
    db.commit()
    db.refresh(student_skill)
    return student_skill


def remove_student_skill(
    db: Session,
    profile: StudentProfile,
    student_skill_id: int,
) -> bool:
    student_skill = db.get(StudentSkill, student_skill_id)
    if student_skill is None or student_skill.student_id != profile.id:
        return False
    db.delete(student_skill)
    db.commit()
    return True


def replace_student_skills(
    db: Session,
    profile: StudentProfile,
    skills: list[StudentSkillCreateRequest],
    source: str = SkillSource.MANUAL.value,
) -> list[StudentSkill]:
    """Replace the entire skill set in one transaction.

    Used by the profile editor so removing several skills is a single operation
    rather than a flurry of individual deletes.
    """
    db.execute(delete(StudentSkill).where(StudentSkill.student_id == profile.id))
    db.flush()

    for payload in skills:
        skill = get_or_create_skill(db, payload.skill_name)
        db.add(
            StudentSkill(
                student_id=profile.id,
                skill_id=skill.id,
                proficiency=payload.proficiency.value,
                confidence=1.0 if source == SkillSource.MANUAL.value else 0.6,
                source=source,
            )
        )

    db.commit()
    return list_student_skills(db, profile)


def student_skill_slugs(db: Session, profile: StudentProfile) -> set[str]:
    """Canonical slugs of the student's skills - the input to matching."""
    rows = db.execute(
        select(Skill.slug)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.student_id == profile.id)
    )
    return {slug for (slug,) in rows}


def student_skill_names(db: Session, profile: StudentProfile) -> dict[str, str]:
    """slug -> display name, used in match explanations."""
    rows = db.execute(
        select(Skill.slug, Skill.name)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.student_id == profile.id)
    )
    return {slug: name for slug, name in rows}


def profile_completeness(profile: StudentProfile) -> tuple[bool, list[dict]]:
    """Which onboarding fields are still missing, for the guided empty state."""
    steps = [
        {"key": "full_name", "label": "Add your name", "done": bool(profile.full_name)},
        {"key": "education", "label": "Add your college and degree", "done": bool(profile.college and profile.degree)},
        {"key": "preferred_roles", "label": "Choose preferred roles", "done": bool(profile.preferred_roles)},
        {"key": "preferred_locations", "label": "Choose preferred locations", "done": bool(profile.preferred_locations)},
    ]
    return all(step["done"] for step in steps), steps
