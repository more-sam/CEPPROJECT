"""Skill alignment, recommendations, saved opportunities and skill gaps."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile
from app.database.database import get_db
from app.models.match import SavedJob
from app.models.profile import StudentProfile
from app.models.roadmap import Roadmap, RoadmapItem
from app.models.skill import Skill
from app.schemas.common import MessageResponse
from app.schemas.match import (
    AnalyzeRequest,
    MatchResponse,
    RecommendationResponse,
    SavedJobResponse,
    SemanticMatchInfo,
    SkillGapItem,
    SkillGapResponse,
)
from app.services import job_service, recommendation_service, roadmap_service
from app.services.profile_service import student_skill_names, student_skill_slugs
from app.services.serializers import job_list_item

router = APIRouter(tags=["matching"])


def _saved_ids(db: Session, profile: StudentProfile) -> set[int]:
    return set(
        db.scalars(select(SavedJob.job_id).where(SavedJob.student_id == profile.id))
    )


@router.get(
    "/matching/recommendations",
    response_model=RecommendationResponse,
    summary="Recommended opportunities",
)
def recommendations(
    limit: int = Query(default=12, ge=1, le=60),
    min_compatibility: float | None = Query(default=None, ge=0, le=100),
    location: str | None = Query(default=None, max_length=120),
    employment_type: str | None = Query(default=None, max_length=32),
    work_type: str | None = Query(default=None, max_length=32),
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    """Rank opportunities by skill alignment plus preferences and recency."""
    ranked, note = recommendation_service.recommend_for_student(
        db,
        profile,
        limit=limit,
        min_compatibility=min_compatibility,
        persist=True,
        location=location,
        employment_type=employment_type,
        work_type=work_type,
    )

    saved = _saved_ids(db, profile)
    items = [
        job_list_item(item.job, item.match, saved_ids=saved, reasons=item.reasons)
        for item in ranked
    ]

    return RecommendationResponse(items=items, total=len(items), note=note)


@router.post(
    "/matching/analyze",
    response_model=MatchResponse,
    summary="Score the student against one opportunity",
)
def analyze(
    payload: AnalyzeRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> MatchResponse:
    job = job_service.get_job(db, payload.job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="That opportunity was not found."
        )
    return _match_response(db, profile, job)


@router.get(
    "/matching/{job_id}",
    response_model=MatchResponse,
    summary="Alignment detail for one opportunity",
)
def match_for_job(
    job_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> MatchResponse:
    job = job_service.get_job(db, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="That opportunity was not found."
        )
    return _match_response(db, profile, job)


def _match_response(db: Session, profile: StudentProfile, job) -> MatchResponse:  # noqa: ANN001
    match = recommendation_service.refresh_matches_for_job(db, profile, job)
    company = job.company.name if job.company else ""

    return MatchResponse(
        job_id=job.id,
        job_title=job.title,
        company_name=company,
        compatibility_score=match.compatibility_score,
        weighted_score=match.weighted_score,
        semantic_score=match.semantic_score,
        combined_score=match.combined_score,
        total_required=match.total_required,
        matched_skills=match.matched_skills,
        missing_skills=match.missing_skills,
        additional_skills=match.additional_skills,
        semantic_matches=[SemanticMatchInfo(**item) for item in match.semantic_matches],
        skill_breakdown=match.skill_breakdown,
        reasons=recommendation_service.explain_compatibility(match),
    )


@router.get("/skill-gap", response_model=SkillGapResponse, summary="Overall skill gap")
def overall_skill_gap(
    limit: int = Query(
        default=recommendation_service.DEFAULT_GAP_ROLE_LIMIT,
        ge=1,
        le=200,
        description=(
            "How many of the student's best-fit roles to aggregate. The default is "
            "shared with roadmap generation so the skill gap and the roadmap built "
            "from it always agree."
        ),
    ),
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> SkillGapResponse:
    """Aggregate gaps across the student's recommended opportunities."""
    return _build_gap(db, profile, job=None, limit=limit)


