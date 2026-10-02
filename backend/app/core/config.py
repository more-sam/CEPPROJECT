"""Application settings, loaded from environment variables (and `.env` if present).

Nothing here is secret-by-default: every sensitive value must come from the
environment, and `.env.example` documents the placeholders.
"""

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# backend/app/core/config.py -> backend/
BACKEND_ROOT = Path(__file__).resolve().parents[2]
# backend/ -> repository root
REPO_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    # One .env lives at the repository root so that docker-compose and the API
    # never disagree. A backend/.env file, if present, overrides it for local runs.
    # Missing files are ignored, and real environment variables always win.
    # (Inside Docker the WORKDIR is /app, so "../.env" simply does not exist and
    # compose injects the variables instead.)
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------- Application ----------
    app_name: str = "SkillBridge AI"
    app_env: Literal["development", "test", "production"] = "development"
    debug: bool = True
    api_prefix: str = "/api"

    # ---------- Authentication ----------
    jwt_secret: str = "insecure-development-only-key-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    # Set true in production so the cookie is only sent over HTTPS.
    cookie_secure: bool = False

    # ---------- Demo / seed account ----------
    # NOTE: a `.local` address cannot be used here. email-validator correctly
    # rejects reserved/special-use TLDs, so the demo account failed to log in even
    # though the seeder could create it (seeding writes to the database directly
    # and never passes through Pydantic). See ADR-015.
    seed_demo_user: bool = True
    demo_user_email: str = "demo@skillbridge.dev"
    demo_user_password: str = "DemoPassword123!"

    # ---------- Database ----------
    database_url: str = (
        "postgresql+psycopg://skillbridge:skillbridge@localhost:5433/skillbridge"
    )

    # ---------- CORS ----------
    # NoDecode stops pydantic-settings from JSON-parsing this value first, so the
    # validator below receives the raw comma-separated string from the env file.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # ---------- File uploads ----------
    data_dir: str = "/data"
    upload_dir: str = "/data/uploads"
    max_upload_size_mb: int = 5
    allowed_resume_extensions: Annotated[list[str], NoDecode] = [".pdf", ".docx"]

    # ---------- AI / NLP ----------
    enable_semantic_matching: bool = True
    # Calibrated by measuring the cosine distribution over all 6,903 skill pairs
    # in the shipped taxonomy (median 0.023, p95 0.179, p97 0.251, p99 0.418) and
    # then manually reviewing the pairs near the cut-off. At 0.25 the top ~3% of
    # pairs qualify, and spot-checks in that band are all genuinely related
    # (unit-testing/selenium, express/rest-apis, machine-learning/nlp).
    # Raise it for precision, lower it for recall.
    semantic_threshold: float = 0.25

    # ---------- Optional LLM provider ----------
    # "none" keeps the assistant fully deterministic and offline.
    ai_provider: Literal["none", "openai", "openai-compatible"] = "none"
    ai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    ai_base_url: str = ""

    @field_validator("cors_origins", "allowed_resume_extensions", mode="before")
    @classmethod
    def _split_comma_separated(cls, value: object) -> object:
        """Accept either a JSON list or a comma-separated string from the env."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    # ------------------------------------------------------------------
    # Derived / helper values
    # ------------------------------------------------------------------
    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def llm_enabled(self) -> bool:
        """True only when a provider AND a key are configured."""
        return self.ai_provider != "none" and bool(self.ai_api_key.strip())

    def data_path(self, *parts: str) -> Path:
        """Resolve a file inside the shared data directory.

        Candidate roots are tried in order, which lets the same code work in
        three situations:
          1. `DATA_DIR` - the container mount, or an explicit override.
          2. `<repo>/data` - running uvicorn directly on the host.
          3. `backend/data` - a self-contained backend checkout.

        Raises FileNotFoundError listing every candidate, so a missing data file
        is immediately obvious instead of a confusing downstream error.
        """
        candidates = [
            Path(self.data_dir).joinpath(*parts),
            REPO_ROOT / "data" / Path(*parts),
            BACKEND_ROOT / "data" / Path(*parts),
        ]
        for candidate in candidates:
            if candidate.is_file():
                return candidate

        tried = "\n  ".join(str(path) for path in candidates)
        raise FileNotFoundError(
            f"Could not locate data file '{'/'.join(parts)}'. Tried:\n  {tried}"
        )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read the environment once)."""
    return Settings()


settings = get_settings()
