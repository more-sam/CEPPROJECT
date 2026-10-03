"""Health, readiness and public statistics endpoints.

- ``/health``        liveness: is the process up? Never touches the database.
- ``/health/ready``  readiness: can we actually serve traffic (database reachable)?
- ``/stats``         public counters for the landing page (no authentication).
"""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.core.config import settings
from app.database.database import get_db
from app.models import Assessment, Company, Job, Skill

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
def health() -> dict[str, str]:
    """Return basic service metadata. Deliberately does not require a database."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": __version__,
        "environment": settings.app_env,
    }


@router.get("/health/ready", summary="Readiness probe (checks database)")
def readiness(response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    """Verify the database answers a trivial query."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded", "database": "unavailable"}
    return {"status": "ok", "database": "connected"}


@router.get("/stats", summary="Public platform statistics")
def stats(response: Response, db: Session = Depends(get_db)) -> dict[str, str | int]:
    """Aggregate public counters (jobs, skills, companies, assessments).

    Read-only and unauthenticated so the marketing landing page can show live
    platform numbers. Returns 503 when the database is unreachable, letting
    callers hide the stats band instead of rendering zeros.
    """
    try:
        counts = {
            "jobs": int(db.scalar(select(func.count()).select_from(Job)) or 0),
            "skills": int(db.scalar(select(func.count()).select_from(Skill)) or 0),
            "companies": int(db.scalar(select(func.count()).select_from(Company)) or 0),
            "assessments": int(
                db.scalar(select(func.count()).select_from(Assessment)) or 0
            ),
        }
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded"}
    return {"status": "ok", **counts}
