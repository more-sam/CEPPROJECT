"""Shared response schemas."""

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    """Simple acknowledgement payload."""

    message: str


class PageMeta(BaseModel):
    """Pagination metadata returned alongside list responses."""

    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class PaginatedResponse(BaseModel):
    """Generic paginated envelope."""

    items: list = Field(default_factory=list)
    meta: PageMeta
