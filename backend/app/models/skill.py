"""Skill taxonomy entries and the student <-> skill association."""

from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.assessment import Assessment
    from app.models.job import JobSkill
    from app.models.profile import StudentProfile
    from app.models.progress import Progress
    from app.models.roadmap import RoadmapItem


class Skill(Base, TimestampMixin):
    """A canonical skill from the controlled taxonomy.

    Named uniquely by `slug` (lower-cased, punctuation-free) so aliases such as
    "JS" and "ReactJS" always resolve to one row.
    """

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # Alternative spellings that normalise to this skill.
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    student_skills: Mapped[list["StudentSkill"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan", passive_deletes=True
    )
    job_skills: Mapped[list["JobSkill"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan", passive_deletes=True
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan", passive_deletes=True
    )
    roadmap_items: Mapped[list["RoadmapItem"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan", passive_deletes=True
    )
    progress_entries: Mapped[list["Progress"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Skill {self.name!r}>"


class StudentSkill(Base, TimestampMixin):
    """A skill attributed to a student, with where it came from and confidence."""

    __tablename__ = "student_skills"
    __table_args__ = (
        UniqueConstraint("student_id", "skill_id", name="uq_student_skill"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # unknown | beginner | intermediate | advanced. Defaults to unknown because
    # the system has no evidence of real proficiency.
    proficiency: Mapped[str] = mapped_column(String(16), default="unknown", nullable=False)
    # 0.0 - 1.0 extraction confidence (not a measure of ability).
    confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    # resume | manual | assessment | roadmap
    source: Mapped[str] = mapped_column(String(16), default="resume", nullable=False)

    profile: Mapped["StudentProfile"] = relationship(back_populates="skills")
    skill: Mapped["Skill"] = relationship(back_populates="student_skills")

    def __repr__(self) -> str:
        return f"<StudentSkill student={self.student_id} skill={self.skill_id}>"
