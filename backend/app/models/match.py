"""Stored skill-alignment results and the student's saved opportunities."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, utcnow

if TYPE_CHECKING:
    from app.models.job import Job
    from app.models.profile import StudentProfile


class JobMatch(Base, TimestampMixin):
    """A cached skill-alignment calculation for one student/job pair.

    `compatibility_score` is SkillBridge Compatibility: the share of a job's
    required skills the student aligns with. It is NEVER a hiring probability.
    """

    __tablename__ = "job_matches"
    __table_args__ = (
        UniqueConstraint("student_id", "job_id", name="uq_student_job_match"),
        Index("ix_job_matches_student_score", "student_id", "compatibility_score"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )

    # 0.0 - 100.0, rounded to 2 decimal places.
    compatibility_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Additional explainable components, persisted for auditability.
    exact_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    semantic_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    preference_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # [{"skill": "Python", "importance": "high", "matched": true}, ...]
    skill_breakdown: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    matched_skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    missing_skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    additional_skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    # [{"student_skill": "REST APIs", "job_skill": "Web APIs", "similarity": 0.71}]
    semantic_matches: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)

    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    profile: Mapped["StudentProfile"] = relationship(back_populates="matches")
    job: Mapped["Job"] = relationship(back_populates="matches")

    @property
    def total_required(self) -> int:
        return len(self.matched_skills) + len(self.missing_skills)

    def __repr__(self) -> str:
        return (
            f"<JobMatch student={self.student_id} job={self.job_id} "
            f"score={self.compatibility_score}>"
        )


class SavedJob(Base, TimestampMixin):
    """A job the student bookmarked."""

    __tablename__ = "saved_jobs"
    __table_args__ = (UniqueConstraint("student_id", "job_id", name="uq_saved_job"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )

    profile: Mapped["StudentProfile"] = relationship(back_populates="saved_jobs")
    job: Mapped["Job"] = relationship(back_populates="saved_by")
