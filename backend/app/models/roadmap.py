"""Personalised learning roadmap and its ordered items."""

from typing import TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class Roadmap(Base, TimestampMixin):
    __tablename__ = "roadmaps"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # "roadmap" for the general skill-gap plan; "job" for one targeted at a role.
    source: Mapped[str] = mapped_column(String(16), default="roadmap", nullable=False)
    # Set when the roadmap was generated for a specific opportunity.
    target_job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), index=True
    )

    profile: Mapped["StudentProfile"] = relationship(back_populates="roadmaps")
    items: Mapped[list["RoadmapItem"]] = relationship(
        back_populates="roadmap",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="RoadmapItem.order_index",
    )

    def __repr__(self) -> str:
        return f"<Roadmap id={self.id} title={self.title!r}>"


class RoadmapItem(Base):
    """One step in a roadmap."""

    __tablename__ = "roadmap_items"
    __table_args__ = (
        UniqueConstraint("roadmap_id", "skill_id", name="uq_roadmap_item_skill"),
        Index("ix_roadmap_items_order", "roadmap_id", "order_index"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    roadmap_id: Mapped[int] = mapped_column(
        ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True, nullable=False
    )

    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # high | medium | low - derived from how many opportunities need the skill.
    priority: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)
    # not_started | in_progress | completed
    status: Mapped[str] = mapped_column(
        String(16), default="not_started", nullable=False, index=True
    )
    estimated_hours: Mapped[int] = mapped_column(Integer, default=8, nullable=False)

    # Human-readable justification shown in the UI (why this item exists).
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # Prerequisite skill names that appear earlier in the roadmap.
    prerequisites: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    # Suggested learning resources, so the roadmap is actionable.
    resources: Mapped[list[dict]] = mapped_column(
        JSON, default=list, nullable=False
    )

    roadmap: Mapped["Roadmap"] = relationship(back_populates="items")
    skill: Mapped["Skill"] = relationship(back_populates="roadmap_items")

    def __repr__(self) -> str:
        return f"<RoadmapItem roadmap={self.roadmap_id} order={self.order_index}>"