@router.get(
    "/skill-gap/{job_id}",
    response_model=SkillGapResponse,
    summary="Skill gap for one opportunity",
)
def skill_gap_for_job(
    job_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> SkillGapResponse:
    job = job_service.get_job(db, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="That opportunity was not found."
        )
    return _build_gap(db, profile, job=job, limit=60)


def _build_gap(db: Session, profile: StudentProfile, job, limit: int) -> SkillGapResponse:  # noqa: ANN001
    """Classify required skills into available / developing / missing."""
    from app.models.progress import Progress
    from app.services.matching_service import requirements_from_job

    if job is not None:
        match = recommendation_service.refresh_matches_for_job(db, profile, job)
        requirements = requirements_from_job(job)
        demand = {
            requirement.slug: {
                "name": requirement.name,
                "category": requirement.category,
                "jobs_requiring": 1,
                "total_jobs": 1,
                "importance": requirement.importance,
            }
            for requirement in requirements
        }
        title, company = job.title, job.company.name if job.company else None
        compatibility = match.compatibility_score
        total_required = len(requirements)
        scope = "Against this single opportunity."
        note = None
    else:
        demand = recommendation_service.demand_summary(db, profile, limit=limit)
        title = company = None
        compatibility = 0.0
        total_required = 0
        # Every bucket records how many roles were aggregated, so the scope can be
        # stated precisely instead of being implied.
        roles_considered = (
            next(iter(demand.values()))["total_jobs"] if demand else 0
        )
        scope = (
            f"Across your {roles_considered} best-fit roles."
            if roles_considered
            else "Across your recommended roles."
        )
        # Three distinct states, and they must not be conflated: gaps exist,
        # the student genuinely covers everything, or there is simply no data
        # yet. Reporting "nothing is missing" to a student with no skills at all
        # would be actively misleading.
        if demand:
            note = None
        elif student_skill_slugs(db, profile):
            note = (
                "You currently cover every required skill in your recommended "
                "opportunities. Nothing is missing."
            )
        else:
            note = (
                "Add skills to your profile so we can show how you compare with "
                "your target opportunities."
            )

    # Progress rows decide whether a matched skill is mastered or still developing.
    progress_rows = db.execute(
        select(Skill.slug, Progress.progress_percentage, Progress.status)
        .join(Progress, Progress.skill_id == Skill.id)
        .where(Progress.student_id == profile.id)
    ).all()
    progress_by_slug = {
        slug: {"percentage": percentage, "status": progress_status}
        for slug, percentage, progress_status in progress_rows
    }

    roadmap_slugs = roadmap_service.missing_skill_slugs(db, profile)
    student_slugs = student_skill_slugs(db, profile)

    available: list[SkillGapItem] = []
    developing: list[SkillGapItem] = []
    missing: list[SkillGapItem] = []

    # Skills the student has, whether or not this target requires them.
    for slug in sorted(student_slugs):
        if job is not None and slug not in {r.slug for r in requirements_from_job(job)}:
            continue
        name, category = _skill_name_category(db, slug)
        if name is None:
            continue
        progress = progress_by_slug.get(slug)
        item = SkillGapItem(
            name=name,
            slug=slug,
            category=category,
            importance="medium",
            why_it_matters="Already on your profile.",
            in_roadmap=slug in roadmap_slugs,
        )
        if progress and progress["status"] != "mastered":
            developing.append(item)
        else:
            available.append(item)

    for slug, info in demand.items():
        if slug in student_slugs:
            continue
        missing.append(
            SkillGapItem(
                name=info["name"],
                slug=slug,
                category=info["category"],
                importance=info.get("importance", "medium"),
                opportunities_requiring=info["jobs_requiring"],
                why_it_matters=(
                    f"Required by {info['jobs_requiring']} of {info['total_jobs']} "
                    "of your target opportunities."
                    if info["total_jobs"] > 1
                    else "Required by this opportunity."
                ),
                in_roadmap=slug in roadmap_slugs,
            )
        )

    missing.sort(key=lambda item: (-item.opportunities_requiring, item.name))

    return SkillGapResponse(
        job_id=job.id if job else None,
        job_title=title,
        company_name=company,
        available=available,
        developing=developing,
        missing=missing,
        compatibility_score=compatibility,
        total_required=total_required,
        scope=scope,
        note=note,
    )


def _skill_name_category(db: Session, slug: str) -> tuple[str | None, str]:
    row = db.execute(
        select(Skill.name, Skill.category).where(Skill.slug == slug)
    ).first()
    return (row[0], row[1]) if row else (None, "")


# ---------------------------------------------------------------------------
# Saved opportunities
# ---------------------------------------------------------------------------
@router.get("/saved-jobs", response_model=list[SavedJobResponse], summary="Saved opportunities")
def list_saved(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[SavedJobResponse]:
    rows = db.scalars(
        select(SavedJob)
        .where(SavedJob.student_id == profile.id)
        .order_by(SavedJob.created_at.desc())
    ).all()

    student_slugs = student_skill_slugs(db, profile)
    names = student_skill_names(db, profile)

    payload: list[SavedJobResponse] = []
    for row in rows:
        job = job_service.get_job(db, row.job_id)
        card = None
        if job is not None:
            from app.services.matching_service import compute_match, requirements_from_job

            match = compute_match(
                student_slugs,
                requirements_from_job(job),
                student_skill_names=names,
            )
            card = job_list_item(job, match, saved_ids={row.job_id})

        payload.append(
            SavedJobResponse(
                id=row.id,
                job_id=row.job_id,
                created_at=row.created_at,
                job=card,
            )
        )
    return payload


@router.post(
    "/saved-jobs/{job_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save an opportunity",
)
def save_job(
    job_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if job_service.get_job(db, job_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="That opportunity was not found."
        )

    existing = db.scalar(
        select(SavedJob).where(
            SavedJob.student_id == profile.id, SavedJob.job_id == job_id
        )
    )
    if existing is None:
        db.add(SavedJob(student_id=profile.id, job_id=job_id))
        db.commit()

    return MessageResponse(message="Opportunity saved.")


@router.delete(
    "/saved-jobs/{job_id}", response_model=MessageResponse, summary="Unsave an opportunity"
)
def unsave_job(
    job_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> MessageResponse:
    existing = db.scalar(
        select(SavedJob).where(
            SavedJob.student_id == profile.id, SavedJob.job_id == job_id
        )
    )
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That opportunity is not in your saved list.",
        )
    db.delete(existing)
    db.commit()
    return MessageResponse(message="Opportunity removed from saved list.")


def _roadmap_item_counts(db: Session, profile: StudentProfile) -> int:
    return len(
        db.scalars(
            select(RoadmapItem.id)
            .join(Roadmap, RoadmapItem.roadmap_id == Roadmap.id)
            .where(Roadmap.student_id == profile.id)
        ).all()
    )
