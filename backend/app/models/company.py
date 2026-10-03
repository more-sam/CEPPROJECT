"""Company model - the organisation behind a job listing."""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.job import Job


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # Initials fallback is used when no logo image is available, so the UI never
    # shows a broken image. This is a real stored value, not a frontend guess.
    logo_url: Mapped[str | None] = mapped_column(String(500))
    website_url: Mapped[str | None] = mapped_column(String(500))
    location: Mapped[str | None] = mapped_column(String(200))
    # Free-text industry label (e.g. "EdTech"); NULL when not known.
    industry: Mapped[str | None] = mapped_column(String(120))

    jobs: Mapped[list["Job"]] = relationship(
        back_populates="company", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def initials(self) -> str:
        """Up to two initials derived from the company name (e.g. 'TCS')."""
        words = [word for word in self.name.replace("-", " ").split() if word]
        if not words:
            return "?"
        if len(words) == 1:
            return words[0][:2].upper()
        return (words[0][0] + words[1][0]).upper()

    def __repr__(self) -> str:
        return f"<Company {self.name!r}>"
