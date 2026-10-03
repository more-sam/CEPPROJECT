"""Aggregate every API router behind the configured prefix."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.assessments import router as assessments_router
from app.api.companies import router as companies_router
from app.api.health import router as health_router
from app.api.jobs import router as jobs_router
from app.api.matching import router as matching_router
from app.api.profile import router as profile_router
from app.api.progress import router as progress_router
from app.api.resume import router as resume_router
from app.api.roadmaps import router as roadmaps_router

api_router = APIRouter()

# Health first so it appears at the top of the generated docs.
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(resume_router)
api_router.include_router(jobs_router)
api_router.include_router(companies_router)
api_router.include_router(matching_router)
api_router.include_router(roadmaps_router)
api_router.include_router(assessments_router)
api_router.include_router(progress_router)

__all__ = ["api_router"]
