"""Progress tracking and dashboard aggregate schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ProgressItem(BaseModel):
    skill_id: int
    skill_name: str
    skill_slug: str
    category: str
    progress_percentage: int
    status: str
    best_assessment_score: float | None = None
    assessments_taken: int = 0
    updated_at: datetime


class ProgressUpdateRequest(BaseModel):
    progress_percentage: int = Field(ge=0, le=100)


class ProgressOverview(BaseModel):
    """Everything the Progress page and its charts need."""

    total_skills: int = 0
    mastered: int = 0
    developing: int = 0
    not_started: int = 0

    roadmap_items_total: int = 0
    roadmap_items_completed: int = 0
    roadmap_progress_percentage: float = 0.0

    assessments_taken: int = 0
    assessments_passed: int = 0
    average_assessment_score: float = 0.0

    total_learning_hours: int = 0
    completed_learning_hours: int = 0

    items: list[ProgressItem] = Field(default_factory=list)
    # Chart-ready series.
    score_history: list[dict] = Field(default_factory=list)
    category_breakdown: list[dict] = Field(default_factory=list)


class ActivityItem(BaseModel):
    kind: str  # resume | assessment | roadmap | saved_job
    title: str
    detail: str = ""
    occurred_at: datetime


class DashboardMetric(BaseModel):
    label: str
    value: float
    suffix: str = ""
    hint: str = ""


class DashboardResponse(BaseModel):
    """Aggregate payload backing the dashboard in a single request."""

    greeting_name: str
    has_profile: bool
    has_resume: bool
    has_skills: bool

    skills_identified: int = 0
    skills_by_category: list[dict] = Field(default_factory=list)
    opportunities_matched: int = 0
    skill_gaps: int = 0
    roadmap_progress_percentage: float = 0.0

    # Average compatibility across the student's recommended opportunities.
    average_compatibility: float = 0.0

    metrics: list[DashboardMetric] = Field(default_factory=list)
    recommendations: list[dict] = Field(default_factory=list)
    skill_constellation: list[dict] = Field(default_factory=list)
    recent_activity: list[ActivityItem] = Field(default_factory=list)
    roadmap_preview: list[dict] = Field(default_factory=list)
    saved_jobs: list[dict] = Field(default_factory=list)
    onboarding_steps: list[dict] = Field(default_factory=list)
