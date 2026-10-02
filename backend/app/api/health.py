"""Health and readiness endpoints.

- ``/health``        liveness: is the process up? Never touches the database.
- ``/health/ready``  readiness: can we actually serve traffic (database reachable)?
"""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.core.config import settings
from app.database.database import get_db

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
