"""Profile and student-skill endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.schemas.common import MessageResponse
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
    StudentSkillCreateRequest,
    StudentSkillResponse,
    StudentSkillUpdateRequest,
)
from app.services import profile_service

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=ProfileResponse, summary="Get profile")
def get_profile(profile: StudentProfile = Depends(get_current_profile)) -> ProfileResponse:
    return ProfileResponse.model_validate(profile)


@router.put("/profile", response_model=ProfileResponse, summary="Update profile")
def update_profile(
    payload: ProfileUpdateRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    updated = profile_service.update_profile(db, profile, payload)
    return ProfileResponse.model_validate(updated)


@router.get(
    "/profile/skills",
    response_model=list[StudentSkillResponse],
    summary="List the student's skills",
)
def list_skills(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[StudentSkillResponse]:
    rows = profile_service.list_student_skills(db, profile)
    return [StudentSkillResponse.from_orm_skill(row) for row in rows]


@router.post(
    "/profile/skills",
    response_model=StudentSkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a skill manually",
)
def add_skill(
    payload: StudentSkillCreateRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> StudentSkillResponse:
    try:
        row = profile_service.add_student_skill(db, profile, payload)
    except profile_service.ProfileError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc
    return StudentSkillResponse.from_orm_skill(row)


@router.put(
    "/profile/skills",
    response_model=list[StudentSkillResponse],
    summary="Replace the whole skill set",
)
def replace_skills(
    payload: list[StudentSkillCreateRequest],
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[StudentSkillResponse]:
    """Used by the profile editor, where several edits are saved together."""
    try:
        rows = profile_service.replace_student_skills(db, profile, payload)
    except profile_service.ProfileError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc
    return [StudentSkillResponse.from_orm_skill(row) for row in rows]


@router.put(
    "/profile/skills/{student_skill_id}",
    response_model=StudentSkillResponse,
    summary="Update a skill",
)
def update_skill(
    student_skill_id: int,
    payload: StudentSkillUpdateRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> StudentSkillResponse:
    existing = profile_service.list_student_skills(db, profile)
    current = next((row for row in existing if row.id == student_skill_id), None)
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")

    proficiency = payload.proficiency or current.proficiency
    row = profile_service.update_student_skill(
        db,
        profile,
        student_skill_id,
        getattr(proficiency, "value", proficiency),
        "manual",
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")
    return StudentSkillResponse.from_orm_skill(row)


@router.delete(
    "/profile/skills/{student_skill_id}",
    response_model=MessageResponse,
    summary="Remove a skill",
)
def delete_skill(
    student_skill_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Lets a student correct skills the extractor got wrong."""
    if not profile_service.remove_student_skill(db, profile, student_skill_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")
    return MessageResponse(message="Skill removed.")
