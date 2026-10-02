"""SkillBridge Compatibility: the transparent skill-alignment engine.

IMPORTANT - what this number is
-------------------------------
`compatibility_score` measures how closely a student's identified skills align
with the skills an opportunity asks for. It is computed as:

    matched required skills / total required skills * 100

It is NOT a hiring probability, a chance of being selected, or any guarantee of
an interview or job. It is a similarity score over skill sets.

Three scores are produced, deliberately kept separate so nothing is hidden:

1. `compatibility_score` - the headline number. Exact matches only, unweighted.
   This is the figure shown to students and is the documented contract.
2. `weighted_score` - the same idea but respecting each requirement's importance.
   Used only for ordering, never shown as "compatibility".
3. `combined_score` - `compatibility_score` plus a *discounted* allowance for
   semantically related skills. Used only for ordering recommendations, and the
   semantic contribution is always itemised in `semantic_matches` so it can be
   explained rather than hidden.
"""

from dataclasses import dataclass, field
from typing import Iterable

from app.ai.semantic_matcher import get_similarity_index
from app.ai.taxonomy import get_taxonomy
from app.models.enums import SkillImportance

# A semantically related skill counts for half of an exact match: the relation is
# inferred, not confirmed, so it must never carry the same weight.
SEMANTIC_CREDIT_FACTOR = 0.5

IMPORTANCE_WEIGHTS: dict[str, int] = {
    SkillImportance.LOW.value: 25,
    SkillImportance.MEDIUM.value: 50,
    SkillImportance.HIGH.value: 100,
}


@dataclass(frozen=True)
class SkillRequirement:
    """One skill an opportunity asks for."""

    slug: str
    name: str
    importance: str = SkillImportance.MEDIUM.value
    category: str = ""

    @property
    def weight(self) -> int:
        return IMPORTANCE_WEIGHTS.get(self.importance, 50)


@dataclass
class MatchResult:
    """Everything needed to render and explain one student/job alignment."""

    compatibility_score: float
    weighted_score: float
    semantic_score: float
    combined_score: float
    matched_skills: list[str] = field(default_factory=list)
    missing_skills: list[str] = field(default_factory=list)
    additional_skills: list[str] = field(default_factory=list)
    semantic_matches: list[dict] = field(default_factory=list)
    skill_breakdown: list[dict] = field(default_factory=list)

    @property
    def total_required(self) -> int:
        return len(self.matched_skills) + len(self.missing_skills)

    @property
    def is_empty(self) -> bool:
        return self.total_required == 0


def requirements_from_job(job) -> list[SkillRequirement]:  # noqa: ANN001 - ORM Job
    """Convert a Job ORM object (with `job_skills` loaded) into requirements."""
    requirements: list[SkillRequirement] = []
    for job_skill in job.job_skills:
        skill = job_skill.skill
        if skill is None:
            continue
        requirements.append(
            SkillRequirement(
                slug=skill.slug,
                name=skill.name,
                importance=job_skill.importance,
                category=skill.category,
            )
        )
    return requirements


def _empty_result() -> MatchResult:
    return MatchResult(
        compatibility_score=0.0,
        weighted_score=0.0,
        semantic_score=0.0,
        combined_score=0.0,
    )


