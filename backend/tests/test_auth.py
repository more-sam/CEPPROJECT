"""Authentication tests: registration, login, cookies, protection, deletion."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import (
    AUTH_COOKIE_NAME,
    hash_password,
    verify_password,
)
from tests.conftest import TEST_PASSWORD


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def test_password_hash_is_not_plaintext() -> None:
    hashed = hash_password("correct horse battery staple")
    assert "correct horse battery staple" not in hashed
    assert hashed.startswith("$2")  # bcrypt marker


def test_password_verification_round_trip() -> None:
    hashed = hash_password(TEST_PASSWORD)
    assert verify_password(TEST_PASSWORD, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_over_length_password_is_rejected_not_truncated() -> None:
    """bcrypt ignores input past 72 bytes, so we must refuse it outright."""
    from app.core.security import BCRYPT_MAX_BYTES, PasswordTooLongError

    too_long = "a" * (BCRYPT_MAX_BYTES + 1)
    try:
        hash_password(too_long)
    except PasswordTooLongError:
        pass
    else:  # pragma: no cover
        raise AssertionError("Over-length passwords must be rejected")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
def test_register_creates_user_and_sets_cookie(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "New.User@Example.com", "password": TEST_PASSWORD},
    )

    assert response.status_code == 201
    body = response.json()
    # Email must be normalised to lower case.
    assert body["user"]["email"] == "new.user@example.com"
    assert body["has_profile"] is True
    assert AUTH_COOKIE_NAME in client.cookies


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {"email": "dupe@example.com", "password": TEST_PASSWORD}
    assert client.post("/api/auth/register", json=payload).status_code == 201

    second = client.post("/api/auth/register", json=payload)
    assert second.status_code == 409
    assert "already exists" in second.json()["detail"]


def test_register_rejects_short_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register", json={"email": "short@example.com", "password": "abc"}
    )
    assert response.status_code == 422


def test_register_rejects_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register", json={"email": "not-an-email", "password": TEST_PASSWORD}
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
def test_login_succeeds_with_correct_credentials(client: TestClient) -> None:
    client.post(
        "/api/auth/register", json={"email": "login@example.com", "password": TEST_PASSWORD}
    )
    client.post("/api/auth/logout")

    response = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Signed in."


def test_login_fails_with_wrong_password(client: TestClient) -> None:
    client.post(
        "/api/auth/register", json={"email": "wrong@example.com", "password": TEST_PASSWORD}
    )
    client.post("/api/auth/logout")

    response = client.post(
        "/api/auth/login", json={"email": "wrong@example.com", "password": "Nope12345678"}
    )
    assert response.status_code == 401


def test_login_does_not_reveal_whether_email_exists(client: TestClient) -> None:
    """Unknown email and wrong password must produce identical responses."""
    client.post(
        "/api/auth/register", json={"email": "known@example.com", "password": TEST_PASSWORD}
    )
    client.post("/api/auth/logout")

    unknown = client.post(
        "/api/auth/login", json={"email": "ghost@example.com", "password": TEST_PASSWORD}
    )
    wrong = client.post(
        "/api/auth/login", json={"email": "known@example.com", "password": "BadPassword123"}
    )

    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]


# ---------------------------------------------------------------------------
# Session / cookies
# ---------------------------------------------------------------------------
def test_me_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(auth_client: TestClient) -> None:
    response = auth_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "student@example.com"


def test_auth_cookie_is_httponly(client: TestClient) -> None:
    """The token must not be reachable from JavaScript."""
    response = client.post(
        "/api/auth/register",
        json={"email": "cookie@example.com", "password": TEST_PASSWORD},
    )
    set_cookie = response.headers["set-cookie"].lower()
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie


def test_logout_clears_session(auth_client: TestClient) -> None:
    assert auth_client.get("/api/auth/me").status_code == 200
    auth_client.post("/api/auth/logout")
    assert auth_client.get("/api/auth/me").status_code == 401


def test_protected_routes_reject_anonymous(client: TestClient) -> None:
    for path in ("/api/profile", "/api/dashboard", "/api/progress", "/api/resumes"):
        assert client.get(path).status_code == 401, path


# ---------------------------------------------------------------------------
# Password change and account deletion
# ---------------------------------------------------------------------------
def test_change_password_then_login_with_new_one(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/auth/password",
        json={"current_password": TEST_PASSWORD, "new_password": "BrandNewPass123"},
    )
    assert response.status_code == 200

    auth_client.post("/api/auth/logout")
    assert (
        auth_client.post(
            "/api/auth/login",
            json={"email": "student@example.com", "password": "BrandNewPass123"},
        ).status_code
        == 200
    )


def test_change_password_requires_current_password(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/auth/password",
        json={"current_password": "NotMyPassword1", "new_password": "BrandNewPass123"},
    )
    assert response.status_code == 400


def test_delete_account_requires_password(auth_client: TestClient) -> None:
    assert (
        auth_client.request(
            "DELETE", "/api/auth/account", json={"password": "WrongPassword123"}
        ).status_code
        == 400
    )


def test_delete_account_removes_access(auth_client: TestClient) -> None:
    response = auth_client.request(
        "DELETE", "/api/auth/account", json={"password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    assert auth_client.get("/api/auth/me").status_code == 401

    # The email must be free again.
    assert (
        auth_client.post(
            "/api/auth/register",
            json={"email": "student@example.com", "password": TEST_PASSWORD},
        ).status_code
        == 201
    )


def test_demo_account_can_sign_in_and_has_skills(demo_client: TestClient) -> None:
    assert demo_client.get("/api/auth/me").status_code == 200
    skills = demo_client.get("/api/profile/skills").json()
    assert len(skills) > 0
    assert settings.demo_user_email.endswith(".dev")
