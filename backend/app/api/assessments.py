"""Assessment listing, delivery, submission and history."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_profile
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.schemas.assessment import (
    AssessmentDetail,
    AssessmentHistoryItem,
    AssessmentQuestionPublic,
    AssessmentResultResponse,
    AssessmentSubmitRequest,
    AssessmentSummary,
)
from app.services import assessment_service
from app.services.assessment_service import AssessmentError

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("", response_model=list[AssessmentSummary], summary="List assessments")
def list_assessments(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[AssessmentSummary]:
    payload = assessment_service.list_assessments(db, profile)
    return [
        AssessmentSummary(
            id=entry["assessment"].id,
            title=entry["assessment"].title,
            description=entry["assessment"].description,
            difficulty=entry["assessment"].difficulty,
            question_count=len(entry["assessment"].questions),
            pass_score=entry["assessment"].pass_score,
            skill_id=entry["assessment"].skill_id,
            skill_name=entry["assessment"].skill.name,
            skill_slug=entry["assessment"].skill.slug,
            skill_category=entry["assessment"].skill.category,
            best_score=entry["best_score"],
            attempts=entry["attempts"],
            passed=entry["passed"],
        )
        for entry in payload
    ]


@router.get("/history", response_model=list[AssessmentHistoryItem], summary="Assessment history")
def history(
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[AssessmentHistoryItem]:
    return [
        AssessmentHistoryItem(
            id=result.id,
            assessment_id=result.assessment_id,
            assessment_title=result.assessment.title,
            skill_name=result.assessment.skill.name,
            score=result.score,
            passed=result.passed,
            completed_at=result.completed_at,
        )
        for result in assessment_service.history(db, profile)
    ]


@router.get("/{assessment_id}", response_model=AssessmentDetail, summary="Get an assessment")
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
) -> AssessmentDetail:
    """Questions are served without the answer key."""
    assessment = assessment_service.get_assessment(db, assessment_id)
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="That assessment was not found."
        )

    return AssessmentDetail(
        id=assessment.id,
        title=assessment.title,
        description=assessment.description,
        difficulty=assessment.difficulty,
        pass_score=assessment.pass_score,
        skill_name=assessment.skill.name,
        skill_slug=assessment.skill.slug,
        skills_tested=[assessment.skill.name],
        questions=[
            AssessmentQuestionPublic(**question)
            for question in assessment_service.build_question_payload(assessment)
        ],
    )


@router.post(
    "/{assessment_id}/submit",
    response_model=AssessmentResultResponse,
    summary="Submit an attempt",
)
def submit(
    assessment_id: int,
    payload: AssessmentSubmitRequest,
    profile: StudentProfile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> AssessmentResultResponse:
    """Grade the attempt, store the score, and update skill progress."""
    assessment = assessment_service.get_assessment(db, assessment_id)
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="That assessment was not found."
        )

    answers = {answer.question_id: answer.answer for answer in payload.answers}

    try:
        result, new_skills = assessment_service.grade(db, profile, assessment, answers)
    except AssessmentError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc

    from app.models.progress import Progress
    from sqlalchemy import select

    progress = db.scalar(
        select(Progress).where(
            Progress.student_id == profile.id,
            Progress.skill_id == assessment.skill_id,
        )
    )

    return AssessmentResultResponse(
        id=result.id,
        assessment_id=assessment.id,
        assessment_title=assessment.title,
        skill_name=assessment.skill.name,
        skill_slug=assessment.skill.slug,
        score=result.score,
        correct_count=result.correct_count,
        total_count=result.total_count,
        passed=result.passed,
        pass_score=assessment.pass_score,
        completed_at=result.completed_at,
        review=result.review,
        progress_updated=progress is not None,
        progress_percentage=progress.progress_percentage if progress else 0,
        new_skills_added=new_skills,
    )
