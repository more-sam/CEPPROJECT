"""Opportunity listing, detail, similar roles and the skill catalogue.

These endpoints work for anonymous visitors so the landing page's "Explore
Opportunities" link is real. Compatibility scores are simply omitted when there
is no signed-in student, rather than being faked.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.taxonomy import get_taxonomy
from app.core.dependencies import get_optional_profile
from app.database.database import get_db
from app.models.enums import JobStatus
from app.models.job import Job
from app.models.match import SavedJob
from app.models.profile import StudentProfile
from app.models.skill import Skill
from app.schemas.common import PageMeta, PaginatedResponse
from app.schemas.job import JobDetail, JobFilterOptions, JobListItem
from app.schemas.profile import SkillCatalogueItem
from app.services import job_service, recommendation_service
from app.services.matching_service import compute_match, requirements_from_job
from app.services.profile_service import student_skill_names, student_skill_slugs
from app.services.serializers import job_detail, job_list_item

router = APIRouter(tags=["jobs"])

# `status` is constrained to the four stored states so a typo becomes a 422
# rather than a silently empty result set.
StatusFilter = str

STATUS_PATTERN = "^(open|closed|expired|unknown)$"


def _student_context(
    db: Session,
    profile: StudentProfile | None,
) -> tuple[set[str], dict[str, str], set[int]]:
    """Student skills, display names and saved ids (all empty when anonymous)."""
    if profile is None:
        return set(), {}, set()
    slugs = student_skill_slugs(db, profile)
    names = student_skill_names(db, profile)
    saved = set(
        db.scalars(select(SavedJob.job_id).where(SavedJob.student_id == profile.id))
    )
    return slugs, names, saved


@router.get("/jobs", response_model=PaginatedResponse, summary="List opportunities")
def list_jobs(
    q: str | None = Query(default=None, max_length=120, description="Free-text search"),
    location: str | None = Query(default=None, max_length=120),
    employment_type: str | None = Query(default=None, max_length=32),
    work_type: str | None = Query(default=None, max_length=32),
    experience_level: str | None = Query(default=None, max_length=32),
    skill: str | None = Query(default=None, max_length=120, description="Skill slug"),
    status: StatusFilter | None = Query(
        default=None,
        pattern=STATUS_PATTERN,
        description="Application status: open | closed | expired | unknown",
    ),
    company_id: int | None = Query(default=None, ge=1),
    min_compatibility: float | None = Query(default=None, ge=0, le=100),
    sort: str = Query(default="newest", pattern="^(newest|compatibility|relevance|title)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(
        default=job_service.DEFAULT_PAGE_SIZE, ge=1, le=job_service.MAX_PAGE_SIZE
    ),
    profile: StudentProfile | None = Depends(get_optional_profile),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Paginated opportunities, scored against the student's skills when signed in."""
    slugs, names, saved_ids = _student_context(db, profile)

    items, total = job_service.list_jobs(
        db,
        student_slugs=slugs,
        student_skill_names=names,
        sort=sort,
        page=page,
        page_size=page_size,
        search=q,
        location=location,
        employment_type=employment_type,
        work_type=work_type,
        experience_level=experience_level,
        skill_slug=skill,
        status=status,
        company_id=company_id,
    )

    if min_compatibility is not None:
        items = [
            item
            for item in items
            if item.match and item.match.compatibility_score >= min_compatibility
        ]

    total_pages = (total + page_size - 1) // page_size if page_size else 0

    return PaginatedResponse(
        items=[
            job_list_item(item.job, item.match, saved_ids=saved_ids).model_dump()
            for item in items
        ],
        meta=PageMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        ),
    )


@router.get("/jobs/filters", response_model=JobFilterOptions, summary="Available filters")
def filter_options(db: Session = Depends(get_db)) -> JobFilterOptions:
    """Distinct values present in the data, so the UI never offers dead filters."""
    return job_service.filter_options(db)


