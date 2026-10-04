"""Thin client for the Sieve scrape API.

This is the only module that knows the Sieve wire format. It reuses the `httpx`
dependency the assistant already uses rather than introducing a second HTTP
client, and it deliberately contains no business logic: status interpretation
and persistence live in `app.services.sieve_service`.

Two rules from the contract are enforced here:

* **`POST /api/scrapes` is never retried.** It has no idempotency key and an
  accepted call spends credits, so a timeout or network error is surfaced to the
  caller rather than re-sent: the first call may have succeeded.
* **Idempotent GETs are retried** on 5xx, 429 and network errors with a bounded
  exponential backoff. Runs take minutes, so polling never has a short timeout.

The class takes an optional `httpx` transport, which is the seam tests use to
record responses at the HTTP boundary while the real logic runs unmodified.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

DEFAULT_BASE_URL = "https://scrape.usesieve.com"

# Status codes the contract names explicitly, mapped to a stable local code and
# whether the call is safe to retry.
_ERROR_CODES: dict[int, tuple[str, bool]] = {
    400: ("bad_request", False),
    401: ("unauthorized", False),
    402: ("out_of_credits", False),
    404: ("not_found", False),
    409: ("turn_in_flight", False),
    429: ("rate_limited", True),
}


class SieveError(RuntimeError):
    """A Sieve call failed.

    `code` is a stable local identifier (never the remote message) so callers map
    errors without parsing prose. `retryable` is True only when the contract says
    a retry cannot have created work: 429 and 5xx.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str = "unknown",
        retryable: bool = False,
        retry_after: float | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.retryable = retryable
        self.retry_after = retry_after


class SieveNotConfigured(SieveError):
    def __init__(self) -> None:
        super().__init__(
            "Sieve is not configured (SIEVE_API_KEY is empty).",
            code="not_configured",
        )


def _safe_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def _retry_after_seconds(response: httpx.Response) -> float | None:
    raw = response.headers.get("Retry-After")
    if raw is None:
        return None
    try:
        return max(0.0, float(raw))
    except ValueError:
        return None


def _error_detail(body: Any) -> str:
    """Extract a short human-readable detail without leaking anything large."""
    if isinstance(body, dict):
        for key in ("error", "detail", "message"):
            value = body.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()[:300]
    return ""


def map_error(
    status_code: int,
    body: Any = None,
    retry_after: float | None = None,
) -> SieveError:
    """Map an HTTP status onto a `SieveError` with a stable local code."""
    if status_code in _ERROR_CODES:
        code, retryable = _ERROR_CODES[status_code]
    elif status_code >= 500:
        code, retryable = "server_error", True
    else:
        code, retryable = "http_error", False

    detail = _error_detail(body)
    message = f"Sieve returned HTTP {status_code}"
    if detail:
        message = f"{message}: {detail}"
    return SieveError(
        message,
        status_code=status_code,
        code=code,
        retryable=retryable,
        retry_after=retry_after,
    )


def normalize_status(value: Any) -> str:
    """Lower-case a status string, or return an empty string when absent."""
    if not isinstance(value, str):
        return ""
    return value.strip().lower()


def build_scrape_body(
    instruction: str,
    *,
    target_urls: list[str] | None = None,
    fields: list[str] | None = None,
    schema: dict[str, Any] | None = None,
    output_schema: dict[str, Any] | None = None,
    table_shape: str | None = None,
    compliance_mode: str | None = None,
) -> dict[str, Any]:
    """Build the JSON body for `POST /api/scrapes` (and follow-up messages).

    Only the fields the caller actually supplied are included. `compliance_mode`
    defaults to `regular`; `yolo` is only ever sent when the caller explicitly
    asks for it.
    """
    body: dict[str, Any] = {"instruction": instruction}
    if target_urls:
        body["target_urls"] = list(target_urls)
    if fields:
        body["fields"] = list(fields)
    if schema is not None:
        body["schema"] = schema
    if output_schema is not None:
        body["output_schema"] = output_schema
    if table_shape:
        body["table_shape"] = table_shape
    if compliance_mode:
        body["compliance_mode"] = compliance_mode
    return body


