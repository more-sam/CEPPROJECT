"""Sieve scrape endpoints.

Every route is authenticated and ownership-checked; the Sieve API key never
leaves the server. With `SIEVE_API_KEY` unset the existing endpoints are
untouched and these report "not configured", so no other feature changes.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.schemas.scrape import (
    ScrapeCapabilities,
    ScrapeJobResponse,
    ScrapeStartRequest,
)
from app.services import sieve_service
from app.services.sieve_client import SieveError
from app.services.sieve_service import ScrapeError, serialize_job

router = APIRouter(prefix="/scrapes", tags=["scrapes"])

_NOT_CONFIGURED_NOTE = (
    "Sieve is not configured. Set SIEVE_API_KEY (see .env.example, or run "
    "`python -m app.sieve_login`) to enable scrape runs."
)

# Upstream HTTP status -> the local status we answer with. An upstream 401 is
# deliberately NOT forwarded as 401: that would make the SPA believe the user's
# own session expired and sign them out. It means the Sieve key is bad instead.
_HTTP_BY_CODE: dict[str, int] = {
    "not_configured": status.HTTP_503_SERVICE_UNAVAILABLE,
    "bad_request": status.HTTP_400_BAD_REQUEST,
    "out_of_credits": status.HTTP_402_PAYMENT_REQUIRED,
    "not_found": status.HTTP_404_NOT_FOUND,
    "turn_in_flight": status.HTTP_409_CONFLICT,
    "rate_limited": status.HTTP_429_TOO_MANY_REQUESTS,
}


def _raise_http(exc: SieveError) -> None:
    headers: dict[str, str] | None = None
    if exc.retry_after is not None:
        headers = {"Retry-After": str(int(exc.retry_after))}
    detail = str(exc)
    if exc.code == "unauthorized":
        detail = "The Sieve API key is missing or rejected. Check SIEVE_API_KEY."
    raise HTTPException(
        status_code=_HTTP_BY_CODE.get(exc.code, status.HTTP_502_BAD_GATEWAY),
        detail=detail,
        headers=headers,
    )


def _raise_scrape_error(exc: ScrapeError) -> None:
    code = (
        status.HTTP_409_CONFLICT
        if exc.code == "invalid_state"
        else status.HTTP_502_BAD_GATEWAY
    )
    raise HTTPException(status_code=code, detail=str(exc))


def _owned_job(db: Session, profile: StudentProfile, job_id: int):
    job = sieve_service.get_job(db, profile, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scrape job not found."
        )
    return job


@router.get(
    "/capabilities",
    response_model=ScrapeCapabilities,
    summary="Whether Sieve is configured",
)
def capabilities() -> ScrapeCapabilities:
    configured = sieve_service.configured()
    return ScrapeCapabilities(
        configured=configured,
        note=(
            "Sieve scrape runs are available."
            if configured
            else _NOT_CONFIGURED_NOTE
        ),
    )


@router.get("/credits", summary="Sieve credit balance")
def credits() -> dict:
    if not sieve_service.configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_NOT_CONFIGURED_NOTE,
        )
    try:
        return sieve_service.get_client().get_credits()
    except SieveError as exc:
        _raise_http(exc)


@router.get("", response_model=list[ScrapeJobResponse], summary="List scrape jobs")
def list_scrapes(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[ScrapeJobResponse]:
    return [serialize_job(job) for job in sieve_service.list_jobs(db, profile)]


@router.post(
    "",
    response_model=ScrapeJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a scrape run",
)
def start_scrape(
    payload: ScrapeStartRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ScrapeJobResponse:
    """Start a run. The session id is persisted before the response returns."""
    try:
        job = sieve_service.start_job(
            db,
            profile,
            instruction=payload.instruction,
            target_urls=payload.target_urls,
            fields=payload.fields,
            schema=payload.advisory_schema,
            output_schema=payload.output_schema,
            table_shape=payload.table_shape,
            compliance_mode=payload.compliance_mode,
        )
    except SieveError as exc:
        _raise_http(exc)
    except ScrapeError as exc:
        _raise_scrape_error(exc)
    return serialize_job(job)


@router.get(
    "/{job_id}",
    response_model=ScrapeJobResponse,
    summary="Read a scrape job (advances polling)",
)
def get_scrape(
    job_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ScrapeJobResponse:
    """Return the job, advancing it by at most one Sieve poll."""
    job = _owned_job(db, profile, job_id)
    if job.status not in ("done", "refused"):
        try:
            sieve_service.poll_job(db, job)
        except SieveError as exc:
            _raise_http(exc)
    return serialize_job(job)


@router.post(
    "/{job_id}/messages",
    response_model=ScrapeJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Send a follow-up turn",
)
def send_message(
    job_id: int,
    payload: ScrapeStartRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ScrapeJobResponse:
    job = _owned_job(db, profile, job_id)
    try:
        sieve_service.add_turn(
            db,
            job,
            instruction=payload.instruction,
            target_urls=payload.target_urls,
            fields=payload.fields,
            schema=payload.advisory_schema,
            output_schema=payload.output_schema,
            table_shape=payload.table_shape,
            compliance_mode=payload.compliance_mode,
        )
    except SieveError as exc:
        _raise_http(exc)
    except ScrapeError as exc:
        _raise_scrape_error(exc)
    return serialize_job(job)


@router.get("/{job_id}/files/{file_index}", summary="Download a delivered file")
def download_file(
    job_id: int,
    file_index: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Response:
    job = _owned_job(db, profile, job_id)
    files = job.files or []
    if file_index < 0 or file_index >= len(files):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found."
        )
    entry = files[file_index]
    url = entry.get("url") if isinstance(entry, dict) else None
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File is not available."
        )

    try:
        content, content_type = sieve_service.get_client().download_file(str(url))
    except SieveError as exc:
        _raise_http(exc)

    name = str(entry.get("name") or f"scrape-{job.id}-{file_index}")
    safe_name = name.replace('"', "").replace("\r", "").replace("\n", "")
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )
