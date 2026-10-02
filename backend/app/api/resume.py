"""Resume upload, listing and analysis endpoints."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.models.resume import Resume
from app.schemas.common import MessageResponse
from app.schemas.resume import (
    DetectedSkill,
    ResumeAnalysisResponse,
    ResumeSummary,
    ResumeUploadResponse,
)
from app.services import resume_service
from app.services.recommendation_service import job_card_payload, recommend_for_student
from app.services.resume_service import ResumeError

router = APIRouter(prefix="/resumes", tags=["resumes"])


def _build_analysis(
    db: Session,
    profile: StudentProfile,
    resume: Resume,
    detected,
    parsed=None,  # noqa: ANN001
    warnings: list[str] | None = None,
) -> ResumeAnalysisResponse:
    """Shape a resume analysis response, including a small opportunities preview."""
    saved = resume_service.stored_skill_slugs(db, profile)

    ranked, _ = recommend_for_student(db, profile, limit=3)
    top = [job_card_payload(item, set(), semantic=True) for item in ranked]

    return ResumeAnalysisResponse(
        resume=ResumeSummary.model_validate(resume),
        detected_skills=[
            DetectedSkill(
                name=item.name,
                slug=item.slug,
                category=item.category,
                confidence=round(item.confidence, 2),
                occurrences=item.occurrences,
                evidence=item.evidence,
                saved=item.slug in saved,
            )
            for item in detected
        ],
        skills_by_category=resume_service.skills_by_category(detected),
        sections_found=sorted((resume.sections or {}).keys()),
        # Only a short preview per section - enough to show what was detected
        # without returning the whole (personal) document.
        section_previews={
            name: lines[:6] for name, lines in (resume.sections or {}).items()
        },
        word_count=len((resume.extracted_text or "").split()),
        warnings=warnings or [],
        detected_name=parsed.name if parsed else None,
        detected_email=parsed.email if parsed else None,
        top_opportunities=top,
    )


@router.post(
    "",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and analyse a resume",
)
async def upload_resume(
    file: UploadFile = File(...),
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ResumeUploadResponse:
    """Accept a PDF or DOCX, then parse, extract skills and score opportunities."""
    if file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No file was uploaded."
        )

    # Read with a hard ceiling so an oversized upload is rejected before it is
    # buffered entirely in memory.
    limit = resume_service.settings.max_upload_size_bytes
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"That file is larger than the {resume_service.settings.max_upload_size_mb} MB "
                "limit."
            ),
        )

    try:
        resume, parsed, detected = resume_service.analyse_upload(
            db, profile, file.filename, data
        )
    except ResumeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc

    return ResumeUploadResponse(
        message=f"Resume analysed. {len(detected)} skills identified.",
        analysis=_build_analysis(db, profile, resume, detected, parsed, parsed.warnings),
    )


@router.get("", response_model=list[ResumeSummary], summary="List uploaded resumes")
def list_resumes(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[ResumeSummary]:
    return [
        ResumeSummary.model_validate(resume)
        for resume in resume_service.list_resumes(db, profile)
    ]


@router.get("/{resume_id}", response_model=ResumeSummary, summary="Get one resume")
def get_resume(
    resume_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ResumeSummary:
    resume = resume_service.get_resume(db, profile, resume_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    return ResumeSummary.model_validate(resume)


@router.get(
    "/{resume_id}/analysis",
    response_model=ResumeAnalysisResponse,
    summary="Re-read a stored analysis",
)
def get_analysis(
    resume_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> ResumeAnalysisResponse:
    """Return the stored analysis, re-running extraction if the file is gone."""
    resume = resume_service.get_resume(db, profile, resume_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    if resume.analysis_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=resume.analysis_error or "This resume has not been analysed successfully.",
        )

    try:
        detected = resume_service.reanalyse(db, profile, resume)
    except ResumeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc

    return _build_analysis(db, profile, resume, detected)


@router.delete("/{resume_id}", response_model=MessageResponse, summary="Delete a resume")
def delete_resume(
    resume_id: int,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Removes the database row and the file on disk."""
    if not resume_service.delete_resume(db, profile, resume_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    return MessageResponse(message="Resume deleted.")
