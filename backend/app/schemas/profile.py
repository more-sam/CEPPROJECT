"""Student profile and skill-mutation schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import SkillProficiency, SkillSource, WorkType

CURRENT_YEAR_MAX = 2100
CURRENT_YEAR_MIN = 1950


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str | None = None
    college: str | None = None
    degree: str | None = None
    branch: str | None = None
    graduation_year: int | None = None
    preferred_roles: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)
    work_type: str | None = None
    bio: str | None = None
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=150)
    college: str | None = Field(default=None, max_length=200)
    degree: str | None = Field(default=None, max_length=150)
    branch: str | None = Field(default=None, max_length=150)
    graduation_year: int | None = Field(
        default=None, ge=CURRENT_YEAR_MIN, le=CURRENT_YEAR_MAX
    )
    preferred_roles: list[str] | None = None
    preferred_locations: list[str] | None = None
    work_type: WorkType | None = None
    bio: str | None = Field(default=None, max_length=2000)

    @field_validator("preferred_roles", "preferred_locations")
    @classmethod
    def _clean_list(cls, value: list[str] | None) -> list[str] | None:
        """Trim, drop blanks and de-duplicate while preserving order."""
        if value is None:
            return None
        seen: set[str] = set()
        cleaned: list[str] = []
        for item in value:
            text = (item or "").strip()
            if text and text.lower() not in seen:
                seen.add(text.lower())
                cleaned.append(text)
        return cleaned


class StudentSkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill_id: int
    name: str
    slug: str
    category: str
    proficiency: str
    confidence: float
    source: str

    @classmethod
    def from_orm_skill(cls, student_skill) -> "StudentSkillResponse":  # noqa: ANN001
        return cls(
            id=student_skill.id,
            skill_id=student_skill.skill_id,
            name=student_skill.skill.name,
            slug=student_skill.skill.slug,
            category=student_skill.skill.category,
            proficiency=student_skill.proficiency,
            confidence=student_skill.confidence,
            source=student_skill.source,
        )


class StudentSkillCreateRequest(BaseModel):
    """Add a skill manually (e.g. one the extractor missed)."""

    skill_name: str = Field(min_length=1, max_length=120)
    proficiency: SkillProficiency = SkillProficiency.UNKNOWN


class StudentSkillUpdateRequest(BaseModel):
    proficiency: SkillProficiency | None = None


class StudentSkillBulkUpdateRequest(BaseModel):
    """Replace the student's whole skill set - used by the profile editor."""

    skills: list[StudentSkillCreateRequest] = Field(default_factory=list)
    source: SkillSource = SkillSource.MANUAL


class SkillCatalogueItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    category: str
    description: str | None = None
