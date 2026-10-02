"""Turn skill gaps into an ordered, explained learning roadmap.

Ordering is prerequisite-aware: the taxonomy declares which skills depend on
which, and only prerequisites that are *also missing* affect the order, since
anything already known is satisfied by definition.

Priorities come from demand, not guesswork: a skill needed by most of the
student's recommended opportunities is high priority, and one needed by a single
opportunity is low.
"""

from dataclasses import dataclass

from app.ai.taxonomy import Taxonomy, TaxonomySkill, get_taxonomy, slugify

# Required by at least this share of target roles -> that priority.
HIGH_DEMAND_RATIO = 0.5
MEDIUM_DEMAND_RATIO = 0.2


@dataclass
class SkillDemand:
    """How strongly the student's target opportunities need one skill."""

    slug: str
    name: str
    category: str
    jobs_requiring: int
    total_jobs: int
    highest_importance: str  # low | medium | high

    @property
    def demand_ratio(self) -> float:
        if self.total_jobs <= 0:
            return 0.0
        return self.jobs_requiring / self.total_jobs


@dataclass
class RoadmapItemPlan:
    """A single planned step, before it is persisted."""

    skill: TaxonomySkill
    order_index: int
    priority: str
    estimated_hours: int
    reason: str
    prerequisites: list[str]
    resources: list[dict]


def known_prerequisites(taxonomy: Taxonomy, skill: TaxonomySkill) -> list[str]:
    """Prerequisite names for a skill that actually exist in the taxonomy.

    Uses the taxonomy's case-insensitive resolver: comparing prerequisites
    against `by_name` directly never matched, silently emptying every roadmap
    item's prerequisite list.
    """
    return [entry.name for entry in taxonomy.prerequisite_skills(skill)]


def _priority_for(demand: SkillDemand | None) -> str:
    """Decide a priority from demand share and the strongest required importance."""
    if demand is None:
        return "medium"
    if demand.demand_ratio >= HIGH_DEMAND_RATIO or demand.highest_importance == "high":
        return "high"
    if demand.demand_ratio >= MEDIUM_DEMAND_RATIO:
        return "medium"
    return "low"


def _reason_for(
    skill: TaxonomySkill,
    demand: SkillDemand | None,
    missing_slugs: set[str],
    taxonomy: Taxonomy,
) -> str:
    """Explain, in plain language, why this item is on the roadmap."""
    parts: list[str] = []

    if demand is not None and demand.total_jobs > 0:
        parts.append(
            f"Required by {demand.jobs_requiring} of your {demand.total_jobs} "
            "target opportunities."
        )

    # Prerequisites that are also on the roadmap explain this step's position.
    build_on = [
        name
        for name in known_prerequisites(taxonomy, skill)
        if slugify(name) in missing_slugs
    ]
    if build_on:
        verb = "is" if len(build_on) == 1 else "are"
        parts.append(f"Builds on {', '.join(build_on)}, which {verb} also on your roadmap.")

    # Skills this one unblocks explain why it is worth doing early.
    unblocks = sorted(
        other.name
        for other in taxonomy.skills
        if skill.name in known_prerequisites(taxonomy, other)
        and other.slug in missing_slugs
    )
    if unblocks:
        parts.append(f"Unblocks {', '.join(unblocks)} later in this path.")

    if skill.category:
        parts.append(f"Skill area: {skill.category}.")

    return " ".join(parts)


def generate_roadmap_items(
    demands: dict[str, SkillDemand],
    taxonomy: Taxonomy | None = None,
) -> list[RoadmapItemPlan]:
    """Produce an ordered roadmap for the given missing-skill demands.

    Returns an empty list when nothing is missing - callers should treat that as
    "you already cover every required skill", not as an error.
    """
    taxonomy = taxonomy or get_taxonomy()
    missing_slugs = set(demands)

    if not missing_slugs:
        return []

    # `topologically_ordered` already returns prerequisites before dependants,
    # restricted to the skills that are actually missing.
    ordered_skills = taxonomy.topologically_ordered(missing_slugs)

    plans: list[RoadmapItemPlan] = []
    for index, skill in enumerate(ordered_skills):
        demand = demands.get(skill.slug)
        plans.append(
            RoadmapItemPlan(
                skill=skill,
                order_index=index,
                priority=_priority_for(demand),
                estimated_hours=skill.estimated_hours,
                reason=_reason_for(skill, demand, missing_slugs, taxonomy),
                prerequisites=[
                    name
                    for name in known_prerequisites(taxonomy, skill)
                    if slugify(name) in missing_slugs
                ],
                resources=[dict(item) for item in skill.resources],
            )
        )

    return plans


def roadmap_title(target_role: str | None, skill_count: int) -> str:
    """A readable title for the generated roadmap."""
    if target_role:
        return f"Roadmap for {target_role}"
    if skill_count == 1:
        return "Close your 1 remaining skill gap"
    return f"Close your {skill_count} skill gaps"


def roadmap_description(plans: list[RoadmapItemPlan], target_role: str | None) -> str:
    """Summary line shown above the roadmap timeline."""
    if not plans:
        return "You already cover every required skill for your targets."

    total_hours = sum(plan.estimated_hours for plan in plans)
    high_count = sum(1 for plan in plans if plan.priority == "high")
    skill_count = len(plans)
    scope = f" for {target_role}" if target_role else ""

    summary = (
        f"{skill_count} skill{'s' if skill_count != 1 else ''} to learn{scope}, "
        f"ordered so prerequisites come first. About {total_hours} hours of study."
    )
    if high_count:
        plural = "s" if high_count != 1 else ""
        summary += f" Start with the {high_count} high-priority item{plural}."
    summary += " Finish a step with an assessment to update your progress."
    return summary
