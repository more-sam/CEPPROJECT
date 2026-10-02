"""ORM model package.

Every model module is imported here so ``Base.metadata`` is fully populated when
Alembic autogenerates migrations, and so string-based relationship targets on
models imported earlier always resolve.
"""

from app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentResult,
)
from app.models.company import Company
from app.models.job import Job, JobSkill
from app.models.match import JobMatch, SavedJob
from app.models.progress import Progress
from app.models.profile import StudentProfile
from app.models.resume import Resume
from app.models.roadmap import Roadmap, RoadmapItem
from app.models.skill import Skill, StudentSkill
from app.models.user import User

__all__ = [
    "Assessment",
    "AssessmentQuestion",
    "AssessmentResult",
    "Company",
    "Job",
    "JobMatch",
    "JobSkill",
    "Progress",
    "Resume",
    "Roadmap",
    "RoadmapItem",
    "SavedJob",
    "Skill",
    "StudentProfile",
    "StudentSkill",
    "User",
]
