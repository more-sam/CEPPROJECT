"""Job listing and its required-skill associations."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
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
    from app.models.company import Company
    from app.models.job import JobSkill
    from app.models.match import JobMatch, SavedJob
    from app.models.skill import Skill


class Job(Base, TimestampMixin):
    """An internship or entry-level opportunity."""

    __tablename__ = "jobs"
    __table_args__ = (
        # Common listing query: filter by employment type, newest first.
        Index("ix_jobs_employment_posted", "employment_type", "posted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), index=True, nullable=False)

    # internship | full_time | part_time | contract
    employment_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    # remote | hybrid | onsite
    work_type: Mapped[str] = mapped_column(String(32), default="onsite", nullable=False)
    # intern | entry | mid | senior
    experience_level: Mapped[str] = mapped_column(
        String(32), default="entry", nullable=False
    )
    # Comma-free keyword list used for text search (title + company + skills).
    search_text: Mapped[str] = mapped_column(Text, default="", nullable=False)

    application_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    # Provenance. Seeded rows always say "DEMO" so the UI never implies a
    # listing is a live vacancy.
    source: Mapped[str] = mapped_column(String(60), default="DEMO", nullable=False)

    # Application status: open | closed | expired | unknown.
    # "unknown" is the default because a stored row alone does not prove that
    # applications are still being accepted (spec section 7).
    status: Mapped[str] = mapped_column(
        String(16), default="unknown", index=True, nullable=False
    )
    # When a real data source last confirmed this listing's status/fields.
    # NULL for demo rows, which are never described as verified (spec section 16).
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Raw requirement text parsed into JobSkill rows at seed time.
    requirements_text: Mapped[str | None] = mapped_column(Text)

    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    company: Mapped["Company"] = relationship(back_populates="jobs")
    job_skills: Mapped[list["JobSkill"]] = relationship(
        back_populates="job", cascade="all, delete-orphan", passive_deletes=True
    )
    matches: Mapped[list["JobMatch"]] = relationship(
        back_populates="job", cascade="all, delete-orphan", passive_deletes=True
    )
    saved_by: Mapped[list["SavedJob"]] = relationship(
        back_populates="job", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def required_skill_names(self) -> list[str]:
        return [js.skill.name for js in self.job_skills if js.skill is not None]

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title!r}>"


class JobSkill(Base):
    """Association between a job and one skill it requires."""

    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # low | medium | high - weighting applied by the matching engine.
    importance: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)
    # 1-100 relative weight, derived from `importance`.
    weight: Mapped[int] = mapped_column(Integer, default=50, nullable=False)

    job: Mapped["Job"] = relationship(back_populates="job_skills")
    skill: Mapped["Skill"] = relationship(back_populates="job_skills")

    def __repr__(self) -> str:
        return f"<JobSkill job={self.job_id} skill={self.skill_id}>"
