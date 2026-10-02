"""Recommendation engine.

Ranking combines four explainable signals:

1. Skill alignment (SkillBridge Compatibility) - the dominant factor.
2. Semantic allowance for related skills, discounted (see matching_service).
3. The student's stated preferences (role, location, work type).
4. A small recency nudge so newly posted roles surface.

Every contributing factor is returned to the caller as a human-readable reason,
so a recommendation can always be justified rather than being an opaque ranking.
"""

from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.ai.semantic_matcher import get_similarity_index
from app.core.config import settings
from app.models.company import Company
from app.models.job import Job, JobSkill
from app.models.match import JobMatch
from app.models.profile import StudentProfile
from app.services.job_service import DEFAULT_PAGE_SIZE, JobWithMatch, _base_query
from app.services.matching_service import (
    MatchResult,
    compute_match,
    preference_score,
    requirements_from_job,
)
from app.services.profile_service import student_skill_names, student_skill_slugs

# Weights for the internal ranking score. Change these to rebalance what
# "recommended for you" means, without touching the headline compatibility score.
WEIGHT_COMPATIBILITY = 0.70
WEIGHT_PREFERENCE = 0.20
WEIGHT_RECENCY = 0.10

# How many of the student's best-fit roles define "their gaps".
#
# Every gap-driven surface (the dashboard metric, the Skill Gap page and roadmap
# generation) must use the SAME scope, otherwise the skill-gap page can report 19
# gaps while the roadmap generated from it claims 73. Aggregating all 52 seeded
# roles instead would report ~80 gaps for every student - technically true, but
# not an actionable plan.
DEFAULT_GAP_ROLE_LIMIT = 12


@dataclass
class ScoredJob:
    job: Job
    match: MatchResult
    preference: float
    ranking_score: float
    reasons: list[str]


def _recency_points(job: Job) -> float:
    """Up to 100 points for very recent postings, decaying with age."""
    if job.posted_at is None:
        return 0.0
    from datetime import UTC, datetime

    posted = job.posted_at
    if posted.tzinfo is None:
        posted = posted.replace(tzinfo=UTC)
    days = max(0, (datetime.now(UTC) - posted).days)
    return max(0.0, 100.0 - days * 3.0)


def rank_jobs(
    jobs: list[Job],
    *,
    student_slugs: set[str],
    names: dict[str, str],
    preferred_roles: list[str] | None,
    preferred_locations: list[str] | None,
    work_type: str | None,
    enable_semantic: bool = True,
    semantic_threshold: float = 0.25,
) -> list[ScoredJob]:
    """Score and order opportunities for one student."""
    scored: list[ScoredJob] = []

    for job in jobs:
        match = compute_match(
            student_slugs,
            requirements_from_job(job),
            enable_semantic=enable_semantic,
            semantic_threshold=semantic_threshold,
            student_skill_names=names,
        )

        preference, preference_reasons = preference_score(
            job,
            preferred_roles=preferred_roles,
            preferred_locations=preferred_locations,
            work_type=work_type,
        )

        ranking = (
            WEIGHT_COMPATIBILITY * match.combined_score
            + WEIGHT_PREFERENCE * preference
            + WEIGHT_RECENCY * _recency_points(job)
        )

        reasons: list[str] = []
        if match.matched_skills:
            shown = ", ".join(match.matched_skills[:4])
            reasons.append(f"You already have {shown}.")
        if match.semantic_matches:
            top = match.semantic_matches[0]
            reasons.append(top["explanation"])
        reasons.extend(preference_reasons)
        if match.missing_skills:
            shown = ", ".join(match.missing_skills[:4])
            reasons.append(f"Skill gaps to close: {shown}.")

        scored.append(
            ScoredJob(
                job=job,
                match=match,
                preference=preference,
                ranking_score=round(ranking, 2),
                reasons=reasons,
            )
        )

    # Deterministic ordering: ranking, then the job id so identical scores do not
    # shuffle between requests.
    scored.sort(key=lambda item: (-item.ranking_score, item.job.id))
    return scored


def recommend_for_student(
    db: Session,
    profile: StudentProfile,
    *,
    limit: int = DEFAULT_PAGE_SIZE,
    min_compatibility: float | None = None,
    persist: bool = False,
    **filters,
) -> tuple[list[ScoredJob], str | None]:
    """Recommend opportunities for a student.

    Returns:
        (ranked jobs, note) where note explains an empty result so the UI can
        render a useful empty state.
    """
    slugs = student_skill_slugs(db, profile)

    if not slugs:
        return [], (
            "Upload a resume or add skills to your profile to see opportunities "
            "ranked for you."
        )

    names = student_skill_names(db, profile)

    query = _base_query().options(
        selectinload(Job.company), selectinload(Job.job_skills).selectinload(JobSkill.skill)
    )
    from app.services.job_service import apply_filters

    query = apply_filters(query, **filters)

    # Score a bounded candidate window rather than the entire table.
    candidates = list(
        db.scalars(
            query.order_by(Job.posted_at.desc().nullslast(), Job.id.desc()).limit(400)
        )
    )

    if not candidates:
        return [], "No opportunities match your current filters. Try widening them."

    ranked = rank_jobs(
        candidates,
        student_slugs=slugs,
        names=names,
        preferred_roles=profile.preferred_roles,
        preferred_locations=profile.preferred_locations,
        work_type=profile.work_type,
        enable_semantic=settings.enable_semantic_matching,
        semantic_threshold=settings.semantic_threshold,
    )

    if min_compatibility is not None:
        ranked = [
            item
            for item in ranked
            if item.match.compatibility_score >= min_compatibility
        ]

    ranked = ranked[: max(1, limit)]

    if persist and ranked:
        persist_matches(db, profile, ranked)

    if not ranked:
        return [], (
            "We could not find opportunities above that compatibility level yet. "
            "Try lowering the threshold or adding more skills."
        )

    return ranked, None