class SieveClient:
    """A configured client bound to one API key and base URL."""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        retry_attempts: int = 3,
        retry_backoff: float = 1.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.retry_attempts = max(1, retry_attempts)
        self.retry_backoff = max(0.0, retry_backoff)
        self._http = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            transport=transport,
        )

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    def _headers(self, *, json_body: bool) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }
        if json_body:
            headers["Content-Type"] = "application/json"
        return headers

    def absolute_url(self, path: str) -> str:
        """Resolve a (possibly relative) URL returned by Sieve against the base."""
        return str(httpx.URL(self.base_url).join(path))

    def _raise_for_status(self, response: httpx.Response) -> httpx.Response:
        if response.status_code >= 400:
            raise map_error(
                response.status_code,
                _safe_json(response),
                _retry_after_seconds(response),
            )
        return response

    def _get_json(self, path: str) -> Any:
        """GET with a bounded exponential backoff on retryable failures."""
        delay = self.retry_backoff
        last_error: SieveError | None = None
        for attempt in range(self.retry_attempts):
            response: httpx.Response | None = None
            try:
                response = self._http.get(path, headers=self._headers(json_body=False))
            except httpx.HTTPError as exc:  # network / timeout
                last_error = SieveError(
                    f"Network error talking to Sieve: {exc}",
                    code="network_error",
                    retryable=True,
                )
            else:
                if response.status_code < 400:
                    return _safe_json_or_empty(response)
                error = map_error(
                    response.status_code,
                    _safe_json(response),
                    _retry_after_seconds(response),
                )
                if not error.retryable:
                    raise error
                last_error = error
                if error.retry_after is not None:
                    delay = error.retry_after

            if attempt < self.retry_attempts - 1:
                time.sleep(delay)
                delay = max(delay * 2, self.retry_backoff)

        assert last_error is not None  # loop always assigns on failure
        raise last_error

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def start_scrape(self, body: dict[str, Any]) -> dict[str, Any]:
        """POST /api/scrapes. NEVER retried after a timeout or network error."""
        try:
            response = self._http.post(
                "/api/scrapes",
                json=body,
                headers=self._headers(json_body=True),
            )
        except httpx.HTTPError as exc:
            raise SieveError(
                "Sieve did not confirm whether the run started. Not retrying, "
                "because an accepted call spends credits.",
                code="timeout" if isinstance(exc, httpx.TimeoutException) else "network_error",
                retryable=False,
            ) from exc
        self._raise_for_status(response)
        return _safe_json_or_empty(response)

    def get_scrape(self, session_id: str) -> dict[str, Any]:
        """GET /api/scrapes/<id>, retried on 429/5xx/network."""
        return self._get_json(f"/api/scrapes/{session_id}")

    def post_message(self, session_id: str, body: dict[str, Any]) -> dict[str, Any]:
        """POST /api/scrapes/<id>/messages.

        Not auto-retried: a timed-out message may already have created a turn.
        A 409 is surfaced with code `turn_in_flight` for the caller to wait on.
        """
        try:
            response = self._http.post(
                f"/api/scrapes/{session_id}/messages",
                json=body,
                headers=self._headers(json_body=True),
            )
        except httpx.HTTPError as exc:
            raise SieveError(
                "Sieve did not confirm whether the follow-up was recorded. "
                "Not retrying.",
                code="timeout" if isinstance(exc, httpx.TimeoutException) else "network_error",
                retryable=False,
            ) from exc
        self._raise_for_status(response)
        return _safe_json_or_empty(response)

    def get_credits(self) -> dict[str, Any]:
        """GET /api/me/credits (plan, limit, used, remaining)."""
        return self._get_json("/api/me/credits")

    def download_file(self, url: str) -> tuple[bytes, str]:
        """Fetch a delivered file, sending the Bearer header.

        `url` may be relative; it is resolved against the base URL first.
        """
        target = url if url.startswith("http") else self.absolute_url(url)
        try:
            response = self._http.get(target, headers=self._headers(json_body=False))
        except httpx.HTTPError as exc:
            raise SieveError(
                f"Could not download the scraped file: {exc}",
                code="network_error",
                retryable=True,
            ) from exc
        self._raise_for_status(response)
        content_type = response.headers.get("Content-Type") or "application/octet-stream"
        return response.content, content_type


def _safe_json_or_empty(response: httpx.Response) -> dict[str, Any]:
    body = _safe_json(response)
    return body if isinstance(body, dict) else {}


def get_client() -> SieveClient:
    """Build a client from settings. Raises when Sieve is not configured."""
    from app.core.config import settings

    if not settings.sieve_enabled:
        raise SieveNotConfigured()
    return SieveClient(
        api_key=settings.sieve_api_key,
        base_url=settings.sieve_base_url,
        timeout=settings.sieve_request_timeout_seconds,
        retry_attempts=settings.sieve_get_retry_attempts,
        retry_backoff=settings.sieve_get_retry_backoff_seconds,
    )
