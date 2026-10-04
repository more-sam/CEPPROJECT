"""Sieve scrape request and response schemas."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Strict JSON Schema limit from the Sieve contract.
MAX_OUTPUT_SCHEMA_BYTES = 32 * 1024

TableShape = Literal["long", "wide"]
ComplianceMode = Literal["conservative", "regular", "yolo"]


class ScrapeStartRequest(BaseModel):
    """Body for starting a run and for posting a follow-up turn.

    `schema` is exposed under its wire name (the advisory JSON Schema) while the
    Python attribute is `advisory_schema`, which also avoids shadowing Pydantic's
    own deprecated `schema()` helper.
    """

    model_config = ConfigDict(populate_by_name=True)

    instruction: str = Field(min_length=1, max_length=8000)
    target_urls: list[str] = Field(default_factory=list, max_length=25)
    fields: list[str] = Field(default_factory=list, max_length=200)
    advisory_schema: dict[str, Any] | None = Field(default=None, alias="schema")
    output_schema: dict[str, Any] | None = None
    table_shape: TableShape | None = None
    compliance_mode: ComplianceMode = "regular"

    @field_validator("target_urls")
    @classmethod
    def _only_public_http(cls, value: list[str]) -> list[str]:
        for url in value:
            if not url.startswith(("http://", "https://")):
                raise ValueError("target_urls must be public http(s) URLs.")
        return value

    @field_validator("output_schema")
    @classmethod
    def _schema_within_limit(
        cls, value: dict[str, Any] | None
    ) -> dict[str, Any] | None:
        if value is None:
            return value
        encoded = json.dumps(value).encode("utf-8")
        if len(encoded) > MAX_OUTPUT_SCHEMA_BYTES:
            raise ValueError(
                f"output_schema must be at most {MAX_OUTPUT_SCHEMA_BYTES} bytes."
            )
        return value


class ScrapeFileOut(BaseModel):
    """A delivered file, proxied through an ownership-checked download route."""

    name: str
    size: int = 0
    ext: str = ""
    download_url: str


class ScrapeJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str | None = None
    instruction: str
    status: str
    compliance_mode: str = "regular"
    target_urls: list[str] = Field(default_factory=list)
    output_schema: dict[str, Any] | None = None
    table_shape: str | None = None

    turns_count: int = 0
    awaiting_turn: bool = False

    summary: dict[str, Any] | None = None
    files: list[ScrapeFileOut] = Field(default_factory=list)
    schema_conformance: dict[str, Any] | None = None
    result: Any | None = None
    refusal: dict[str, Any] | None = None
    error: str | None = None

    poll_after_seconds: float | None = None
    last_polled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ScrapeCapabilities(BaseModel):
    configured: bool
    note: str
