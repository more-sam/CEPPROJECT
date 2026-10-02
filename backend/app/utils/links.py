"""
Link-safety helpers (spec §10).

The application must never render or follow an unsafe external URL:
- anything other than http/https
- javascript:, data:, file:, … schemes
- placeholder/example domains

Every URL that leaves the application should pass through these helpers.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

FORBIDDEN_SCHEMES = frozenset(
    {
        "javascript:",
        "data:",
        "file:",
        "vbscript:",
        "about:",
    }
)

PLACEHOLDER_HOSTS = frozenset(
    {
        "example.com",
        "example.org",
        "example.net",
        "example",
        "localhost",
    }
)

# Anything that ends in .example.com is also a placeholder.
PLACEHOLDER_SUFFIX = ".example.com"


def _scheme(url: str) -> str:
    """Return the scheme portion of a URL, lowercased, without the colon."""
    return url.split(":", 1)[0].lower()


def is_safe_external_url(value: Any) -> bool:
    """Return True when `value` is a safe external URL to render as a link.

    Rejects:
        - non-string / empty values
        - non-http schemes
        - placeholder/example domains
        - malformed URLs
    """
    if not isinstance(value, str):
        return False
    trimmed = value.strip()
    if not trimmed:
        return False
    try:
        parsed = _parse_url(trimmed)
    except ValueError:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    host = parsed.host
    if host in PLACEHOLDER_HOSTS:
        return False
    if host.endswith(PLACEHOLDER_SUFFIX):
        return False
    return True


@dataclass(frozen=True)
class _ParsedURL:
    scheme: str
    host: str
    path: str
    query: str
    fragment: str


def _parse_url(raw: str) -> _ParsedURL:
    """Minimal, dependency-free URL parser sufficient for our validation needs.

    We deliberately do not use urllib.parse here for two reasons: it is
    permissive of some degenerate inputs we want to reject, and it is not
    available in all of the environments we might paste this module into. The
    parser only needs to be correct for the subset of URLs we actually render
    (absolute http/https links with an optional path and optional query).
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("not a url")

    remainder = raw

    # Scheme
    if ":" in remainder:
        scheme, after = remainder.split(":", 1)
        if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9+.-]*", scheme):
            raise ValueError("bad scheme")
        scheme = scheme.lower()
        if not after.startswith("//"):
            # A scheme without // is not an absolute http link we want.
            raise ValueError("not an absolute url")
        remainder = after[2:]
    else:
        raise ValueError("no scheme")

    # Authority (host[:port])
    authority_end = _find_authority_end(remainder)
    authority = remainder[:authority_end]
    remainder = remainder[authority_end:]

    if not authority:
        raise ValueError("no host")

    # Strip userinfo if present.
    if "@" in authority:
        _, authority = authority.rsplit("@", 1)

    host = authority
    if ":" in host:
        host, _port = host.rsplit(":", 1)
        if not host or not _port.isdigit():
            raise ValueError("bad host/port")

    if not host or not re.fullmatch(r"[a-zA-Z0-9._-]+", host):
        raise ValueError("bad host")

    # Path
    path_end = _find_fragment_or_query_end(remainder)
    path = remainder[:path_end]
    remainder = remainder[path_end:]

    query, fragment = "", ""
    if remainder.startswith("?"):
        query_end = _find_fragment_or_query_end(remainder[1:])
        query = remainder[1 : 1 + query_end]
        remainder = remainder[1 + query_end :]
    if remainder.startswith("#"):
        fragment = remainder[1:]

    return _ParsedURL(scheme=scheme, host=host, path=path, query=query, fragment=fragment)


def _find_authority_end(s: str) -> int:
    """Return the index just after the authority (before path/?,#)."""
    for i, ch in enumerate(s):
        if ch in ("/", "?", "#"):
            return i
    return len(s)


def _find_fragment_or_query_end(s: str) -> int:
    for i, ch in enumerate(s):
        if ch in ("?", "#"):
            return i
    return len(s)


def favicon_url_from_website(website_url: Any) -> str | None:
    """Return a Google favicon-proxy URL for a company website, or None.

    This is the logo-resolver option #2 (spec §3): we derive a favicon URL from
    the company's public domain so we can show real logos for companies without
    an explicit logo_url in the data.
    """
    if not is_safe_external_url(website_url):
        return None
    parsed = _parse_url(str(website_url).strip())
    domain = parsed.host
    if domain.startswith("www."):
        domain = domain[4:]
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=64"


def company_initials(name: Any) -> str:
    """Up to two initials derived from a company name (e.g. 'Ns' for NimbusStack)."""
    if not isinstance(name, str):
        return "?"
    words = [w for w in name.replace("-", " ").split() if w]
    if not words:
        return "?"
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[-1][0]).upper()


def company_name_from_card(card: Any) -> str:
    """Read a company name out of a canonical opportunity-card payload.

    The card nests the company object (matching GET /api/jobs), so this keeps
    the answer-building code readable and tolerant of both shapes.
    """
    if not isinstance(card, dict):
        return "Unknown company"
    company = card.get("company")
    if isinstance(company, dict):
        return str(company.get("name") or "Unknown company")
    return str(company or "Unknown company")


def open_external_url(url: Any, *, new_tab: bool = True) -> dict[str, Any]:
    """Return a dict describing a safe external link opening, or an error dict.

    This is the Python-side mirror of the frontend check. In practice the link
    is opened by the browser via the `<a>` tag; this helper exists so backend
    code that builds links (emails, redirects, exported CSVs, …) can validate
    them before emitting.
    """
    if not is_safe_external_url(url):
        return {"ok": False, "error": "Invalid or unsafe external URL"}
    parsed = _parse_url(str(url).strip())
    return {
        "ok": True,
        "url": str(url).strip(),
        "scheme": parsed.scheme,
        "host": parsed.host,
        "rel": "noopener noreferrer",
        "target": "_blank" if new_tab else "_self",
    }


def validate_external_urls(items: Iterable[Any]) -> list[dict[str, Any]]:
    """Validate a batch of URL values and report which are safe to render."""
    return [{"value": item, "safe": is_safe_external_url(item)} for item in items]
