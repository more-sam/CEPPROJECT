"""Learning roadmap endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.schemas.roadmap import (
    RoadmapCreateRequest,
    RoadmapItemResponse,
    RoadmapItemUpdateRequest,
    RoadmapResponse,
)
from app.services import job_service, roadmap_service
from app.services.roadmap_service import RoadmapError
from app.services.serializers import roadmap_response

router = APIRouter(prefix="/roadmaps", tags=["roadmaps"])


def _target_title(db: Session, roadmap) -> str | None:  # noqa: ANN001
    if roadmap.target_job_id is None:
        return None
    job = job_service.get_job(db, roadmap.target_job_id)
    return job.title if job else None


@router.get("", response_model=list[RoadmapResponse], summary="List roadmaps")
def list_roadmaps(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[RoadmapResponse]:
    return [
        roadmap_response(roadmap, _target_title(db, roadmap))
        for roadmap in roadmap_service.list_roadmaps(db, profile)
    ]


@router.post(
    "",
    response_model=RoadmapResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a roadmap",
)
def create_roadmap(
    payload: RoadmapCreateRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> RoadmapResponse:
    """Build a prerequisite-ordered roadmap from the student's current gaps."""
    try:
        roadmap = roadmap_service.generate_roadmap(
            db, profile, job_id=payload.job_id, title=payload.title
        )
    except RoadmapError as exc:
        # 409 rather than 400: the request was valid, the student's state has
        # nothing left to plan.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=exc.message
        ) from exc

    return roadmap_response(roadmap, _target_title(db, roadmap))


@router.get("/{roadmap_id}", response_model=RoadmapResponse, summary="Get a roadmap")
def get_roadmap(
    roadmap_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> RoadmapResponse:
    roadmap = roadmap_service.get_roadmap(db, profile, roadmap_id)
    if roadmap is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found.")
    return roadmap_response(roadmap, _target_title(db, roadmap))


@router.put(
    "/{roadmap_id}/items/{item_id}",
    response_model=RoadmapItemResponse,
    summary="Update a roadmap step",
)
def update_item(
    roadmap_id: int,
    item_id: int,
    payload: RoadmapItemUpdateRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> RoadmapItemResponse:
    """Change a step's status; completing one also advances skill progress."""
    roadmap = roadmap_service.get_roadmap(db, profile, roadmap_id)
    if roadmap is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found.")

    item = next((entry for entry in roadmap.items if entry.id == item_id), None)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap step not found."
        )

    try:
        updated, _ = roadmap_service.update_item_status(
            db, profile, item_id, payload.status
        )
    except RoadmapError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=exc.message
        ) from exc

    return RoadmapItemResponse.from_item(updated)


@router.delete("/{roadmap_id}", summary="Delete a roadmap")
def delete_roadmap(
    roadmap_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    roadmap = roadmap_service.get_roadmap(db, profile, roadmap_id)
    if roadmap is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found.")
    db.delete(roadmap)
    db.commit()
    return {"message": "Roadmap deleted."}