def persist_matches(
    db: Session,
    profile: StudentProfile,
    scored: list[ScoredJob],
) -> None:
    """Upsert the computed matches so dashboards can read them cheaply."""
    if not scored:
        return

    job_ids = [item.job.id for item in scored]
    existing_rows = db.scalars(
        select(JobMatch).where(
            JobMatch.student_id == profile.id, JobMatch.job_id.in_(job_ids)
        )
    ).all()
    existing = {row.job_id: row for row in existing_rows}

    for item in scored:
        row = existing.get(item.job.id) or JobMatch(
            student_id=profile.id, job_id=item.job.id
        )
        row.compatibility_score = item.match.compatibility_score
        row.exact_score = item.match.compatibility_score
        row.semantic_score = item.match.semantic_score
        row.preference_score = item.preference
        row.matched_skills = item.match.matched_skills
        row.missing_skills = item.match.missing_skills
        row.additional_skills = item.match.additional_skills
        row.semantic_matches = item.match.semantic_matches
        row.skill_breakdown = item.match.skill_breakdown
        db.add(row)

    db.commit()


def refresh_matches_for_job(
    db: Session,
    profile: StudentProfile,
    job: Job,
) -> MatchResult:
    """Compute (and cache) the match for a single job."""
    slugs = student_skill_slugs(db, profile)
    names = student_skill_names(db, profile)

    match = compute_match(
        slugs,
        requirements_from_job(job),
        enable_semantic=settings.enable_semantic_matching,
        semantic_threshold=settings.semantic_threshold,
        student_skill_names=names,
    )

    if slugs:
        persist_matches(
            db,
            profile,
            [
                ScoredJob(
                    job=job, match=match, preference=0.0, ranking_score=0.0, reasons=[]
                )
            ],
        )

    return match


def clear_matches(db: Session, profile: StudentProfile) -> None:
    """Drop cached matches so the next request recomputes from fresh skills."""
    db.execute(delete(JobMatch).where(JobMatch.student_id == profile.id))
    db.commit()


def demand_summary(
    db: Session,
    profile: StudentProfile,
    *,
    limit: int = 60,
) -> dict[str, dict]:
    """Which skills the student's recommended opportunities ask for most.

    `limit` bounds how many of the student's TOP recommended roles are
    considered - it is not a cap on the returned skills. The result can therefore
    hold more entries than `limit`, because several roles each contribute their
    own gaps. Callers that need a fixed-size list must slice the result.

    Feeds the skill-gap page ("why does this matter?") and the assistant.
    """
    ranked, _ = recommend_for_student(db, profile, limit=limit)
    if not ranked:
        return {}

    summary: dict[str, dict] = {}
    total_jobs = len(ranked)

    for item in ranked:
        if not item.match:
            continue
        for entry in item.match.skill_breakdown:
            if entry["relation"] == "exact":
                continue
            bucket = summary.setdefault(
                entry["slug"],
                {
                    "name": entry["skill"],
                    "slug": entry["slug"],
                    "category": entry["category"],
                    "jobs_requiring": 0,
                    "total_jobs": total_jobs,
                    "highest_importance": "low",
                },
            )
            bucket["jobs_requiring"] += 1
            if _importance_rank(entry["importance"]) > _importance_rank(
                bucket["highest_importance"]
            ):
                bucket["highest_importance"] = entry["importance"]

    return summary


def _importance_rank(value: str) -> int:
    return {"low": 1, "medium": 2, "high": 3}.get(value, 0)


def explain_compatibility(match: MatchResult) -> list[str]:
    """A short, student-facing explanation of how a score was reached."""
    if match.total_required == 0:
        return ["This opportunity does not list specific required skills yet."]

    lines = [
        f"{len(match.matched_skills)} of {match.total_required} required skills "
        f"already align ({match.compatibility_score:.0f}%)."
    ]
    if match.semantic_matches:
        top = match.semantic_matches[0]
        lines.append(
            f"{top['job_skill']} is treated as partially covered by your "
            f"{top['student_skill']}."
        )
    if match.missing_skills:
        lines.append(
            f"{len(match.missing_skills)} skill gap"
            f"{'s' if len(match.missing_skills) != 1 else ''} remain."
        )
    return lines


def similar_skill_names(slug: str, limit: int = 4) -> list[str]:
    return get_similarity_index().closest_related_names(slug, limit)


def jobs_with_company(db: Session, limit: int = 6) -> list[Company]:
    """A few companies, used to populate the landing page preview."""
    return list(db.scalars(select(Company).limit(limit)))


def job_card_payload(scored: ScoredJob, saved_ids: set[int], semantic: bool = True) -> dict:
    """Serialise a scored job into the canonical opportunity-card shape.

    This deliberately reuses the SAME serialiser as `GET /api/jobs`, so the
    dashboard, the resume analysis preview and the assistant's grounding context
    all speak one card type. An earlier ad-hoc dict here drifted from the list
    schema and silently broke the dashboard cards in the client.
    """
    from app.services.serializers import job_list_item

    payload = job_list_item(
        scored.job,
        scored.match,
        saved_ids=saved_ids,
        # Only the strongest reasons, so a card stays scannable.
        reasons=scored.reasons[:3],
    ).model_dump()

    if not semantic:
        payload["semantic_matches"] = []

    return payload


def list_job_with_matches(
    db: Session,
    profile: StudentProfile,
    scored: list[ScoredJob],
) -> list[JobWithMatch]:
    """Convenience adapter used where the listing code expects JobWithMatch."""
    return [
        JobWithMatch(job=item.job, match=item.match, reasons=item.reasons)
        for item in scored
    ]
