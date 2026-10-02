"""AI Career Assistant schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Prior turns, so follow-up questions like "why?" have context.
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatSource(BaseModel):
    """Evidence the answer was built from, so replies are auditable."""

    label: str
    detail: str = ""


class ChatResponse(BaseModel):
    reply: str
    # "llm" when a provider answered, "local" when deterministic logic did.
    mode: str = "local"
    sources: list[ChatSource] = Field(default_factory=list)
    suggested_prompts: list[str] = Field(default_factory=list)
    created_at: datetime


class AssistantCapabilities(BaseModel):
    llm_enabled: bool
    provider: str
    model: str | None = None
    note: str
    suggested_prompts: list[str] = Field(default_factory=list)
