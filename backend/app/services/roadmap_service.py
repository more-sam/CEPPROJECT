"""Roadmap generation and item status management."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.ai.roadmap_generator import (
    SkillDemand,
    generate_roadmap_items,
    roadmap_description,
    roadmap_title,
)
from app.ai.taxonomy import get_taxonomy
from app.core.config import settings
from app.models.enums import RoadmapItemStatus, SkillSource
from app.models.job import Job, JobSkill
from app.models.profile import StudentProfile
from app.models.roadmap import Roadmap, RoadmapItem
from app.models.skill import Skill
from app.services.profile_service import get_or_create_skill, student_skill_slugs
from app.services.progress_service import sync_from_roadmap_item
from app.services.recommendation_service import (
    DEFAULT_GAP_ROLE_LIMIT,
    demand_summary,
)


class RoadmapError(Exception):
    """Roadmap generation problem with a student-safe message."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _demands_for(
    db: Session,
    profile: StudentProfile,
    target_job: Job | None,
) -> tuple[dict[str, SkillDemand], str | None]:
    """Build demand signals from either one target job or the recommended set."""
    taxonomy = get_taxonomy()
    student_slugs = student_skill_slugs(db, profile)

    if target_job is not None:
        from app.services.matching_service import requirements_from_job

        requirements = requirements_from_job(target_job)
        total = 1
        demands: dict[str, SkillDemand] = {}
        for requirement in requirements:
            if requirement.slug in student_slugs:
                continue
            demands[requirement.slug] = SkillDemand(
                slug=requirement.slug,
                name=requirement.name,
                category=requirement.category,
                jobs_requiring=1,
                total_jobs=total,
                highest_importance=requirement.importance,
            )
        return demands, target_job.title

    # Same scope as the Skill Gap page, so the roadmap is exactly "the gaps you
    # were just shown" rather than a much larger set.
    raw = demand_summary(db, profile, limit=DEFAULT_GAP_ROLE_LIMIT)
    demands = {
        slug: SkillDemand(
            slug=slug,
            name=info["name"],
            category=info["category"],
            jobs_requiring=info["jobs_requiring"],
            total_jobs=info["total_jobs"],
            highest_importance=info["highest_importance"],
        )
        for slug, info in raw.items()
        # A skill already known cannot be a gap.
        if slug not in student_slugs and slug in taxonomy.by_slug
    }
    return demands, None


def generate_roadmap(
    db: Session,
    profile: StudentProfile,
    *,
    job_id: int | None = None,
    title: str | None = None,
    replace_existing: bool = True,
) -> Roadmap:
    """Create a personalised roadmap for the student's current gaps."""
    target_job: Job | None = None
    if job_id is not None:
        target_job = db.scalar(
            select(Job)
            .options(
                selectinload(Job.company),
                selectinload(Job.job_skills).selectinload(JobSkill.skill),
            )
            .where(Job.id == job_id)
        )
        if target_job is None:
            raise RoadmapError("That opportunity could not be found.")

    demands, target_role = _demands_for(db, profile, target_job)

    if not demands:
        # Distinguish "you are already covered" from "we know nothing about you
        # yet". Telling a student with no skills that they already cover every
        # requirement would be plainly wrong.
        if student_skill_slugs(db, profile):
            raise RoadmapError(
                "You already cover every required skill for this target, so there "
                "is nothing to add to a roadmap."
            )
        raise RoadmapError(
            "Add some skills to your profile first - then we can build a roadmap "
            "from what your target opportunities are missing."
        )

    plans = generate_roadmap_items(demands)
    if not plans:
        raise RoadmapError("No missing skills were found to build a roadmap from.")

    source = "job" if target_job is not None else "roadmap"
    if replace_existing:
        # One active roadmap of each kind keeps the UI unambiguous.
        existing = db.scalars(
            select(Roadmap).where(
                Roadmap.student_id == profile.id,
                Roadmap.source == source,
            )
        ).all()
        for roadmap in existing:
            db.delete(roadmap)
        db.flush()

    roadmap = Roadmap(
        student_id=profile.id,
        title=title or roadmap_title(target_role, len(plans)),
        description=roadmap_description(plans, target_role),
        source=source,
        target_job_id=target_job.id if target_job else None,
    )
    db.add(roadmap)
    db.flush()

    for plan in plans:
        skill = get_or_create_skill(db, plan.skill.name)
        db.add(
            RoadmapItem(
                roadmap_id=roadmap.id,
                skill_id=skill.id,
                order_index=plan.order_index,
                priority=plan.priority,
                status=RoadmapItemStatus.NOT_STARTED.value,
                estimated_hours=plan.estimated_hours,
                reason=plan.reason,
                prerequisites=plan.prerequisites,
                resources=plan.resources,
            )
        )

    db.commit()
    db.refresh(roadmap)
    return roadmap


