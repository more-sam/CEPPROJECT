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
    industry: str | None = None
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
    # Application status: open | closed | expired | unknown. "unknown" is the
    # honest default - a stored row alone does not prove applications are open.
    status: str = "unknown"
    posted_at: datetime | None = None
    expires_at: datetime | None = None
    # Set only when a real source confirmed the listing; NULL for demo rows.
    last_verified_at: datetime | None = None
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


class CompanyRef(BaseModel):
    """Minimal company identity used in filter dropdowns."""

    id: int
    name: str


class CompanyListItem(BaseModel):
    """A company row in the directory / "companies that match" grid."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    location: str | None = None
    industry: str | None = None
    initials: str = ""
    # Counted strictly from stored `status = "open"` rows. Never inferred.
    open_roles: int = 0
    total_roles: int = 0


class CompanyDetail(CompanyListItem):
    """Full company record for the company details page."""


class CompanyDirectoryResponse(BaseModel):
    items: list[CompanyListItem]
    total: int


class JobFilterOptions(BaseModel):
    """Distinct values available for the filter panel."""

    locations: list[str] = Field(default_factory=list)
    employment_types: list[str] = Field(default_factory=list)
    work_types: list[str] = Field(default_factory=list)
    experience_levels: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    # Application statuses actually present (e.g. ["open", "closed"]).
    statuses: list[str] = Field(default_factory=list)
    # Companies that have at least one listing, for the company filter.
    companies: list[CompanyRef] = Field(default_factory=list)
