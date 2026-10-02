"""Authentication request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# bcrypt ignores everything past 72 bytes, so the limit is enforced here as well
# as in core/security.py. Two different long passwords must never collide.
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=150)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_active: bool
    created_at: datetime


class AuthResponse(BaseModel):
    """Returned by register/login. The token itself lives in an httpOnly cookie."""

    message: str
    user: UserResponse
    has_profile: bool


class SessionResponse(BaseModel):
    """Always-200 session probe, used by the SPA to bootstrap auth state.

    The frontend must discover whether a visitor is signed in on every page
    load, anonymous ones included. Answering that with a 401 made every public
    page log a red console error, so this endpoint reports the same information
    as a successful response while `GET /auth/me` keeps its strict 401 semantics
    for programmatic callers.
    """

    authenticated: bool
    user: UserResponse | None = None
    has_profile: bool = False


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
    new_password: str = Field(
        min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH
    )


class DeleteAccountRequest(BaseModel):
    """Require the password before an irreversible delete."""

    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
