"""Company-level reads: the directory, company details, and a company's roles.

Kept separate from `job_service` because these queries are grouped by company
rather than by listing. The matching engine is reused unchanged - a company is
"matching" exactly when at least one of its listings aligns with the student's
stored skills, so no second scoring rule exists to drift out of sync.
"""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.company import Company
from app.models.enums import JobStatus
from app.models.profile import StudentProfile
from app.schemas.job import CompanyDetail, CompanyListItem
from app.services import job_service
from app.services.matching_service import compute_match, requirements_from_job
from app.services.profile_service import student_skill_names, student_skill_slugs
from app.services.serializers import company_list_item


def _match_settings() -> tuple[bool, float]:
    """Configured matching behaviour, read from settings rather than hardcoded."""
    return settings.enable_semantic_matching, settings.semantic_threshold


def company_detail(db: Session, company_id: int) -> CompanyDetail | None:
    """One company plus its open/total role counts."""
    company = job_service.get_company(db, company_id)
    if company is None:
        return None
    open_roles, total_roles = job_service.company_role_counts(db, company_id)
    return CompanyDetail(
        id=company.id,
        name=company.name,
        description=company.description,
        logo_url=company.logo_url,
        website_url=company.website_url,
        location=company.location,
        industry=company.industry,
        initials=company.initials,
        open_roles=open_roles,
        total_roles=total_roles,
    )


def list_companies(
    db: Session,
    *,
    only_with_open_roles: bool = False,
    search: str | None = None,
) -> list[CompanyListItem]:
    """Companies with at least one listing, ordered by name.

    Counts come from one grouped query, so this stays a single round trip.
    """
    counts = job_service.company_role_counts_bulk(db)
    rows = job_service.list_companies(db, only_open=only_with_open_roles, search=search)
    return [
        company_list_item(row, counts.get(row.id, (0, 0)))
        for row in rows
        if counts.get(row.id, (0, 0))[1] > 0
    ]


def companies_matching_student(
    db: Session,
    profile: StudentProfile,
    *,
    status: str | None = None,
    min_compatibility: float | None = None,
    only_with_open_roles: bool = False,
    limit: int = 24,
) -> list[CompanyListItem]:
    """Companies whose listings align with this student's stored skills.

    A company qualifies when at least one of its listings shares a required
    skill with the student (optionally meeting `min_compatibility`). Ordering is
    by the company's *best* alignment, so the strongest match leads and ties
    break on company id for a stable order between requests.
    """
    slugs = student_skill_slugs(db, profile)
    counts = job_service.company_role_counts_bulk(db)

    if not slugs:
        # Without skills nothing can "match"; return the directory unscored so
        # the section still shows employers, just without a match ordering.
        return list_companies(db, only_with_open_roles=only_with_open_roles)[:limit]

    enable_semantic, threshold = _match_settings()
    names = student_skill_names(db, profile)

    query = job_service.apply_filters(job_service.base_query(), status=status)
    best: dict[int, float] = {}

    for job in db.scalars(query).all():
        match = compute_match(
            slugs,
            requirements_from_job(job),
            enable_semantic=enable_semantic,
            semantic_threshold=threshold,
            student_skill_names=names,
        )
        # A company matches only on real overlap: at least one matched skill, or
        # accepted semantic credit. An empty match proves nothing.
        aligned = bool(match.matched_skills or match.semantic_matches)
        if min_compatibility is not None:
            aligned = aligned and match.compatibility_score >= min_compatibility
        if not aligned:
            continue
        current = best.get(job.company_id)
        if current is None or match.compatibility_score > current:
            best[job.company_id] = match.compatibility_score

    rows = job_service.company_rows_with_listings(db)
    items: list[CompanyListItem] = []
    for row in rows:
        open_roles, total_roles = counts.get(row.id, (0, 0))
        if row.id not in best:
            continue
        if only_with_open_roles and open_roles == 0:
            continue
        items.append(company_list_item(row, (open_roles, total_roles)))

    # Strongest alignment first; company id keeps equal scores stable.
    items.sort(key=lambda item: (-best.get(item.id, 0.0), item.id))
    return items[:limit]


def company_is_hiring(db: Session, company_id: int) -> bool:
    """True only when the company has a row explicitly stored as open."""
    open_roles, _ = job_service.company_role_counts(db, company_id)
    return open_roles > 0


__all__ = [
    "Company",
    "JobStatus",
    "companies_matching_student",
    "company_detail",
    "company_is_hiring",
    "list_companies",
]