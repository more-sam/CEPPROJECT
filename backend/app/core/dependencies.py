"""Shared FastAPI dependencies: current user, current profile, ownership checks."""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import AUTH_COOKIE_NAME, decode_access_token
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.models.user import User

# Deliberately identical for "no cookie", "bad token" and "unknown user", so the
# response never reveals whether an account exists.
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated. Please sign in.",
)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Resolve the signed-in user from the httpOnly auth cookie."""
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise CREDENTIALS_EXCEPTION

    user_id = decode_access_token(token)
    if user_id is None:
        raise CREDENTIALS_EXCEPTION

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION

    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """Return the signed-in user, or None when anonymous.

    Used by genuinely public endpoints (opportunity browsing) that behave better
    for a signed-in student - they gain compatibility scores - but must not
    require a session.
    """
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        return None

    user_id = decode_access_token(token)
    if user_id is None:
        return None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    return user


def get_optional_profile(
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> StudentProfile | None:
    """Profile for a signed-in student, or None for an anonymous visitor."""
    if user is None:
        return None

    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    if profile is None:
        profile = StudentProfile(
            user_id=user.id, preferred_roles=[], preferred_locations=[]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def get_current_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentProfile:
    """Return the student's profile, creating it on first access.

    Creating lazily avoids a separate onboarding endpoint just to establish the
    row, and keeps every downstream service free of "profile may not exist" checks.
    """
    profile = db.scalar(
        select(StudentProfile).where(StudentProfile.user_id == user.id)
    )
    if profile is None:
        profile = StudentProfile(user_id=user.id, preferred_roles=[], preferred_locations=[])
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def get_owned_resume_or_404(db: Session, resume_id: int, profile: StudentProfile):
    """Load a resume only if it belongs to this student.

    Returning 404 (not 403) for someone else's resume avoids confirming that the
    record exists at all.
    """
    from app.models.resume import Resume

    resume = db.get(Resume, resume_id)
    if resume is None or resume.student_id != profile.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )
    return resume
