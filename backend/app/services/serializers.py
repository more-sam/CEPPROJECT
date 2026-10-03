"""ORM -> response-schema conversion.

Kept in one place so routers stay thin and every endpoint describes a resume or
a job in exactly the same shape.
"""

from app.models.job import Job
from app.models.resume import Resume
from app.models.roadmap import Roadmap
from app.schemas.job import (
    CompanyListItem,
    CompanySummary,
    JobDetail,
    JobListItem,
    JobRequiredSkill,
)
from app.schemas.resume import ResumeSummary
from app.schemas.roadmap import RoadmapItemResponse, RoadmapResponse
from app.services.matching_service import MatchResult


def company_summary(company) -> CompanySummary | None:  # noqa: ANN001
    if company is None:
        return None
    return CompanySummary(
        id=company.id,
        name=company.name,
        description=company.description,
        logo_url=company.logo_url,
        website_url=company.website_url,
        location=company.location,
        industry=company.industry,
        initials=company.initials,
    )


def company_list_item(
    company,  # noqa: ANN001
    counts: tuple[int, int] = (0, 0),
) -> CompanyListItem:
    """Company row with its (open_roles, total_roles) counts attached."""
    open_roles, total_roles = counts
    return CompanyListItem(
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


def required_skills(job: Job) -> list[JobRequiredSkill]:
    skills: list[JobRequiredSkill] = []
    for job_skill in job.job_skills:
        if job_skill.skill is None:
            continue
        skills.append(
            JobRequiredSkill(
                name=job_skill.skill.name,
                slug=job_skill.skill.slug,
                category=job_skill.skill.category,
                importance=job_skill.importance,
            )
        )
    skills.sort(key=lambda item: (-_importance_rank(item.importance), item.name))
    return skills


def _importance_rank(value: str) -> int:
    return {"high": 3, "medium": 2, "low": 1}.get(value, 0)


def job_list_item(
    job: Job,
    match: MatchResult | None = None,
    *,
    saved_ids: set[int] | None = None,
    reasons: list[str] | None = None,
) -> JobListItem:
    saved_ids = saved_ids or set()
    return JobListItem(
        id=job.id,
        title=job.title,
        location=job.location,
        employment_type=job.employment_type,
        work_type=job.work_type,
        experience_level=job.experience_level,
        source=job.source,
        posted_at=job.posted_at,
        company=company_summary(job.company),
        required_skills=required_skills(job),
        application_url=job.application_url,
        compatibility_score=match.compatibility_score if match else None,
        matched_skills=match.matched_skills if match else [],
        missing_skills=match.missing_skills if match else [],
        semantic_matches=match.semantic_matches if match else [],
        reasons=reasons or [],
        is_saved=job.id in saved_ids,
    )


def job_detail(
    job: Job,
    match: MatchResult | None = None,
    *,
    saved_ids: set[int] | None = None,
    reasons: list[str] | None = None,
) -> JobDetail:
    base = job_list_item(job, match, saved_ids=saved_ids, reasons=reasons)
    return JobDetail(
        **base.model_dump(exclude={'application_url'}),
        description=job.description,
        application_url=job.application_url,
        requirements_text=job.requirements_text,
        skill_breakdown=match.skill_breakdown if match else [],
        weighted_score=match.weighted_score if match else None,
        semantic_score=match.semantic_score if match else None,
    )


def resume_summary(resume: Resume) -> ResumeSummary:
    return ResumeSummary(
        id=resume.id,
        filename=resume.filename,
        file_type=resume.file_type,
        file_size_bytes=resume.file_size_bytes,
        analysis_status=resume.analysis_status,
        analysis_error=resume.analysis_error,
        skill_count=resume.skill_count,
        uploaded_at=resume.uploaded_at,
    )


def roadmap_response(
    roadmap: Roadmap,
    target_job_title: str | None = None,
) -> RoadmapResponse:
    """Build a roadmap payload including its derived progress summary."""
    from app.models.enums import RoadmapItemStatus

    items = [
        RoadmapItemResponse.from_item(item)
        for item in sorted(roadmap.items, key=lambda entry: entry.order_index)
    ]
    total = len(items)
    completed = sum(1 for item in items if item.status == RoadmapItemStatus.COMPLETED.value)
    in_progress = sum(
        1 for item in items if item.status == RoadmapItemStatus.IN_PROGRESS.value
    )
    total_hours = sum(item.estimated_hours for item in items)
    completed_hours = sum(
        item.estimated_hours
        for item in items
        if item.status == RoadmapItemStatus.COMPLETED.value
    )

    return RoadmapResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        source=roadmap.source,
        target_job_id=roadmap.target_job_id,
        target_job_title=target_job_title,
        created_at=roadmap.created_at,
        updated_at=roadmap.updated_at,
        items=items,
        total_items=total,
        completed_items=completed,
        in_progress_items=in_progress,
        total_hours=total_hours,
        completed_hours=completed_hours,
        progress_percentage=round(completed / total * 100, 2) if total else 0.0,
    )
