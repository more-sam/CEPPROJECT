"""Skill assessments: the test definition, its questions and a student's attempt."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, utcnow

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class Assessment(Base, TimestampMixin):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # beginner | intermediate | advanced
    difficulty: Mapped[str] = mapped_column(
        String(16), default="beginner", nullable=False, index=True
    )
    # Marks required to pass, used to advance progress.
    pass_score: Mapped[int] = mapped_column(Integer, default=60, nullable=False)

    skill: Mapped["Skill"] = relationship(back_populates="assessments")
    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="AssessmentQuestion.order_index",
    )
    results: Mapped[list["AssessmentResult"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def question_count(self) -> int:
        return len(self.questions)

    def __repr__(self) -> str:
        return f"<Assessment {self.title!r}>"


class AssessmentQuestion(Base):
    """A single multiple-choice question.

    `correct_answer` stores the exact option text so grading is a simple string
    comparison and the answer key never has to be exposed to the client.
    """

    __tablename__ = "assessment_questions"
    __table_args__ = (Index("ix_questions_assessment_order", "assessment_id", "order_index"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )

    question: Mapped[str] = mapped_column(Text, nullable=False)
    # List of 4 option strings.
    options: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    assessment: Mapped["Assessment"] = relationship(back_populates="questions")


class AssessmentResult(Base):
    """One graded attempt."""

    __tablename__ = "assessment_results"
    __table_args__ = (
        Index("ix_assessment_results_student", "student_id", "completed_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False
    )
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # 0.0 - 100.0
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passed: Mapped[bool] = mapped_column(default=False, nullable=False)
    # Per-question review payload: [{question_id, given, correct, is_correct, explanation}]
    review: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)

    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    profile: Mapped["StudentProfile"] = relationship(back_populates="assessment_results")
    assessment: Mapped["Assessment"] = relationship(back_populates="results")

    def __repr__(self) -> str:
        return f"<AssessmentResult student={self.student_id} score={self.score}>"
