"""Shared test fixtures.

Tests run against a dedicated `skillbridge_test` database that is created and
dropped around the session, so the development data is never touched.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.database.base import Base
from app.database.database import get_db
from app.main import app
# Aliased deliberately: a bare `import app.models` would rebind the name `app`
# to the package and shadow the FastAPI instance imported above.
from app import models as _models  # noqa: F401  - registers tables on Base.metadata
from app.seed.seeder import run_seed

TEST_DB_NAME = "skillbridge_test"
TEST_PASSWORD = "TestPassword123!"


def _server_url() -> str:
    """URL of the maintenance database, used to create/drop the test database."""
    return settings.database_url.rsplit("/", 1)[0] + "/postgres"


def _test_db_url() -> str:
    return settings.database_url.rsplit("/", 1)[0] + "/" + TEST_DB_NAME


@pytest.fixture(scope="session")
def engine() -> Generator[Engine, None, None]:
    """Create the test database once for the whole session."""
    admin = create_engine(_server_url(), isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB_NAME}"'))
        connection.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    admin.dispose()

    test_engine = create_engine(_test_db_url(), pool_pre_ping=True)
    Base.metadata.create_all(test_engine)

    yield test_engine

    test_engine.dispose()
    admin = create_engine(_server_url(), isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB_NAME}"'))
    admin.dispose()


@pytest.fixture(scope="session")
def session_factory(engine: Engine) -> sessionmaker:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session")
def seeded(session_factory: sessionmaker) -> dict:
    """Seed taxonomy, jobs and assessments once for the session."""
    session: Session = session_factory()
    try:
        return run_seed(session)
    finally:
        session.close()


@pytest.fixture
def db(session_factory: sessionmaker, seeded: dict) -> Generator[Session, None, None]:
    """Function-scoped session. User rows are cleaned up after each test."""
    session: Session = session_factory()
    try:
        yield session
    finally:
        # Remove users created by the test; cascades clear profiles, resumes,
        # skills, matches, roadmaps, results and progress with them.
        session.execute(text("DELETE FROM users WHERE email <> :demo"), {"demo": settings.demo_user_email})
        session.commit()
        session.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """TestClient bound to the test database."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    """A client already signed in as a freshly registered student."""
    response = client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": TEST_PASSWORD},
    )
    assert response.status_code == 201, response.text
    return client


@pytest.fixture
def demo_client(client: TestClient) -> TestClient:
    """A client signed in as the seeded demo student."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": settings.demo_user_email,
            "password": settings.demo_user_password,
        },
    )
    assert response.status_code == 200, response.text
    return client