def list_roadmaps(db: Session, profile: StudentProfile) -> list[Roadmap]:
    return list(
        db.scalars(
            select(Roadmap)
            .options(
                selectinload(Roadmap.items).selectinload(RoadmapItem.skill),
            )
            .where(Roadmap.student_id == profile.id)
            .order_by(Roadmap.created_at.desc())
        )
    )


def get_roadmap(db: Session, profile: StudentProfile, roadmap_id: int) -> Roadmap | None:
    roadmap = db.scalar(
        select(Roadmap)
        .options(selectinload(Roadmap.items).selectinload(RoadmapItem.skill))
        .where(Roadmap.id == roadmap_id, Roadmap.student_id == profile.id)
    )
    return roadmap


def active_roadmap(db: Session, profile: StudentProfile) -> Roadmap | None:
    """The most recent general roadmap (not tied to a single opportunity)."""
    return db.scalar(
        select(Roadmap)
        .options(selectinload(Roadmap.items).selectinload(RoadmapItem.skill))
        .where(Roadmap.student_id == profile.id, Roadmap.source == "roadmap")
        .order_by(Roadmap.created_at.desc())
        .limit(1)
    )


def update_item_status(
    db: Session,
    profile: StudentProfile,
    item_id: int,
    new_status: RoadmapItemStatus,
) -> tuple[RoadmapItem, int]:
    """Change a step's status and propagate the result into skill progress.

    Returns (item, progress_percentage) so the API can report the new state.
    """
    item = db.scalar(
        select(RoadmapItem)
        .options(selectinload(RoadmapItem.skill), selectinload(RoadmapItem.roadmap))
        .where(RoadmapItem.id == item_id)
    )
    if item is None or item.roadmap.student_id != profile.id:
        raise RoadmapError("That roadmap step could not be found.")

    item.status = new_status.value
    db.add(item)

    progress = sync_from_roadmap_item(db, profile, item)

    # Completing a roadmap step is evidence of learning, so the skill joins the
    # student's profile. This is a deliberate, auditable promotion - not a guess.
    if new_status is RoadmapItemStatus.COMPLETED:
        _ensure_student_skill(db, profile, item.skill_id)

    db.commit()
    db.refresh(item)
    return item, progress.progress_percentage if progress else 0


def _ensure_student_skill(db: Session, profile: StudentProfile, skill_id: int) -> None:
    from app.models.skill import StudentSkill

    existing = db.scalar(
        select(StudentSkill).where(
            StudentSkill.student_id == profile.id,
            StudentSkill.skill_id == skill_id,
        )
    )
    if existing is None:
        db.add(
            StudentSkill(
                student_id=profile.id,
                skill_id=skill_id,
                proficiency="unknown",
                confidence=0.8,
                source=SkillSource.ROADMAP.value,
            )
        )


def roadmap_summary(roadmap: Roadmap) -> dict:
    """Aggregate counts used by the roadmap UI and the dashboard."""
    items = roadmap.items
    total = len(items)
    completed = sum(1 for item in items if item.status == RoadmapItemStatus.COMPLETED.value)
    in_progress = sum(1 for item in items if item.status == RoadmapItemStatus.IN_PROGRESS.value)
    total_hours = sum(item.estimated_hours for item in items)
    completed_hours = sum(
        item.estimated_hours for item in items if item.status == RoadmapItemStatus.COMPLETED.value
    )

    return {
        "total_items": total,
        "completed_items": completed,
        "in_progress_items": in_progress,
        "total_hours": total_hours,
        "completed_hours": completed_hours,
        "progress_percentage": round(completed / total * 100, 2) if total else 0.0,
    }


def missing_skill_slugs(db: Session, profile: StudentProfile) -> set[str]:
    """Slugs currently sitting on the student's roadmap."""
    rows = db.execute(
        select(Skill.slug)
        .join(RoadmapItem, RoadmapItem.skill_id == Skill.id)
        .join(Roadmap, RoadmapItem.roadmap_id == Roadmap.id)
        .where(Roadmap.student_id == profile.id)
    )
    return {slug for (slug,) in rows}


def clear_roadmaps(db: Session, profile: StudentProfile) -> int:
    deleted = db.execute(delete(Roadmap).where(Roadmap.student_id == profile.id))
    db.commit()
    return deleted.rowcount or 0


def semantic_threshold() -> float:
    return settings.semantic_threshold
