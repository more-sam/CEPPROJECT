"""Company directory, company details and a company's own opportunities.

Public where it can be: an anonymous visitor browsing the opportunities page can
open a company and see its real open listings. Compatibility scores are simply
omitted without a signed-in student rather than faked.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile, get_optional_profile
from app.database.database import get_db
from app.models.enums import JobStatus
from app.models.match import SavedJob
from app.models.profile import StudentProfile
from app.schemas.common import PageMeta, PaginatedResponse
from app.schemas.job import CompanyDetail, CompanyDirectoryResponse, JobListItem
from app.services import company_service, job_service
from app.services.profile_service import student_skill_names, student_skill_slugs
from app.services.serializers import job_list_item

router = APIRouter(tags=["companies"])

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


@router.get(
    "/companies",
    response_model=CompanyDirectoryResponse,
    summary="Company directory",
)
def list_companies(
    only_open: bool = Query(
        default=False,
        description="Only companies with at least one listing stored as open",
    ),
    q: str | None = Query(default=None, max_length=120, description="Company name search"),
    db: Session = Depends(get_db),
) -> CompanyDirectoryResponse:
    """Every company that has at least one opportunity, with role counts."""
    items = company_service.list_companies(
        db, only_with_open_roles=only_open, search=q
    )
    return CompanyDirectoryResponse(items=items, total=len(items))


@router.get(
    "/companies/matching",
    response_model=CompanyDirectoryResponse,
    summary="Companies whose roles match the signed-in student",
)
def companies_matching(
    min_compatibility: float | None = Query(default=None, ge=0, le=100),
    only_open: bool = Query(default=False),
    limit: int = Query(default=24, ge=1, le=60),
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> CompanyDirectoryResponse:
    """Companies with at least one listing aligned to the student's skills.

    Ordered by each company's best alignment. A company qualifies only on real
    skill overlap - never on the mere existence of a listing.
    """
    items = company_service.companies_matching_student(
        db,
        profile,
        min_compatibility=min_compatibility,
        only_with_open_roles=only_open,
        limit=limit,
    )
    return CompanyDirectoryResponse(items=items, total=len(items))


@router.get(
    "/companies/{company_id}",
    response_model=CompanyDetail,
    summary="Company details",
)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
) -> CompanyDetail:
    """One company plus its open/total role counts."""
    detail = company_service.company_detail(db, company_id)
    if detail is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That company was not found.",
        )
    return detail


def _company_jobs(
    db: Session,
    company_id: int,
    profile: StudentProfile | None,
    *,
    status_filter: str | None,
    page: int,
    page_size: int,
    sort: str,
) -> PaginatedResponse:
    """Shared paging path for a company's listings."""
    if job_service.get_company(db, company_id) is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="That company was not found.",
        )

    slugs, names, saved_ids = _student_context(db, profile)
    items, total = job_service.list_jobs(
        db,
        student_slugs=slugs,
        student_skill_names=names,
        sort=sort,
        page=page,
        page_size=page_size,
        company_id=company_id,
        status=status_filter,
    )

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


@router.get(
    "/companies/{company_id}/open-jobs",
    response_model=PaginatedResponse,
    summary="A company's open opportunities",
)
def company_open_jobs(
    company_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(
        default=job_service.DEFAULT_PAGE_SIZE, ge=1, le=job_service.MAX_PAGE_SIZE
    ),
    sort: str = Query(default="compatibility", pattern="^(newest|compatibility|relevance|title)$"),
    profile: StudentProfile | None = Depends(get_optional_profile),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Only this company's listings whose stored `status` is `open`."""
    return _company_jobs(
        db,
        company_id,
        profile,
        status_filter=JobStatus.OPEN.value,
        page=page,
        page_size=page_size,
        sort=sort,
    )


@router.get(
    "/companies/{company_id}/jobs",
    response_model=PaginatedResponse,
    summary="All of a company's opportunities",
)
def company_jobs(
    company_id: int,
    status: str | None = Query(default=None, pattern=STATUS_PATTERN),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(
        default=job_service.DEFAULT_PAGE_SIZE, ge=1, le=job_service.MAX_PAGE_SIZE
    ),
    sort: str = Query(default="newest", pattern="^(newest|compatibility|relevance|title)$"),
    profile: StudentProfile | None = Depends(get_optional_profile),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Every listing for one company, including closed and expired ones."""
    return _company_jobs(
        db,
        company_id,
        profile,
        status_filter=status,
        page=page,
        page_size=page_size,
        sort=sort,
    )