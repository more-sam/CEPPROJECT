"""Opportunity listing, filtering, pagination and lookup.

Listing is paginated at the database level so the browser never receives the
whole table.
"""

from dataclasses import dataclass

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.company import Company
from app.models.job import Job, JobSkill
from app.models.skill import Skill
from app.services.matching_service import MatchResult, compute_match, requirements_from_job

DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 60

ALLOWED_SORTS = {"newest", "compatibility", "relevance", "title"}


@dataclass
class JobWithMatch:
    """A job paired with the student's alignment result (when available)."""

    job: Job
    match: MatchResult | None = None
    reasons: list[str] | None = None


def _base_query() -> Select:
    return select(Job).options(
        selectinload(Job.company),
        selectinload(Job.job_skills).selectinload(JobSkill.skill),
    )


def apply_filters(
    query: Select,
    *,
    search: str | None = None,
    location: str | None = None,
    employment_type: str | None = None,
    work_type: str | None = None,
    experience_level: str | None = None,
    skill_slug: str | None = None,
    company_id: int | None = None,
) -> Select:
    """Apply the opportunities-page filter set to a query."""
    if search:
        term = f"%{search.strip().lower()}%"
        # search_text is maintained on every job row so this stays a simple ILIKE
        # rather than a join across companies and skills.
        query = query.where(Job.search_text.like(term))

    if location:
        query = query.where(Job.location.ilike(f"%{location.strip()}%"))
    if employment_type:
        query = query.where(Job.employment_type == employment_type)
    if work_type:
        query = query.where(Job.work_type == work_type)
    if experience_level:
        query = query.where(Job.experience_level == experience_level)
    if company_id:
        query = query.where(Job.company_id == company_id)

    if skill_slug:
        query = query.where(
            Job.id.in_(
                select(JobSkill.job_id)
                .join(Skill, JobSkill.skill_id == Skill.id)
                .where(Skill.slug == skill_slug)
            )
        )

    return query


def count_jobs(db: Session, query: Select) -> int:
    """Count matching rows without loading them."""
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    return int(db.scalar(count_query) or 0)


def list_jobs(
    db: Session,
    *,
    student_slugs: set[str] | None = None,
    student_skill_names: dict[str, str] | None = None,
    enable_semantic: bool = True,
    semantic_threshold: float = 0.25,
    sort: str = "newest",
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    **filters,
) -> tuple[list[JobWithMatch], int]:
    """Return one page of opportunities, each optionally scored for the student.

    Returns:
        (items, total) where total is the unpaginated match count.
    """
    page = max(1, page)
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))
    sort = sort if sort in ALLOWED_SORTS else "newest"

    query = apply_filters(_base_query(), **filters)
    total = count_jobs(db, query)

    # "relevance" with no search term behaves like newest.
    if sort == "title":
        query = query.order_by(Job.title.asc())
    else:
        query = query.order_by(Job.posted_at.desc().nullslast(), Job.id.desc())

    # Compatibility sorting has to happen in Python because the score depends on
    # the student's live skill set. The candidate window is widened so the true
    # top matches are present before ordering.
    if sort == "compatibility" and student_slugs:
        candidate_limit = min(max(page * page_size, 200), 500)
        rows = db.scalars(query.limit(candidate_limit)).all()
        scored = _score_jobs(
            rows,
            student_slugs,
            student_skill_names,
            enable_semantic,
            semantic_threshold,
        )
        scored.sort(key=lambda item: -(item.match.combined_score if item.match else 0))
        start = (page - 1) * page_size
        return scored[start : start + page_size], total

    rows = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return (
        _score_jobs(
            rows, student_slugs, student_skill_names, enable_semantic, semantic_threshold
        ),
        total,
    )


def _score_jobs(
    jobs: list[Job],
    student_slugs: set[str] | None,
    student_skill_names: dict[str, str] | None,
    enable_semantic: bool,
    semantic_threshold: float,
) -> list[JobWithMatch]:
    """Attach a computed match to each job, or None when the student has no skills."""
    results: list[JobWithMatch] = []
    for job in jobs:
        if not student_slugs:
            results.append(JobWithMatch(job=job, match=None))
            continue

        match = compute_match(
            student_slugs,
            requirements_from_job(job),
            enable_semantic=enable_semantic,
            semantic_threshold=semantic_threshold,
            student_skill_names=student_skill_names,
        )
        results.append(JobWithMatch(job=job, match=match))
    return results


def get_job(db: Session, job_id: int) -> Job | None:
    return db.scalar(
        _base_query().where(Job.id == job_id)
    )


def get_jobs_by_ids(db: Session, job_ids: list[int]) -> list[Job]:
    if not job_ids:
        return []
    return list(db.scalars(_base_query().where(Job.id.in_(job_ids))))


def filter_options(db: Session) -> dict[str, list[str]]:
    """Distinct filter values actually present in the data."""

    def distinct(column) -> list[str]:  # noqa: ANN001
        rows = db.scalars(select(column).distinct().order_by(column)).all()
        return [value for value in rows if value]

    categories = db.scalars(
        select(Skill.category)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .distinct()
        .order_by(Skill.category)
    ).all()

    return {
        "locations": distinct(Job.location),
        "employment_types": distinct(Job.employment_type),
        "work_types": distinct(Job.work_type),
        "experience_levels": distinct(Job.experience_level),
        "categories": [value for value in categories if value],
    }


def build_search_text(job: Job) -> str:
    """Lower-cased haystack of the fields a student is likely to search for."""
    parts = [
        job.title or "",
        job.location or "",
        job.employment_type or "",
        job.work_type or "",
        job.experience_level or "",
        job.company.name if job.company else "",
    ]
    parts.extend(
        job_skill.skill.name
        for job_skill in job.job_skills
        if job_skill.skill is not None
    )
    return " ".join(part for part in parts if part).lower()


def search_related_skills(db: Session, skill_slugs: set[str]) -> dict[str, int]:
    """How many jobs require each of the given skills.

    Used by the skill-gap page to answer "how many opportunities need this?".
    """
    if not skill_slugs:
        return {}
    rows = db.execute(
        select(Skill.slug, func.count(JobSkill.job_id))
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .where(Skill.slug.in_(skill_slugs))
        .group_by(Skill.slug)
    )
    return {slug: int(count) for slug, count in rows}


def company_lookup(db: Session, name: str) -> Company | None:
    return db.scalar(select(Company).where(Company.name == name))


def matches_any(column, values: list[str]):  # noqa: ANN001
    """OR together ILIKE conditions, used by the free-text role filter."""
    if not values:
        return None
    return or_(*[column.ilike(f"%{value}%") for value in values])
