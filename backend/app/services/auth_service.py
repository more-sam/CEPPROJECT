"""Authentication business logic: registration, login, password change, deletion."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    PasswordTooLongError,
    hash_password,
    verify_password,
)
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.auth import RegisterRequest


class AuthError(Exception):
    """Authentication or registration failure with a student-safe message."""

    def __init__(self, message: str, *, conflict: bool = False) -> None:
        super().__init__(message)
        self.message = message
        self.conflict = conflict


def _normalise_email(email: str) -> str:
    """Lower-case and trim so 'A@x.com' and 'a@x.com' are the same account."""
    return email.strip().lower()


def register_user(db: Session, payload: RegisterRequest) -> User:
    """Create a user, or raise AuthError if the email is already taken."""
    email = _normalise_email(payload.email)

    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise AuthError("An account with that email already exists.", conflict=True)

    try:
        password_hash = hash_password(payload.password)
    except PasswordTooLongError as exc:
        raise AuthError(str(exc)) from exc

    user = User(email=email, password_hash=password_hash)
    db.add(user)
    db.flush()  # assign user.id before creating the profile

    # Create the profile immediately so onboarding has something to update.
    db.add(
        StudentProfile(
            user_id=user.id,
            full_name=(payload.full_name or "").strip() or None,
            preferred_roles=[],
            preferred_locations=[],
        )
    )
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Verify credentials. Raises AuthError with a deliberately vague message."""
    normalised = _normalise_email(email)
    user = db.scalar(select(User).where(User.email == normalised))

    # One generic failure message for both "no such user" and "wrong password",
    # so the endpoint cannot be used to enumerate accounts.
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError("Incorrect email or password.")

    if not user.is_active:
        raise AuthError("This account has been deactivated.")

    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    """Rotate the password after verifying the current one."""
    if not verify_password(current_password, user.password_hash):
        raise AuthError("Your current password is incorrect.")

    if current_password == new_password:
        raise AuthError("Your new password must differ from the current one.")

    try:
        user.password_hash = hash_password(new_password)
    except PasswordTooLongError as exc:
        raise AuthError(str(exc)) from exc

    db.add(user)
    db.commit()


def delete_account(db: Session, user: User, password: str) -> None:
    """Permanently delete the account and every dependent record.

    Database-level ON DELETE CASCADE removes profiles, resumes, skills, matches,
    roadmaps, assessment results and progress with the user row.
    """
    if not verify_password(password, user.password_hash):
        raise AuthError("Password is incorrect, so the account was not deleted.")

    db.delete(user)
    db.commit()
