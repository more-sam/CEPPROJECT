"""Assessment delivery and grading.

Grading compares the submitted option text against the stored correct answer, so
the answer key is never sent to the client before submission.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.assessment import Assessment, AssessmentQuestion, AssessmentResult
from app.models.profile import StudentProfile
from app.models.skill import Skill
from app.services.progress_service import record_assessment


class AssessmentError(Exception):
    """Assessment lookup or submission problem."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def list_assessments(db: Session, profile: StudentProfile | None = None) -> list[dict]:
    """All assessments with the student's attempt history folded in."""
    assessments = list(
        db.scalars(
            select(Assessment)
            .options(
                selectinload(Assessment.skill),
                selectinload(Assessment.questions),
            )
            .join(Skill, Assessment.skill_id == Skill.id)
            .order_by(Skill.name)
        )
    )

    attempts: dict[int, list[AssessmentResult]] = {}
    if profile is not None:
        results = db.scalars(
            select(AssessmentResult).where(AssessmentResult.student_id == profile.id)
        ).all()
        for result in results:
            attempts.setdefault(result.assessment_id, []).append(result)

    payload: list[dict] = []
    for assessment in assessments:
        history = attempts.get(assessment.id, [])
        best = max((result.score for result in history), default=None)
        payload.append(
            {
                "assessment": assessment,
                "best_score": best,
                "attempts": len(history),
                "passed": any(result.passed for result in history),
            }
        )
    return payload


def get_assessment(db: Session, assessment_id: int) -> Assessment | None:
    return db.scalar(
        select(Assessment)
        .options(
            selectinload(Assessment.skill),
            selectinload(Assessment.questions),
        )
        .where(Assessment.id == assessment_id)
    )


def grade(
    db: Session,
    profile: StudentProfile,
    assessment: Assessment,
    submitted: dict[int, str],
) -> tuple[AssessmentResult, list[str]]:
    """Grade an attempt, persist it, and update the student's progress.

    Args:
        submitted: question_id -> chosen option text.

    Returns:
        (result, newly_added_skill_names)
    """
    if not assessment.questions:
        raise AssessmentError("This assessment has no questions yet.")

    correct_count = 0
    review: list[dict] = []

    for question in assessment.questions:
        given = (submitted.get(question.id) or "").strip()
        is_correct = given.lower() == question.correct_answer.strip().lower()
        if is_correct:
            correct_count += 1

        review.append(
            {
                "question_id": question.id,
                "question": question.question,
                "given": given,
                "correct": question.correct_answer,
                "is_correct": is_correct,
                "explanation": question.explanation,
            }
        )

    total = len(assessment.questions)
    score = round(correct_count / total * 100, 2) if total else 0.0
    passed = score >= assessment.pass_score

    result = AssessmentResult(
        student_id=profile.id,
        assessment_id=assessment.id,
        score=score,
        correct_count=correct_count,
        total_count=total,
        passed=passed,
        review=review,
    )
    db.add(result)
    db.flush()

    new_skills = _skills_added_by_pass(db, profile, assessment.skill)
    record_assessment(db, profile, assessment.skill_id, score, passed)

    db.commit()
    db.refresh(result)
    return result, new_skills


def _skills_added_by_pass(db: Session, profile: StudentProfile, skill) -> list[str]:  # noqa: ANN001
    """Names of skills newly attached to the profile as a result of this attempt."""
    from app.models.skill import StudentSkill

    existing = db.scalar(
        select(StudentSkill).where(
            StudentSkill.student_id == profile.id,
            StudentSkill.skill_id == skill.id,
        )
    )
    return [] if existing is not None else [skill.name]


def history(db: Session, profile: StudentProfile, limit: int = 50) -> list[AssessmentResult]:
    return list(
        db.scalars(
            select(AssessmentResult)
            .options(
                selectinload(AssessmentResult.assessment).selectinload(Assessment.skill)
            )
            .where(AssessmentResult.student_id == profile.id)
            .order_by(AssessmentResult.completed_at.desc())
            .limit(limit)
        )
    )


def available_skill_slugs(db: Session) -> set[str]:
    """Skills that currently have an assessment, used to guide the roadmap UI."""
    rows = db.execute(select(Skill.slug).join(Assessment, Assessment.skill_id == Skill.id))
    return {slug for (slug,) in rows}


def build_question_payload(assessment: Assessment) -> list[dict]:
    """Question objects safe to send to the client (no answer key)."""
    return [
        {
            "id": question.id,
            "question": question.question,
            "options": list(question.options or []),
            "order_index": question.order_index,
        }
        for question in assessment.questions
    ]


def question_by_id(assessment: Assessment, question_id: int) -> AssessmentQuestion | None:
    for question in assessment.questions:
        if question.id == question_id:
            return question
    return None
