"""Per-skill learning progress for a student."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, utcnow

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class Progress(Base):
    """Tracks how far along a student is with one skill.

    Progress is only advanced by real evidence: a roadmap item being completed or
    an assessment being passed. It is never set to a random or cosmetic value.
    """

    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("student_id", "skill_id", name="uq_progress"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # 0 - 100
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Best assessment score seen for this skill (0 - 100), if any.
    best_assessment_score: Mapped[float | None] = mapped_column(Float)
    assessments_taken: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # not_started | developing | mastered - derived, stored for cheap dashboards.
    status: Mapped[str] = mapped_column(
        String(16), default="not_started", nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    profile: Mapped["StudentProfile"] = relationship(back_populates="progress_entries")
    skill: Mapped["Skill"] = relationship(back_populates="progress_entries")

    def __repr__(self) -> str:
        return f"<Progress student={self.student_id} skill={self.skill_id}>"
