"""Opportunity (job) schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    location: str | None = None
    initials: str = ""


class JobRequiredSkill(BaseModel):
    name: str
    slug: str
    category: str
    importance: str


class JobListItem(BaseModel):
    """Compact card payload for the opportunities grid."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    location: str
    employment_type: str
    work_type: str
    experience_level: str
    source: str
    posted_at: datetime | None = None
    company: CompanySummary
    required_skills: list[JobRequiredSkill] = Field(default_factory=list)
    application_url: str = ""

    # Null when the student has no skills yet, or when match data was not requested.
    compatibility_score: float | None = None
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    semantic_matches: list[dict] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    is_saved: bool = False


class JobDetail(JobListItem):
    description: str
    application_url: str
    requirements_text: str | None = None
    skill_breakdown: list[dict] = Field(default_factory=list)
    weighted_score: float | None = None
    semantic_score: float | None = None


class JobFilterOptions(BaseModel):
    """Distinct values available for the filter panel."""

    locations: list[str] = Field(default_factory=list)
    employment_types: list[str] = Field(default_factory=list)
    work_types: list[str] = Field(default_factory=list)
    experience_levels: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
