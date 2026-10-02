"""Resume upload and analysis schemas.

`storage_path` is deliberately absent from every response model: a resume's
on-disk location is never disclosed to the client.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResumeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_type: str
    file_size_bytes: int
    analysis_status: str
    analysis_error: str | None = None
    skill_count: int
    uploaded_at: datetime


class DetectedSkill(BaseModel):
    """A skill found in the resume, with the evidence behind it."""

    name: str
    slug: str
    category: str
    confidence: float
    occurrences: int
    evidence: str
    # True when the skill is already on the student's profile.
    saved: bool = False


class ResumeAnalysisResponse(BaseModel):
    """Full analysis payload returned after upload / on demand."""

    resume: ResumeSummary
    detected_skills: list[DetectedSkill] = Field(default_factory=list)
    skills_by_category: dict[str, list[str]] = Field(default_factory=dict)
    sections_found: list[str] = Field(default_factory=list)
    section_previews: dict[str, list[str]] = Field(default_factory=dict)
    word_count: int = 0
    warnings: list[str] = Field(default_factory=list)
    # Contact details are only ever returned to the owning student.
    detected_name: str | None = None
    detected_email: str | None = None
    top_opportunities: list[dict] = Field(default_factory=list)


class ResumeUploadResponse(BaseModel):
    """Returned immediately after a successful upload + analysis."""

    message: str
    analysis: ResumeAnalysisResponse
