"""Sieve scrape orchestration: persistence, polling and follow-up turns.

The application ships no queue or worker process (resume analysis runs inside its
request), so polling is request-driven: a `GET` on a job advances it at most one
step, respecting an exponential backoff written to the row. That keeps the
integration free of a second background system while still being crash-safe - the
Sieve `session_id` is persisted the moment it is received, so a restart resumes
polling from the stored row instead of starting a duplicate run.

All Sieve state changes happen here; `sieve_client` only speaks HTTP and the
router only maps errors onto HTTP responses.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.profile import StudentProfile
from app.models.scrape import (
    SCRAPE_KNOWN_STATUSES,
    SCRAPE_STATUS_ERROR,
    SCRAPE_TERMINAL_STATUSES,
    ScrapeJob,
)
from app.schemas.scrape import ScrapeFileOut, ScrapeJobResponse
from app.services.sieve_client import (
    SieveClient,
    SieveError,
    SieveNotConfigured,
    build_scrape_body,
    get_client,
    normalize_status,
)


class ScrapeError(RuntimeError):
    """A scrape operation could not be completed locally."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def configured() -> bool:
    return settings.sieve_enabled


def _require_client(client: SieveClient | None) -> SieveClient:
    if client is not None:
        return client
    if not settings.sieve_enabled:
        raise SieveNotConfigured()
    return get_client()


def next_poll_delay(completed_polls: int) -> float:
    """Delay before the next poll, from ~5s back to a ~30s ceiling.

    `completed_polls` is the number of polls already done. A single completed
    poll is the first backoff step, so the wait starts at the initial 5s.
    """
    exponent = min(max(0, completed_polls - 1), 10)
    delay = settings.sieve_poll_initial_seconds * (2 ** exponent)
    return min(delay, settings.sieve_poll_max_seconds)


# ---------------------------------------------------------------------------
# Applying a response
# ---------------------------------------------------------------------------
def apply_scrape_response(job: ScrapeJob, body: dict[str, Any]) -> None:
    """Copy a Sieve session payload onto the row.

    An unrecognised status is recorded as an error rather than stored verbatim,
    so the UI can never render an unknown state as if it were progress.
    """
    reflected_turns = job.turns_count or 0
    baseline = job.turns_baseline or 0
    awaiting = bool(job.awaiting_turn)

    raw_status = normalize_status(body.get("status"))

    job.summary = body.get("summary")
    job.files = body.get("files") or []
    job.schema_conformance = body.get("schema_conformance")
    job.result = body.get("result")
    job.refusal = body.get("refusal")

    turns = body.get("turns")
    if isinstance(turns, list):
        reflected_turns = len(turns)
        job.turns_count = reflected_turns

    if raw_status in SCRAPE_KNOWN_STATUSES:
        job.status = raw_status
        if raw_status == "error":
            job.error = "Sieve reported an error status."
        else:
            job.error = None
    else:
        job.status = SCRAPE_STATUS_ERROR
        job.error = f"Unexpected scrape status from Sieve: {raw_status!r}"

    # A follow-up is only answered once the run is done AND Sieve has reflected
    # one more turn than when the message was posted. Otherwise we would read the
    # previous answer.
    if awaiting and raw_status == "done" and reflected_turns > baseline:
        job.awaiting_turn = False


