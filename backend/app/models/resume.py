"""Uploaded resume model.

`extracted_text` holds raw resume content, so it is personal data: it is never
exposed by a public route and never written to logs.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, utcnow

if TYPE_CHECKING:
    from app.models.profile import StudentProfile


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Original filename as uploaded (sanitised before storage).
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    # Path on disk. Never rendered to the client; downloads go through an
    # ownership-checked route.
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    extracted_text: Mapped[str | None] = mapped_column(Text)
    # Sections detected by the parser: {education: [...], skills: [...], ...}
    sections: Mapped[dict[str, list[str]]] = mapped_column(
        JSON, default=dict, nullable=False
    )
    # pending | processing | completed | failed
    analysis_status: Mapped[str] = mapped_column(
        String(16), default="pending", nullable=False, index=True
    )
    analysis_error: Mapped[str | None] = mapped_column(String(500))
    # Number of skills extracted, cached for fast list rendering.
    skill_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    profile: Mapped["StudentProfile"] = relationship(back_populates="resumes")

    def __repr__(self) -> str:
        return f"<Resume id={self.id} status={self.analysis_status!r}>"