@router.get(
    "/jobs/open",
    response_model=PaginatedResponse,
    summary="Open opportunities",
)
def list_open_jobs(
    q: str | None = Query(default=None, max_length=120),
    location: str | None = Query(default=None, max_length=120),
    employment_type: str | None = Query(default=None, max_length=32),
    work_type: str | None = Query(default=None, max_length=32),
    experience_level: str | None = Query(default=None, max_length=32),
    skill: str | None = Query(default=None, max_length=120),
    company_id: int | None = Query(default=None, ge=1),
    min_compatibility: float | None = Query(default=None, ge=0, le=100),
    sort: str = Query(default="compatibility", pattern="^(newest|compatibility|relevance|title)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(
        default=job_service.DEFAULT_PAGE_SIZE, ge=1, le=job_service.MAX_PAGE_SIZE
    ),
    profile: StudentProfile | None = Depends(get_optional_profile),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Only opportunities whose stored `status` is `open`.

    This is a filter over stored data, not a guess: a row is included only when
    its own status says `open`. `unknown` and `closed` are excluded, so the
    "Open Opportunities" surface can never imply a listing is live when the
    database does not say so.
    """
    slugs, names, saved_ids = _student_context(db, profile)

    items, total = job_service.list_jobs(
        db,
        student_slugs=slugs,
        student_skill_names=names,
        sort=sort,
        page=page,
        page_size=page_size,
        search=q,
        location=location,
        employment_type=employment_type,
        work_type=work_type,
        experience_level=experience_level,
        skill_slug=skill,
        status=JobStatus.OPEN.value,
        company_id=company_id,
    )

    if min_compatibility is not None:
        items = [
            item
            for item in items
            if item.match and item.match.compatibility_score >= min_compatibility
        ]

    total_pages = (total + page_size - 1) // page_size if page_size else 0

    return PaginatedResponse(
        items=[
            job_list_item(item.job, item.match, saved_ids=saved_ids).model_dump()
            for item in items
        ],
        meta=PageMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        ),
    )


@router.get("/jobs/{job_id}", response_model=JobDetail, summary="Opportunity detail")
def get_job(
    job_id: int,
    profile: StudentProfile | None = Depends(get_optional_profile),
    db: Session = Depends(get_db),
) -> JobDetail:
    job = job_service.get_job(db, job_id)
    if job is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="That opportunity was not found."
        )

    slugs, names, saved_ids = _student_context(db, profile)
    if profile is not None:
        match = recommendation_service.refresh_matches_for_job(db, profile, job)
    else:
        match = None

    reasons = recommendation_service.explain_compatibility(match) if match else []
    return job_detail(job, match, saved_ids=saved_ids, reasons=reasons)


@router.get(
    "/jobs/{job_id}/similar", response_model=list[JobListItem], summary="Similar roles"
)
def similar_jobs(
    job_id: int,
    limit: int = Query(default=4, ge=1, le=10),
    profile: StudentProfile | None = Depends(get_optional_profile),
    db: Session = Depends(get_db),
) -> list[JobListItem]:
    """Other opportunities that share required skills with this one."""
    job = job_service.get_job(db, job_id)
    if job is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="That opportunity was not found."
        )

    target_slugs = {link.skill.slug for link in job.job_skills if link.skill}
    if not target_slugs:
        return []

    # Rank candidates by how many required skills they share, in SQL rather than
    # by loading every job in Python.
    from sqlalchemy import func

    from app.models.job import JobSkill

    overlap = (
        select(JobSkill.job_id, func.count(JobSkill.id).label("shared"))
        .join(Skill, JobSkill.skill_id == Skill.id)
        .where(Skill.slug.in_(target_slugs), JobSkill.job_id != job.id)
        .group_by(JobSkill.job_id)
        .subquery()
    )
    candidate_ids = [
        job_id_row
        for (job_id_row,) in db.execute(
            select(overlap.c.job_id)
            .order_by(overlap.c.shared.desc(), overlap.c.job_id)
            .limit(limit)
        )
    ]

    if not candidate_ids:
        return []

    slugs, names, saved_ids = _student_context(db, profile)

    payload: list[JobListItem] = []
    for candidate in job_service.get_jobs_by_ids(db, candidate_ids):
        match = (
            compute_match(slugs, requirements_from_job(candidate), student_skill_names=names)
            if slugs
            else None
        )
        payload.append(job_list_item(candidate, match, saved_ids=saved_ids))

    return payload


# ---------------------------------------------------------------------------
# Skill catalogue
# ---------------------------------------------------------------------------
@router.get("/skills", response_model=list[SkillCatalogueItem], summary="Skill catalogue")
def list_skills(
    category: str | None = Query(default=None, max_length=60),
    db: Session = Depends(get_db),
) -> list[SkillCatalogueItem]:
    """The controlled skill taxonomy, for pickers and autocomplete."""
    query = select(Skill).order_by(Skill.category, Skill.name)
    if category:
        query = query.where(Skill.category == category)
    return [SkillCatalogueItem.model_validate(row) for row in db.scalars(query).all()]


@router.get("/skills/categories", response_model=list[str], summary="Skill categories")
def list_categories() -> list[str]:
    return list(get_taxonomy().categories)
