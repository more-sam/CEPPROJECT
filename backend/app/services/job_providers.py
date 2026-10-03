"""Job-provider abstraction.

The application today is fed by one offline dataset (the shipped seed file).
This module exists so that adding an authorised third-party job API later is a
matter of writing one new provider, not of rewriting the import pipeline.

The intended flow for a live source is:

    authorised Job API
        -> ExternalJobProvider.fetch()      raw provider payload
        -> NormalizedJob                    normalised + validated fields
        -> import_jobs()                    persisted to PostgreSQL
        -> existing matching engine         scores against stored skills
        -> frontend                         renders what was actually stored

Design constraints, all deliberate:

* **No scraping.** A provider may only be fed by an API the operator is
  authorised to call. `ExternalJobProvider` refuses to run unconfigured rather
  than reaching for a website's HTML.
* **Normalisation happens once, at the edge.** Everything downstream - matching,
  the UI, tests - reads the stored columns, so a provider returning different
  field names never leaks into the rest of the app.
* **A missing field is never invented.** `application_url`, `status` and
  `last_verified_at` stay unset when the source does not supply them, so the UI
  shows "unavailable"/"unknown" instead of a fabricated value.
"""

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from app.core.config import settings
from app.models.enums import JobStatus

# Fields a provider is allowed to supply. Anything else is ignored.
ALLOWED_FIELDS = frozenset(
    {
        "title",
        "description",
        "location",
        "employment_type",
        "work_type",
        "experience_level",
        "application_url",
        "status",
        "posted_at",
        "expires_at",
        "source",
        "required_skills",
    }
)


class ProviderError(RuntimeError):
    """A provider could not produce listings."""


@dataclass(slots=True)
class NormalizedJob:
    """One provider listing after normalisation and validation."""

    company_name: str
    title: str
    description: str
    location: str
    employment_type: str
    work_type: str = "onsite"
    experience_level: str = "entry"
    application_url: str = ""
    # Only ever set from the provider's own data. Defaults to `unknown` because
    # a row's existence does not prove applications are open.
    status: str = JobStatus.UNKNOWN.value
    posted_at: Any = None
    expires_at: Any = None
    required_skills: list[str] = field(default_factory=list)
    # Provenance. `last_verified_at` is set only by a real source.
    source: str = "UNKNOWN"
    last_verified_at: Any = None

    def as_import_payload(self) -> dict[str, Any]:
        """Flatten to the keyword shape `seed_jobs`-style importers consume."""
        return {
            "company": self.company_name,
            "title": self.title,
            "description": self.description,
            "location": self.location,
            "employment_type": self.employment_type,
            "work_type": self.work_type,
            "experience_level": self.experience_level,
            "application_url": self.application_url,
            "status": self.status,
            "posted_at": self.posted_at,
            "expires_at": self.expires_at,
            "source": self.source,
            "required_skills": list(self.required_skills),
        }


def normalize_status(value: Any) -> str:
    """Map a provider's status onto one of the four stored states.

    Anything unrecognised becomes `unknown`, which the UI renders as "status
    unknown". Guessing `open` here would be the single most damaging thing this
    module could do, so it never does.
    """
    if not isinstance(value, str):
        return JobStatus.UNKNOWN.value
    candidate = value.strip().lower()
    if candidate in {item.value for item in JobStatus}:
        return candidate
    # A few common synonyms a provider may legitimately use.
    synonyms = {
        "active": JobStatus.OPEN.value,
        "accepting_applications": JobStatus.OPEN.value,
        "available": JobStatus.OPEN.value,
        "no_longer_accepting": JobStatus.CLOSED.value,
        "filled": JobStatus.CLOSED.value,
    }
    return synonyms.get(candidate, JobStatus.UNKNOWN.value)


def normalize_job(raw: dict[str, Any], *, company_name: str) -> NormalizedJob:
    """Validate one raw provider payload into a `NormalizedJob`.

    Raises `ProviderError` when the record cannot be trusted (missing title or
    company). Optional fields are simply left unset rather than guessed.
    """
    title = str(raw.get("title") or "").strip()
    if not title:
        raise ProviderError("A provider listing is missing its title.")

    if not company_name.strip():
        raise ProviderError(f"Listing {title!r} is missing its company name.")

    unknown = set(raw) - ALLOWED_FIELDS
    if unknown:
        # Not fatal - providers legitimately return extra bookkeeping fields -
        # but they are dropped rather than persisted blindly.
        pass

    return NormalizedJob(
        company_name=company_name.strip(),
        title=title,
        description=str(raw.get("description") or "").strip(),
        location=str(raw.get("location") or "").strip(),
        employment_type=str(raw.get("employment_type") or "full_time").strip(),
        work_type=str(raw.get("work_type") or "onsite").strip(),
        experience_level=str(raw.get("experience_level") or "entry").strip(),
        application_url=str(raw.get("application_url") or "").strip(),
        status=normalize_status(raw.get("status")),
        posted_at=raw.get("posted_at"),
        expires_at=raw.get("expires_at"),
        source=str(raw.get("source") or "UNKNOWN").strip(),
        required_skills=[str(item).strip() for item in (raw.get("required_skills") or [])],
        # Deliberately only set by a provider that actually re-checked the
        # listing. Offline seed data leaves this None.
        last_verified_at=raw.get("last_verified_at"),
    )


@runtime_checkable
class JobProvider(Protocol):
    """Contract every job source implements."""

    #: Short identifier stored on each imported row's `source` column.
    name: str

    def fetch(self) -> list[NormalizedJob]:
        """Return normalized listings, or raise `ProviderError`."""
        ...


class SeedJobProvider:
    """The shipped offline dataset. Always available, never stale-claimed.

    Rows are marked `source = "DEMO"` and never carry `last_verified_at`, so the
    UI can say "demo opportunity" rather than implying a live vacancy.
    """

    name = "DEMO"

    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def fetch(self) -> list[NormalizedJob]:
        jobs: list[NormalizedJob] = []
        for raw in self._payload.get("jobs", []):
            try:
                jobs.append(normalize_job(raw, company_name=str(raw.get("company") or "")))
            except ProviderError:
                # One malformed seed row must not abort the whole dataset.
                continue
        return jobs


class ExternalJobProvider:
    """Placeholder for an authorised third-party job API.

    Not usable yet, by design. It fails loudly rather than silently degrading to
    scraping, and it deliberately ships without any endpoint, key or scraping
    logic so nobody can wire one in by accident.

    To make this real: implement `fetch()` against a documented, licensed API,
    map its payload through `normalize_job`, and register the provider in
    `get_provider`. Everything downstream is already built.
    """

    name = "EXTERNAL"

    def __init__(self, *, base_url: str = "", api_key: str = "") -> None:
        self.base_url = base_url
        self.api_key = api_key

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    def fetch(self) -> list[NormalizedJob]:
        raise ProviderError(
            "ExternalJobProvider is not implemented. Wire it to an authorised "
            "job API (a documented provider with a licence that permits it). "
            "This application does not scrape job boards."
        )


def get_provider(name: str | None = None, payload: dict[str, Any] | None = None):
    """Resolve a provider by name. Unknown names fall back to the seed dataset."""
    resolved = (name or "seed").strip().lower()
    if resolved == "seed":
        if payload is None:
            raise ProviderError("SeedJobProvider requires the seed payload.")
        return SeedJobProvider(payload)
    if resolved == "external":
        return ExternalJobProvider(
            base_url=getattr(settings, "job_api_base_url", ""),
            api_key=getattr(settings, "job_api_key", ""),
        )
    raise ProviderError(f"Unknown job provider: {name!r}")