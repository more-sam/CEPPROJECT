"""Persisted Sieve scrape jobs.

A `ScrapeJob` is the durable record of one Sieve run for one student. It exists
so that a started run is never lost: the `session_id` returned by
`POST /api/scrapes` is written here immediately, and every later read of the job
resumes polling from this row instead of starting a duplicate run.

Nothing in this table is a secret. `request_payload` holds the instruction and
options the student chose, never the API key. The raw delivered files stay on
Sieve and are proxied through an ownership-checked route; only the metadata
(name, size, extension) is persisted.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.profile import StudentProfile

# Lifecycle values stored in `status`. `error` is only used for an unexpected
# status or a terminal request failure, never for a transient poll failure.
SCRAPE_STATUS_QUEUED = "queued"
SCRAPE_STATUS_RUNNING = "running"
SCRAPE_STATUS_DONE = "done"
SCRAPE_STATUS_REFUSED = "refused"
SCRAPE_STATUS_ERROR = "error"

SCRAPE_TERMINAL_STATUSES = frozenset({SCRAPE_STATUS_DONE, SCRAPE_STATUS_REFUSED})
SCRAPE_KNOWN_STATUSES = frozenset(
    {
        SCRAPE_STATUS_QUEUED,
        SCRAPE_STATUS_RUNNING,
        SCRAPE_STATUS_DONE,
        SCRAPE_STATUS_REFUSED,
    }
)


class ScrapeJob(Base, TimestampMixin):
    __tablename__ = "scrape_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Sieve session id. Unique so a retried/duplicated insert cannot attach two
    # local rows to one remote run. Nullable: the row is written a moment before
    # the run is accepted.
    session_id: Mapped[str | None] = mapped_column(
        String(128), unique=True, index=True
    )

    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    # The exact JSON body sent to Sieve, kept so a follow-up message can reuse
    # every option without the caller resending them.
    request_payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    compliance_mode: Mapped[str] = mapped_column(
        String(16), default="regular", nullable=False
    )
    target_urls: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    output_schema: Mapped[dict | None] = mapped_column(JSON)
    table_shape: Mapped[str | None] = mapped_column(String(8))

    status: Mapped[str] = mapped_column(
        String(16), default=SCRAPE_STATUS_QUEUED, nullable=False, index=True
    )

    # Follow-up turns. `turns_baseline` records how many turns Sieve had reflected
    # when the latest message was posted, so a poll can tell whether the answer
    # is the new one (`turns_count > turns_baseline`) or the previous answer.
    turns_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    turns_baseline: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    awaiting_turn: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Poll bookkeeping. `poll_attempts` drives the exponential backoff; it never
    # causes a timeout, because runs take minutes.
    poll_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_polled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Outcome, only ever populated from Sieve's own response.
    summary: Mapped[dict | None] = mapped_column(JSON)
    files: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    schema_conformance: Mapped[dict | None] = mapped_column(JSON)
    result: Mapped[dict | None] = mapped_column(JSON)
    refusal: Mapped[dict | None] = mapped_column(JSON)
    # Set for an unexpected status or a request that failed at the sieve call.
    error: Mapped[str | None] = mapped_column(Text)

    profile: Mapped["StudentProfile"] = relationship()

    def __repr__(self) -> str:
        return (
            f"<ScrapeJob id={self.id} status={self.status!r} "
            f"session={self.session_id!r}>"
        )
