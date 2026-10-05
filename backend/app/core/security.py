"""Password hashing, JWT handling and auth-cookie helpers.

Passwords are hashed with bcrypt. The access token is delivered as an httpOnly
cookie (see ADR-013), so the browser JS can never read it.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from fastapi import Response

from app.core.config import settings

# Name of the httpOnly cookie carrying the access token.
AUTH_COOKIE_NAME = "skillbridge_access_token"

# bcrypt only considers the first 72 bytes of input. Anything longer is silently
# ignored by the algorithm, so two different long passwords could authenticate
# the same account. We reject longer input outright instead of truncating.
BCRYPT_MAX_BYTES = 72


class PasswordTooLongError(ValueError):
    """Raised when a password exceeds bcrypt's 72-byte limit."""


def _password_bytes(password: str) -> bytes:
    encoded = password.encode("utf-8")
    if len(encoded) > BCRYPT_MAX_BYTES:
        raise PasswordTooLongError(
            f"Password must be at most {BCRYPT_MAX_BYTES} bytes when UTF-8 encoded."
        )
    return encoded


def hash_password(password: str) -> str:
    """Return a bcrypt hash (salt is generated per call)."""
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time password check. Returns False rather than raising on bad input."""
    try:
        return bcrypt.checkpw(_password_bytes(password), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        # A malformed stored hash or an over-length attempt is simply a failed login.
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed access token whose `sub` claim is the user id."""
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
    """Return the user id from a valid token, or None if it is invalid/expired."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError:
        return None

    subject = payload.get("sub")
    if subject is None:
        return None
    try:
        return int(subject)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------
def set_auth_cookie(response: Response, token: str) -> None:
    """Attach the access token as an httpOnly cookie."""
    # SameSite=None is required when frontend and API are on different domains
    # (e.g. skillbridge-frontend.onrender.com vs skillbridge-api.onrender.com).
    # Lax blocks cross-site requests, which breaks auth on separate subdomains.
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none" if settings.cookie_secure else "lax",
        secure=settings.cookie_secure,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        domain=None,
    )


def clear_auth_cookie(response: Response) -> None:
    """Remove the auth cookie (logout)."""
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        samesite="none" if settings.cookie_secure else "lax",
        secure=settings.cookie_secure,
        path="/",
    )
