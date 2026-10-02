"""Assessment schemas.

Note the deliberate asymmetry: `AssessmentQuestionPublic` never includes
`correct_answer` or `explanation`. Answers are only revealed in the result of a
submitted attempt.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AssessmentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    difficulty: str
    question_count: int = 0
    pass_score: int = 60
    skill_id: int
    skill_name: str
    skill_slug: str
    skill_category: str
    # The student's best previous score, for the "retake" state.
    best_score: float | None = None
    attempts: int = 0
    passed: bool = False


class AssessmentQuestionPublic(BaseModel):
    """A question as shown while taking the test - no answer key."""

    id: int
    question: str
    options: list[str] = Field(default_factory=list)
    order_index: int


class AssessmentDetail(BaseModel):
    id: int
    title: str
    description: str | None = None
    difficulty: str
    pass_score: int
    skill_name: str
    skill_slug: str
    skills_tested: list[str] = Field(default_factory=list)
    questions: list[AssessmentQuestionPublic] = Field(default_factory=list)


class AssessmentAnswer(BaseModel):
    question_id: int
    answer: str = Field(max_length=500)


class AssessmentSubmitRequest(BaseModel):
    answers: list[AssessmentAnswer] = Field(default_factory=list)


class AssessmentReviewItem(BaseModel):
    question_id: int
    question: str
    given: str = ""
    correct: str
    is_correct: bool
    explanation: str = ""


class AssessmentResultResponse(BaseModel):
    id: int
    assessment_id: int
    assessment_title: str
    skill_name: str
    skill_slug: str
    score: float
    correct_count: int
    total_count: int
    passed: bool
    pass_score: int = 60
    completed_at: datetime
    review: list[AssessmentReviewItem] = Field(default_factory=list)
    # What the submission changed on the student's profile.
    progress_updated: bool = False
    progress_percentage: int = 0
    new_skills_added: list[str] = Field(default_factory=list)


class AssessmentHistoryItem(BaseModel):
    id: int
    assessment_id: int
    assessment_title: str
    skill_name: str
    score: float
    passed: bool
    completed_at: datetime
