"""Learning roadmap schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import RoadmapItemStatus


class RoadmapItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_index: int
    priority: str
    status: str
    estimated_hours: int
    reason: str
    prerequisites: list[str] = Field(default_factory=list)
    resources: list[dict] = Field(default_factory=list)
    skill_id: int
    skill_name: str
    skill_slug: str
    skill_category: str

    @classmethod
    def from_item(cls, item) -> "RoadmapItemResponse":  # noqa: ANN001
        return cls(
            id=item.id,
            order_index=item.order_index,
            priority=item.priority,
            status=item.status,
            estimated_hours=item.estimated_hours,
            reason=item.reason,
            prerequisites=list(item.prerequisites or []),
            resources=list(item.resources or []),
            skill_id=item.skill_id,
            skill_name=item.skill.name,
            skill_slug=item.skill.slug,
            skill_category=item.skill.category,
        )


class RoadmapResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    source: str
    target_job_id: int | None = None
    target_job_title: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[RoadmapItemResponse] = Field(default_factory=list)

    # Progress summary so the UI does not have to recompute it.
    total_items: int = 0
    completed_items: int = 0
    in_progress_items: int = 0
    total_hours: int = 0
    completed_hours: int = 0
    progress_percentage: float = 0.0


class RoadmapCreateRequest(BaseModel):
    """Generate a roadmap, optionally targeted at one opportunity."""

    job_id: int | None = None
    title: str | None = Field(default=None, max_length=200)


class RoadmapItemUpdateRequest(BaseModel):
    status: RoadmapItemStatus
