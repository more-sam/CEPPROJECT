"""Student profile model - the non-authentication half of a student's identity."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.assessment import AssessmentResult
    from app.models.match import JobMatch, SavedJob
    from app.models.progress import Progress
    from app.models.resume import Resume
    from app.models.roadmap import Roadmap
    from app.models.skill import StudentSkill
    from app.models.user import User


class StudentProfile(Base, TimestampMixin):
    """One profile per user. Created lazily on first access."""

    __tablename__ = "student_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    full_name: Mapped[str | None] = mapped_column(String(150))
    college: Mapped[str | None] = mapped_column(String(200))
    degree: Mapped[str | None] = mapped_column(String(150))
    branch: Mapped[str | None] = mapped_column(String(150))
    graduation_year: Mapped[int | None] = mapped_column(Integer)

    # JSON arrays of strings, de-duplicated by the service layer.
    preferred_roles: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    preferred_locations: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )

    # remote | hybrid | onsite - see app.models.enums.WorkType
    work_type: Mapped[str | None] = mapped_column(String(32))
    bio: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="profile")

    resumes: Mapped[list["Resume"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", passive_deletes=True
    )
    skills: Mapped[list["StudentSkill"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", passive_deletes=True
    )
    matches: Mapped[list["JobMatch"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", passive_deletes=True
    )
    saved_jobs: Mapped[list["SavedJob"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", passive_deletes=True
    )
    roadmaps: Mapped[list["Roadmap"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", passive_deletes=True
    )
    assessment_results: Mapped[list["AssessmentResult"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", passive_deletes=True
    )
    progress_entries: Mapped[list["Progress"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<StudentProfile id={self.id} user_id={self.user_id}>"