def compute_match(
    student_slugs: Iterable[str],
    requirements: list[SkillRequirement],
    *,
    enable_semantic: bool = True,
    semantic_threshold: float = 0.30,
    student_skill_names: dict[str, str] | None = None,
) -> MatchResult:
    """Score one student against one opportunity's skill requirements.

    Args:
        student_slugs: canonical slugs of skills the student has.
        requirements: the opportunity's required skills.
        enable_semantic: allow related (non-identical) skills to count partially.
        semantic_threshold: minimum cosine similarity to treat skills as related.
        student_skill_names: optional slug -> display name, used in explanations.

    Returns:
        A MatchResult. Compatibility is 0.0 when the job lists no skills, which is
        an honest "cannot be scored" rather than an invented number.
    """
    total_required = len(requirements)
    if total_required == 0:
        return _empty_result()

    student_set = {slug for slug in student_slugs if slug}
    required_slugs = {requirement.slug for requirement in requirements}

    matched = [r for r in requirements if r.slug in student_set]
    missing = [r for r in requirements if r.slug not in student_set]

    # 1. Headline score - the documented, unweighted baseline.
    compatibility_score = round(len(matched) / total_required * 100, 2)

    # 2. Importance-weighted variant (ordering only).
    total_weight = sum(requirement.weight for requirement in requirements)
    matched_weight = sum(requirement.weight for requirement in matched)
    weighted_score = (
        round(matched_weight / total_weight * 100, 2) if total_weight else 0.0
    )

    # 3. Semantic allowance for concepts the student knows under another name.
    semantic_matches: list[dict] = []
    semantic_credit = 0.0
    if enable_semantic and missing and student_set:
        index = get_similarity_index()
        missing_slugs = {requirement.slug for requirement in missing}
        for pair in index.find_related(student_set, missing_slugs, semantic_threshold):
            semantic_matches.append(
                {
                    "student_skill": pair.student_skill,
                    "job_skill": pair.job_skill,
                    "similarity": pair.rounded_similarity,
                    "explanation": (
                        f"Your {pair.student_skill} is closely related to the "
                        f"required {pair.job_skill} "
                        f"(similarity {pair.rounded_similarity:.2f})."
                    ),
                }
            )
            semantic_credit += pair.similarity

    semantic_score = round(semantic_credit / total_required * 100, 2)
    combined_score = round(
        min(100.0, compatibility_score + semantic_score * SEMANTIC_CREDIT_FACTOR), 2
    )

    # Which missing requirements were covered semantically, for the breakdown.
    semantic_job_skills = {item["job_skill"] for item in semantic_matches}

    breakdown: list[dict] = []
    for requirement in requirements:
        if requirement.slug in student_set:
            relation = "exact"
        elif requirement.name in semantic_job_skills:
            relation = "semantic"
        else:
            relation = "missing"
        breakdown.append(
            {
                "skill": requirement.name,
                "slug": requirement.slug,
                "category": requirement.category,
                "importance": requirement.importance,
                "weight": requirement.weight,
                "relation": relation,
                "matched": relation == "exact",
            }
        )

    # Student's extra skills - framed as breadth, never as a deficiency.
    taxonomy = get_taxonomy()
    supplied_names = student_skill_names or {}

    def display_name(slug: str) -> str:
        if slug in supplied_names:
            return supplied_names[slug]
        skill = taxonomy.by_slug.get(slug)
        return skill.name if skill else slug

    additional = sorted(display_name(slug) for slug in student_set - required_slugs)

    return MatchResult(
        compatibility_score=compatibility_score,
        weighted_score=weighted_score,
        semantic_score=semantic_score,
        combined_score=combined_score,
        matched_skills=[r.name for r in matched],
        missing_skills=[r.name for r in missing],
        additional_skills=additional,
        semantic_matches=semantic_matches,
        skill_breakdown=breakdown,
    )


def preference_score(
    job,
    *,
    preferred_roles: list[str] | None = None,
    preferred_locations: list[str] | None = None,
    work_type: str | None = None,
) -> tuple[float, list[str]]:
    """Score how well an opportunity fits the student's stated preferences.

    Returns the score (0-100) and the human-readable reasons behind it, so the UI
    can show *why* something was recommended rather than a bare number.
    """
    reasons: list[str] = []
    score = 0.0

    preferred_roles = [role.lower().strip() for role in (preferred_roles or []) if role.strip()]
    if preferred_roles:
        title = (job.title or "").lower()
        if any(role in title or title in role for role in preferred_roles):
            score += 45.0
            reasons.append(f"Matches your preferred role ({job.title}).")

    preferred_locations = [
        location.lower().strip()
        for location in (preferred_locations or [])
        if location.strip()
    ]
    if preferred_locations:
        location = (job.location or "").lower()
        if any(place in location for place in preferred_locations):
            score += 35.0
            reasons.append(f"Located in {job.location}.")

    if work_type and job.work_type == work_type:
        score += 20.0
        reasons.append(f"{job.work_type.title()} working arrangement.")

    return round(min(100.0, score), 2), reasons
