"""Phase 1 smoke tests: the app boots and the health endpoints behave."""

from fastapi.testclient import TestClient

from app import __version__
from app.main import app

client = TestClient(app)


def test_stats_reports_public_counts(client: TestClient, seeded: dict) -> None:
    """The unauthenticated stats endpoint exposes non-negative platform counters."""
    response = client.get("/api/stats")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    for key in ("jobs", "skills", "companies", "assessments"):
        assert isinstance(body[key], int)
        assert body[key] >= 0
    # The seeded taxonomy must be reflected in the public counters.
    assert body["skills"] >= seeded["skills"]
    assert body["jobs"] >= seeded["jobs"]
    assert body["companies"] >= seeded["companies"]
    assert body["assessments"] >= seeded["assessments"]


def test_stats_is_listed_in_the_openapi_schema() -> None:
    response = client.get("/api/openapi.json")

    assert response.status_code == 200
    assert "/api/stats" in response.json()["paths"]


def test_liveness_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == __version__
    assert body["environment"] in {"development", "test", "production"}


def test_readiness_reports_database_state() -> None:
    """Readiness must answer 200 when the DB is reachable and 503 when it is not."""
    response = client.get("/api/health/ready")

    assert response.status_code in {200, 503}
    body = response.json()
    assert body["database"] in {"connected", "unavailable"}
    if response.status_code == 200:
        assert body["database"] == "connected"
    else:
        assert body["database"] == "unavailable"


def test_root_returns_service_metadata() -> None:
    response = client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["service"]
    assert body["docs"] == "/docs"


def test_openapi_schema_is_served() -> None:
    response = client.get("/api/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"]
