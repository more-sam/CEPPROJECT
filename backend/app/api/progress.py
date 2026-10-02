"""Progress tracking, dashboard aggregate and AI assistant endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile, get_current_user
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.models.skill import Skill
from app.models.user import User
from app.schemas.assistant import (
    AssistantCapabilities,
    ChatRequest,
    ChatResponse,
)
from app.schemas.progress import (
    DashboardResponse,
    ProgressItem,
    ProgressOverview,
    ProgressUpdateRequest,
)
from app.services import assistant_service, dashboard_service, progress_service

router = APIRouter(tags=["progress"])


@router.get("/progress", response_model=ProgressOverview, summary="Progress overview")
def get_progress(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ProgressOverview:
    """Aggregate counts plus chart-ready series for the Progress page."""
    data = progress_service.overview(db, profile)
    items = [
        ProgressItem(
            skill_id=row.skill_id,
            skill_name=row.skill.name,
            skill_slug=row.skill.slug,
            category=row.skill.category,
            progress_percentage=row.progress_percentage,
            status=row.status,
            best_assessment_score=row.best_assessment_score,
            assessments_taken=row.assessments_taken,
            updated_at=row.updated_at,
        )
        for row in progress_service.list_progress(db, profile)
    ]
    return ProgressOverview(**data, items=items)


@router.put(
    "/progress/{skill_id}",
    response_model=ProgressItem,
    summary="Set a skill's progress",
)
def update_progress(
    skill_id: int,
    payload: ProgressUpdateRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ProgressItem:
    skill = db.scalar(select(Skill).where(Skill.id == skill_id))
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")

    row = progress_service.set_progress(db, profile, skill_id, payload.progress_percentage)
    return ProgressItem(
        skill_id=row.skill_id,
        skill_name=skill.name,
        skill_slug=skill.slug,
        category=skill.category,
        progress_percentage=row.progress_percentage,
        status=row.status,
        best_assessment_score=row.best_assessment_score,
        assessments_taken=row.assessments_taken,
        updated_at=row.updated_at,
    )


@router.get("/dashboard", response_model=DashboardResponse, summary="Dashboard summary")
def get_dashboard(
    user: User = Depends(get_current_user),
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    """Single call backing the whole dashboard."""
    return DashboardResponse(**dashboard_service.build_dashboard(db, profile, user.email))


@router.get(
    "/assistant/capabilities",
    response_model=AssistantCapabilities,
    summary="Assistant capabilities",
)
def assistant_capabilities() -> AssistantCapabilities:
    """Report honestly whether an LLM is configured."""
    return AssistantCapabilities(**assistant_service.capabilities())


@router.post("/assistant/chat", response_model=ChatResponse, summary="Ask the assistant")
def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """Answer using the student's own stored data as grounding context."""
    return assistant_service.answer(
        db, profile, user.email, payload.message, payload.history
    )