# ---------------------------------------------------------------------------
# Start / poll / follow-up
# ---------------------------------------------------------------------------
def start_job(
    db: Session,
    profile: StudentProfile,
    *,
    instruction: str,
    target_urls: list[str] | None = None,
    fields: list[str] | None = None,
    schema: dict[str, Any] | None = None,
    output_schema: dict[str, Any] | None = None,
    table_shape: str | None = None,
    compliance_mode: str | None = None,
    client: SieveClient | None = None,
) -> ScrapeJob:
    """Start a run and persist its session id durably.

    The row is written before the network call, and the `session_id` is committed
    the instant Sieve answers, so a crash between the two steps still leaves a
    resumable record rather than losing an accepted (paid) run.
    """
    active_client = _require_client(client)
    body = build_scrape_body(
        instruction,
        target_urls=target_urls,
        fields=fields,
        schema=schema,
        output_schema=output_schema,
        table_shape=table_shape,
        compliance_mode=compliance_mode or "regular",
    )

    job = ScrapeJob(
        student_id=profile.id,
        instruction=instruction,
        request_payload=body,
        compliance_mode=body.get("compliance_mode", "regular"),
        target_urls=body.get("target_urls", []),
        output_schema=body.get("output_schema"),
        table_shape=body.get("table_shape"),
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        response = active_client.start_scrape(body)
    except SieveError as exc:
        job.status = SCRAPE_STATUS_ERROR
        job.error = str(exc)
        db.commit()
        raise

    session_id = response.get("session_id")
    if not session_id:
        job.status = SCRAPE_STATUS_ERROR
        job.error = "Sieve accepted the request but returned no session id."
        db.commit()
        raise ScrapeError(
            "missing_session_id", "Sieve did not return a session id."
        )

    # Persist the session id before anything else, so polling can resume.
    job.session_id = str(session_id)
    status = normalize_status(response.get("status")) or "queued"
    job.status = status if status in SCRAPE_KNOWN_STATUSES else "queued"
    job.last_polled_at = None
    db.commit()
    db.refresh(job)
    return job


def poll_job(
    db: Session,
    job: ScrapeJob,
    *,
    client: SieveClient | None = None,
    force: bool = False,
) -> ScrapeJob:
    """Advance a job by at most one Sieve poll, honouring the backoff window.

    `force=True` (used by tests and explicit refreshes) bypasses the window.
    A transient failure is recorded but never terminal: Sieve being down must not
    mark a perfectly healthy run as failed.
    """
    if job.status in SCRAPE_TERMINAL_STATUSES or job.status == SCRAPE_STATUS_ERROR:
        return job
    if not job.session_id:
        return job

    now = datetime.now(UTC)
    if not force and job.last_polled_at is not None:
        elapsed = (now - job.last_polled_at).total_seconds()
        if elapsed < next_poll_delay(job.poll_attempts or 0):
            return job

    active_client = _require_client(client)
    job.poll_attempts = (job.poll_attempts or 0) + 1
    job.last_polled_at = now

    try:
        body = active_client.get_scrape(str(job.session_id))
    except SieveError as exc:
        # Keep the current status; the next poll tries again.
        job.error = str(exc)
        db.commit()
        db.refresh(job)
        return job

    apply_scrape_response(job, body)
    db.commit()
    db.refresh(job)
    return job


def add_turn(
    db: Session,
    job: ScrapeJob,
    *,
    instruction: str,
    target_urls: list[str] | None = None,
    fields: list[str] | None = None,
    schema: dict[str, Any] | None = None,
    output_schema: dict[str, Any] | None = None,
    table_shape: str | None = None,
    compliance_mode: str | None = None,
    client: SieveClient | None = None,
) -> ScrapeJob:
    """Record a follow-up turn first, then post it to Sieve.

    The turn count baseline is captured before the POST so the polling check can
    later prove the answer is new.
    """
    if job.status in SCRAPE_TERMINAL_STATUSES and job.status != "done":
        raise ScrapeError(
            "invalid_state", "This run refused or failed, so it cannot be followed up."
        )
    if not job.session_id:
        raise ScrapeError("invalid_state", "This run has no Sieve session to follow up.")

    active_client = _require_client(client)

    body = build_scrape_body(
        instruction,
        target_urls=target_urls,
        fields=fields,
        schema=schema,
        output_schema=output_schema,
        table_shape=table_shape,
        compliance_mode=compliance_mode or job.compliance_mode,
    )

    # Record the turn before the request.
    job.awaiting_turn = True
    job.turns_baseline = job.turns_count or 0
    job.last_polled_at = None
    db.commit()

    try:
        active_client.post_message(str(job.session_id), body)
    except SieveError as exc:
        if exc.code == "turn_in_flight":
            # No new turn was created; allow the caller to resend.
            job.awaiting_turn = False
            db.commit()
            raise
        job.awaiting_turn = False
        job.error = str(exc)
        db.commit()
        raise

    job.status = "running"
    job.error = None
    db.commit()
    db.refresh(job)
    return job


def list_jobs(db: Session, profile: StudentProfile) -> list[ScrapeJob]:
    return list(
        db.scalars(
            select(ScrapeJob)
            .where(ScrapeJob.student_id == profile.id)
            .order_by(ScrapeJob.created_at.desc(), ScrapeJob.id.desc())
        )
    )


def get_job(db: Session, profile: StudentProfile, job_id: int) -> ScrapeJob | None:
    job = db.get(ScrapeJob, job_id)
    if job is None or job.student_id != profile.id:
        return None
    return job


def serialize_job(job: ScrapeJob) -> ScrapeJobResponse:
    """Render a job for the API.

    Delivered files are exposed through a local proxy route rather than Sieve's
    own (key-authenticated) URL, so the raw file URL and the fact that it needs
    the Bearer header never leave the server.
    """
    files: list[ScrapeFileOut] = []
    for index, item in enumerate(job.files or []):
        if not isinstance(item, dict):
            continue
        files.append(
            ScrapeFileOut(
                name=str(item.get("name") or ""),
                size=int(item.get("size") or 0),
                ext=str(item.get("ext") or ""),
                download_url=f"{settings.api_prefix}/scrapes/{job.id}/files/{index}",
            )
        )

    poll_after: float | None = None
    if job.status not in SCRAPE_TERMINAL_STATUSES and job.status != SCRAPE_STATUS_ERROR:
        poll_after = next_poll_delay(job.poll_attempts or 0)

    return ScrapeJobResponse(
        id=job.id,
        session_id=job.session_id,
        instruction=job.instruction,
        status=job.status,
        compliance_mode=job.compliance_mode,
        target_urls=list(job.target_urls or []),
        output_schema=job.output_schema,
        table_shape=job.table_shape,
        turns_count=job.turns_count or 0,
        awaiting_turn=bool(job.awaiting_turn),
        summary=job.summary,
        files=files,
        schema_conformance=job.schema_conformance,
        result=job.result,
        refusal=job.refusal,
        error=job.error,
        poll_after_seconds=poll_after,
        last_polled_at=job.last_polled_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )
