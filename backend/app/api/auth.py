"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_optional_user
from app.core.security import create_access_token, clear_auth_cookie, set_auth_cookie
from app.database.database import get_db
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    DeleteAccountRequest,
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    SessionResponse,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services import auth_service
from app.services.auth_service import AuthError

router = APIRouter(prefix="/auth", tags=["auth"])


def _has_profile(db: Session, user_id: int) -> bool:
    return (
        db.scalar(select(StudentProfile.id).where(StudentProfile.user_id == user_id))
        is not None
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Create the account and sign the student in immediately."""
    try:
        user = auth_service.register_user(db, payload)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT if exc.conflict else status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    set_auth_cookie(response, create_access_token(user.id))
    return AuthResponse(
        message="Account created.",
        user=UserResponse.model_validate(user),
        has_profile=True,
    )


@router.post("/login", response_model=AuthResponse, summary="Sign in")
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    try:
        user = auth_service.authenticate_user(db, payload.email, payload.password)
    except AuthError as exc:
        # 401 with a generic message - never reveals whether the email exists.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message
        ) from exc

    set_auth_cookie(response, create_access_token(user.id))
    return AuthResponse(
        message="Signed in.",
        user=UserResponse.model_validate(user),
        has_profile=_has_profile(db, user.id),
    )


@router.post("/logout", response_model=MessageResponse, summary="Sign out")
def logout(response: Response) -> MessageResponse:
    """Clear the auth cookie. Works without a valid session, by design."""
    clear_auth_cookie(response)
    return MessageResponse(message="Signed out.")


@router.get("/me", response_model=AuthResponse, summary="Current user")
def me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Return the signed-in user.

    The frontend calls this on startup to discover its auth state, since an
    httpOnly cookie cannot be read from JavaScript.
    """
    return AuthResponse(
        message="Authenticated.",
        user=UserResponse.model_validate(user),
        has_profile=_has_profile(db, user.id),
    )


@router.get(
    "/session", response_model=SessionResponse, summary="Session probe (never 401s)"
)
def session(
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    """Report the current session without failing for anonymous visitors."""
    if user is None:
        return SessionResponse(authenticated=False)
    return SessionResponse(
        authenticated=True,
        user=UserResponse.model_validate(user),
        has_profile=_has_profile(db, user.id),
    )


@router.post("/password", response_model=MessageResponse, summary="Change password")
def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    try:
        auth_service.change_password(db, user, payload.current_password, payload.new_password)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc
    return MessageResponse(message="Password updated.")


@router.delete("/account", response_model=MessageResponse, summary="Delete account")
def delete_account(
    payload: DeleteAccountRequest,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Irreversibly delete the account and all dependent data."""
    try:
        auth_service.delete_account(db, user, payload.password)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc

    clear_auth_cookie(response)
    return MessageResponse(message="Account and all associated data deleted.")
