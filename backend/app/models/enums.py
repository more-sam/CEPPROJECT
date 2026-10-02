"""Allowed values for the string columns used across the schema.

These are plain string enums rather than native PostgreSQL enum types: adding a
new value to a native enum requires a migration, whereas a VARCHAR column with
Pydantic validation on the API boundary can be extended freely.
"""

from enum import StrEnum


class EmploymentType(StrEnum):
    INTERNSHIP = "internship"
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"


class WorkType(StrEnum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class ExperienceLevel(StrEnum):
    INTERN = "intern"
    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"


class AnalysisStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SkillProficiency(StrEnum):
    """Self-reported level.

    `UNKNOWN` is the honest default: the system extracts that a skill appears on
    a resume but cannot infer how well the student actually knows it.
    """

    UNKNOWN = "unknown"
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class SkillSource(StrEnum):
    RESUME = "resume"
    MANUAL = "manual"
    ASSESSMENT = "assessment"
    ROADMAP = "roadmap"


class SkillImportance(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RoadmapItemStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Difficulty(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class SkillRelation(StrEnum):
    """How a skill matched against a requirement."""

    EXACT = "exact"
    SEMANTIC = "semantic"
    MISSING = "missing"
