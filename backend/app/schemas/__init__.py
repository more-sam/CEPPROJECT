"""Pydantic request/response schemas.

Re-exported here so routers can import from a single place.
"""

from app.schemas.assessment import (
    AssessmentAnswer,
    AssessmentDetail,
    AssessmentHistoryItem,
    AssessmentQuestionPublic,
    AssessmentResultResponse,
    AssessmentSubmitRequest,
    AssessmentSummary,
)
from app.schemas.assistant import (
    AssistantCapabilities,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatSource,
)
from app.schemas.auth import (
    AuthResponse,
    DeleteAccountRequest,
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    UserResponse,
)
from app.schemas.common import MessageResponse, PageMeta, PaginatedResponse
from app.schemas.job import (
    CompanySummary,
    JobDetail,
    JobFilterOptions,
    JobListItem,
    JobRequiredSkill,
)
from app.schemas.match import (
    AnalyzeRequest,
    MatchResponse,
    RecommendationResponse,
    SavedJobResponse,
    SemanticMatchInfo,
    SkillGapItem,
    SkillGapResponse,
)
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
    SkillCatalogueItem,
    StudentSkillBulkUpdateRequest,
    StudentSkillCreateRequest,
    StudentSkillResponse,
    StudentSkillUpdateRequest,
)
from app.schemas.progress import (
    ActivityItem,
    DashboardMetric,
    DashboardResponse,
    ProgressItem,
    ProgressOverview,
    ProgressUpdateRequest,
)
from app.schemas.resume import (
    DetectedSkill,
    ResumeAnalysisResponse,
    ResumeSummary,
    ResumeUploadResponse,
)
from app.schemas.roadmap import (
    RoadmapCreateRequest,
    RoadmapItemResponse,
    RoadmapItemUpdateRequest,
    RoadmapResponse,
)
from app.schemas.scrape import (
    ScrapeCapabilities,
    ScrapeFileOut,
    ScrapeJobResponse,
    ScrapeStartRequest,
)

__all__ = [
    "ActivityItem",
    "AnalyzeRequest",
    "AssessmentAnswer",
    "AssessmentDetail",
    "AssessmentHistoryItem",
    "AssessmentQuestionPublic",
    "AssessmentResultResponse",
    "AssessmentSubmitRequest",
    "AssessmentSummary",
    "AssistantCapabilities",
    "AuthResponse",
    "ChatMessage",
    "ChatRequest",
    "ChatResponse",
    "ChatSource",
    "CompanySummary",
    "DashboardMetric",
    "DashboardResponse",
    "DeleteAccountRequest",
    "DetectedSkill",
    "JobDetail",
    "JobFilterOptions",
    "JobListItem",
    "JobRequiredSkill",
    "LoginRequest",
    "MatchResponse",
    "MessageResponse",
    "PageMeta",
    "PaginatedResponse",
    "PasswordChangeRequest",
    "ProfileResponse",
    "ProfileUpdateRequest",
    "ProgressItem",
    "ProgressOverview",
    "ProgressUpdateRequest",
    "RecommendationResponse",
    "RegisterRequest",
    "ResumeAnalysisResponse",
    "ResumeSummary",
    "ResumeUploadResponse",
    "RoadmapCreateRequest",
    "RoadmapItemResponse",
    "RoadmapItemUpdateRequest",
    "RoadmapResponse",
    "SavedJobResponse",
    "ScrapeCapabilities",
    "ScrapeFileOut",
    "ScrapeJobResponse",
    "ScrapeStartRequest",
    "SemanticMatchInfo",
    "SkillCatalogueItem",
    "SkillGapItem",
    "SkillGapResponse",
    "StudentSkillBulkUpdateRequest",
    "StudentSkillCreateRequest",
    "StudentSkillResponse",
    "StudentSkillUpdateRequest",
    "UserResponse",
]
