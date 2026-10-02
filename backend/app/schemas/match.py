"""Skill-alignment, skill-gap and saved-opportunity schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.job import JobListItem


class SemanticMatchInfo(BaseModel):
    student_skill: str
    job_skill: str
    similarity: float
    explanation: str


class MatchResponse(BaseModel):
    """Complete, explainable alignment result for one student/opportunity pair."""

    job_id: int
    job_title: str
    company_name: str

    # The headline figure. Exact skill overlap only.
    compatibility_score: float
    weighted_score: float = 0.0
    semantic_score: float = 0.0
    # Ranking aid that folds in the discounted semantic allowance.
    combined_score: float = 0.0

    total_required: int = 0
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    additional_skills: list[str] = Field(default_factory=list)
    semantic_matches: list[SemanticMatchInfo] = Field(default_factory=list)
    skill_breakdown: list[dict] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)

    computed_at: datetime | None = None
    # Repeated on purpose: this value must never be presented as a prediction.
    disclaimer: str = (
        "SkillBridge Compatibility measures how closely your skills align with "
        "this role's requirements. It is not a hiring probability."
    )


class RecommendationResponse(BaseModel):
    items: list[JobListItem] = Field(default_factory=list)
    total: int = 0
    # Human-readable note when nothing could be recommended, so the UI can show
    # a useful empty state instead of a blank grid.
    note: str | None = None


class AnalyzeRequest(BaseModel):
    """Re-score the student against a specific opportunity on demand."""

    job_id: int


class SkillGapItem(BaseModel):
    name: str
    slug: str
    category: str
    importance: str
    # How many of the student's recommended opportunities require this skill.
    opportunities_requiring: int = 0
    why_it_matters: str = ""
    in_roadmap: bool = False


class SkillGapResponse(BaseModel):
    job_id: int | None = None
    job_title: str | None = None
    company_name: str | None = None

    # available = matched and evidenced, developing = in progress, missing = to learn.
    available: list[SkillGapItem] = Field(default_factory=list)
    developing: list[SkillGapItem] = Field(default_factory=list)
    missing: list[SkillGapItem] = Field(default_factory=list)

    compatibility_score: float = 0.0
    total_required: int = 0
    # What the figures were computed against, in words, so the numbers are never
    # presented without their scope. Empty for a single-opportunity gap.
    scope: str = ""
    note: str | None = None


class SavedJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    created_at: datetime
    job: JobListItem | None = None
