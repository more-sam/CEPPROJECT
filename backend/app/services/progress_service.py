"""Skill progress tracking.

Progress is only ever advanced by real evidence:
- a roadmap step being moved to in-progress or completed, or
- an assessment attempt scoring above the pass mark.
Nothing here assigns a cosmetic or random percentage.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.assessment import AssessmentResult
from app.models.enums import RoadmapItemStatus
from app.models.profile import StudentProfile
from app.models.progress import Progress
from app.models.roadmap import Roadmap, RoadmapItem
from app.models.skill import Skill, StudentSkill

# Progress credited for each roadmap state.
ROADMAP_PROGRESS = {
    RoadmapItemStatus.NOT_STARTED.value: 0,
    RoadmapItemStatus.IN_PROGRESS.value: 50,
    RoadmapItemStatus.COMPLETED.value: 100,
}

MASTERED_THRESHOLD = 80
DEVELOPING_THRESHOLD = 1


def status_for_percentage(percentage: int) -> str:
    if percentage >= MASTERED_THRESHOLD:
        return "mastered"
    if percentage >= DEVELOPING_THRESHOLD:
        return "developing"
    return "not_started"


def _get_or_create(db: Session, profile: StudentProfile, skill_id: int) -> Progress:
    progress = db.scalar(
        select(Progress).where(
            Progress.student_id == profile.id, Progress.skill_id == skill_id
        )
    )
    if progress is None:
        progress = Progress(student_id=profile.id, skill_id=skill_id)
        db.add(progress)
        db.flush()
    return progress


def sync_from_roadmap_item(
    db: Session,
    profile: StudentProfile,
    item: RoadmapItem,
) -> Progress:
    """Reflect a roadmap step's status into that skill's progress."""
    progress = _get_or_create(db, profile, item.skill_id)
    target = ROADMAP_PROGRESS.get(item.status, 0)

    # Never lower progress that an assessment already earned.
    progress.progress_percentage = max(progress.progress_percentage, target)
    progress.status = status_for_percentage(progress.progress_percentage)
    progress.updated_at = datetime.now(UTC)
    db.add(progress)
    return progress


def record_assessment(
    db: Session,
    profile: StudentProfile,
    skill_id: int,
    score: float,
    passed: bool,
) -> Progress:
    """Record an assessment attempt against a skill's progress.

    A passed attempt raises progress to at least the score achieved, and adds the
    skill to the student's profile: passing a test is genuine evidence.
    """
    progress = _get_or_create(db, profile, skill_id)

    progress.assessments_taken += 1
    if progress.best_assessment_score is None or score > progress.best_assessment_score:
        progress.best_assessment_score = round(score, 2)

    if passed:
        progress.progress_percentage = max(progress.progress_percentage, int(score))
        _ensure_student_skill(db, profile, skill_id)

    progress.status = status_for_percentage(progress.progress_percentage)
    progress.updated_at = datetime.now(UTC)
    db.add(progress)
    return progress


def _ensure_student_skill(db: Session, profile: StudentProfile, skill_id: int) -> None:
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
                confidence=0.9,
                source="assessment",
            )
        )


def list_progress(db: Session, profile: StudentProfile) -> list[Progress]:
    return list(
        db.scalars(
            select(Progress)
            .options(selectinload(Progress.skill))
            .where(Progress.student_id == profile.id)
            .join(Skill, Progress.skill_id == Skill.id)
            .order_by(Progress.progress_percentage.desc(), Skill.name)
        )
    )


def set_progress(
    db: Session,
    profile: StudentProfile,
    skill_id: int,
    percentage: int,
) -> Progress:
    """Explicitly set a skill's progress (the Progress page's manual control)."""
    progress = _get_or_create(db, profile, skill_id)
    progress.progress_percentage = max(0, min(100, percentage))
    progress.status = status_for_percentage(progress.progress_percentage)
    progress.updated_at = datetime.now(UTC)
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


def overview(db: Session, profile: StudentProfile) -> dict:
    """Aggregate everything the Progress page and its charts need."""
    items = list_progress(db, profile)

    counts = {"mastered": 0, "developing": 0, "not_started": 0}
    for item in items:
        counts[item.status] = counts.get(item.status, 0) + 1

    roadmap_items = list(
        db.scalars(
            select(RoadmapItem)
            .options(selectinload(RoadmapItem.skill))
            .join(Roadmap, RoadmapItem.roadmap_id == Roadmap.id)
            .where(Roadmap.student_id == profile.id)
        )
    )
    total_items = len(roadmap_items)
    completed_items = sum(
        1 for item in roadmap_items if item.status == RoadmapItemStatus.COMPLETED.value
    )
    total_hours = sum(item.estimated_hours for item in roadmap_items)
    completed_hours = sum(
        item.estimated_hours
        for item in roadmap_items
        if item.status == RoadmapItemStatus.COMPLETED.value
    )

    results = list(
        db.scalars(
            select(AssessmentResult)
            .where(AssessmentResult.student_id == profile.id)
            .order_by(AssessmentResult.completed_at.asc())
        )
    )
    passed = sum(1 for result in results if result.passed)

    # Chart series: assessment score over time.
    score_history = [
        {
            "date": result.completed_at.date().isoformat(),
            "score": round(result.score, 1),
            "label": f"Attempt {index + 1}",
        }
        for index, result in enumerate(results)
    ]

    # Chart series: how many of the student's skills sit in each category.
    category_counts: dict[str, dict] = {}
    for item in items:
        bucket = category_counts.setdefault(
            item.skill.category,
            {"category": item.skill.category, "mastered": 0, "developing": 0, "not_started": 0},
        )
        bucket[item.status] = bucket.get(item.status, 0) + 1

    return {
        "total_skills": len(items),
        "mastered": counts.get("mastered", 0),
        "developing": counts.get("developing", 0),
        "not_started": counts.get("not_started", 0),
        "roadmap_items_total": total_items,
        "roadmap_items_completed": completed_items,
        "roadmap_progress_percentage": (
            round(completed_items / total_items * 100, 2) if total_items else 0.0
        ),
        "assessments_taken": len(results),
        "assessments_passed": passed,
        "average_assessment_score": (
            round(sum(result.score for result in results) / len(results), 2)
            if results
            else 0.0
        ),
        "total_learning_hours": total_hours,
        "completed_learning_hours": completed_hours,
        "category_breakdown": sorted(
            category_counts.values(), key=lambda entry: entry["category"]
        ),
        "score_history": score_history,
    }


def skill_mastered_slugs(db: Session, profile: StudentProfile) -> set[str]:
    rows = db.execute(
        select(Skill.slug)
        .join(Progress, Progress.skill_id == Skill.id)
        .where(Progress.student_id == profile.id, Progress.status == "mastered")
    )
    return {slug for (slug,) in rows}
