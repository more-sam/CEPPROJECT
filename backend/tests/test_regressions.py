"""Regression tests for defects found while verifying the UI in a real browser.

Each test here corresponds to something that was actually broken and is now
pinned down, so it cannot silently come back:

1. The dashboard's opportunity cards used a different JSON shape from
   `GET /api/jobs`, which crashed the card component at runtime.
2. Gap-driven surfaces disagreed about scope: the Skill Gap page reported 19
   gaps while the roadmap generated from it claimed 73.
3. Students with no skills were told they "already cover every required skill".
4. The demo account could not be restored to a clean, gap-rich starting state.
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.ai.taxonomy import get_taxonomy
from app.core.config import settings
from app.core.security import hash_password
from app.models.profile import StudentProfile
from app.models.skill import Skill, StudentSkill
from app.models.user import User
from app.seed.seeder import DEMO_SKILLS, reset_demo_profile
from app.services.recommendation_service import DEFAULT_GAP_ROLE_LIMIT

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"


def _fixture(name: str) -> bytes:
    path = FIXTURE_DIR / name
    if not path.is_file():
        pytest.skip(f"fixture {name} missing - run tests/fixtures/make_fixtures.py")
    return path.read_bytes()


# ---------------------------------------------------------------------------
# 0. Session probe must not 401 for anonymous visitors
# ---------------------------------------------------------------------------
def test_session_probe_is_200_when_anonymous(client: TestClient) -> None:
    """The SPA bootstrap must not log a console error on every public page."""
    response = client.get("/api/auth/session")
    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is False
    assert body["user"] is None
    assert body["has_profile"] is False


def test_session_probe_reports_the_signed_in_user(demo_client: TestClient) -> None:
    body = demo_client.get("/api/auth/session").json()
    assert body["authenticated"] is True
    assert body["user"]["email"] == settings.demo_user_email
    assert body["has_profile"] is True


def test_strict_me_endpoint_still_rejects_anonymous_callers(
    client: TestClient,
) -> None:
    """`/auth/me` keeps its 401 semantics for programmatic callers."""
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/session").status_code == 200


def test_session_probe_follows_logout(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"email": "probe@example.com", "password": "TestPassword123!"},
    )
    assert client.get("/api/auth/session").json()["authenticated"] is True

    client.post("/api/auth/logout")
    assert client.get("/api/auth/session").json()["authenticated"] is False


# ---------------------------------------------------------------------------
# 1. One card shape everywhere
# ---------------------------------------------------------------------------
def test_dashboard_recommendations_match_the_job_list_card_shape(
    demo_client: TestClient,
) -> None:
    """Every surface that shows an opportunity must emit the SAME keys.

    The UI renders all of them with one component, so a shape drift is an
    immediate crash rather than a cosmetic difference.
    """
    dashboard = demo_client.get("/api/dashboard").json()
    listed = demo_client.get("/api/jobs?page_size=1").json()["items"][0]

    assert dashboard["recommendations"], "the demo student should have matches"
    for card in dashboard["recommendations"]:
        assert set(card) == set(listed)
        # `company` must stay a nested object: the card reads company.name and
        # company.initials. A flattened dict here previously broke the UI.
        assert isinstance(card["company"], dict)
        assert card["company"]["name"]
        assert card["company"]["initials"]


def test_recommendation_endpoint_shares_the_card_shape(demo_client: TestClient) -> None:
    listed = demo_client.get("/api/jobs?page_size=1").json()["items"][0]
    recommendations = demo_client.get("/api/matching/recommendations?limit=3").json()
    assert recommendations["items"]
    for card in recommendations["items"]:
        assert set(card) == set(listed)


def test_resume_analysis_preview_shares_the_card_shape(auth_client: TestClient) -> None:
    """The resume page renders its opportunity preview with the same component."""
    for name in ("Python", "React", "SQL", "Git", "Docker"):
        auth_client.post("/api/profile/skills", json={"skill_name": name})

    response = auth_client.post(
        "/api/resumes",
        files={"file": ("resume_rich.pdf", _fixture("resume_rich.pdf"), "application/pdf")},
    )
    assert response.status_code == 201, response.text

    preview = response.json()["analysis"]["top_opportunities"]
    listed = auth_client.get("/api/jobs?page_size=1").json()["items"][0]
    assert preview
    for card in preview:
        assert set(card) == set(listed)


def test_dashboard_saved_jobs_are_a_deliberately_smaller_shape(
    demo_client: TestClient,
) -> None:
    """The saved-jobs strip is a compact summary, and it must stay honest."""
    job_id = demo_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]
    demo_client.post(f"/api/saved-jobs/{job_id}")

    saved = demo_client.get("/api/dashboard").json()["saved_jobs"]
    assert any(entry["id"] == job_id for entry in saved)
    entry = next(item for item in saved if item["id"] == job_id)
    # The saved-jobs strip is a compact summary: flat strings (no nested company
    # object) even though newer fields were added for convenience.
    assert set(entry) == {"id", "title", "company", "company_initials", "location", "company_name"}
    assert isinstance(entry["company"], str)
    assert isinstance(entry["company_initials"], str)
    assert isinstance(entry["company_name"], str)

    demo_client.delete(f"/api/saved-jobs/{job_id}")


# ---------------------------------------------------------------------------
# 2. Gap scope must agree across surfaces
# ---------------------------------------------------------------------------
def test_skill_gap_states_its_scope(demo_client: TestClient) -> None:
    body = demo_client.get("/api/skill-gap").json()
    assert body["scope"].startswith("Across your")
    assert str(DEFAULT_GAP_ROLE_LIMIT) in body["scope"]


def test_roadmap_built_from_gaps_covers_exactly_the_reported_gaps(
    demo_client: TestClient,
) -> None:
    """The roadmap is what the student was just shown, not a larger surprise set."""
    gap = demo_client.get("/api/skill-gap").json()
    assert gap["missing"], "the demo student should have gaps to plan for"

    roadmap = demo_client.post("/api/roadmaps", json={}).json()

    assert roadmap["total_items"] == len(gap["missing"])
    assert {item["skill_name"] for item in roadmap["items"]} == {
        item["name"] for item in gap["missing"]
    }


def test_gap_scope_is_configurable_but_defaults_consistently(
    demo_client: TestClient,
) -> None:
    """A wider scope must report at least as many gaps, never fewer."""
    narrow = demo_client.get("/api/skill-gap").json()
    wide = demo_client.get("/api/skill-gap?limit=60").json()
    assert len(wide["missing"]) >= len(narrow["missing"])


# ---------------------------------------------------------------------------
# 3. No false reassurance for a student with no data
# ---------------------------------------------------------------------------
def test_roadmap_without_any_skills_asks_for_skills_first(
    auth_client: TestClient,
) -> None:
    response = auth_client.post("/api/roadmaps", json={})
    assert response.status_code == 409

    detail = response.json()["detail"].lower()
    assert "add some skills" in detail
    assert "already cover" not in detail


def test_skill_gap_without_any_skills_does_not_claim_full_coverage(
    auth_client: TestClient,
) -> None:
    body = auth_client.get("/api/skill-gap").json()

    assert body["available"] == []
    assert body["missing"] == []
    assert body["note"]
    # The empty state must ask for data, not congratulate the student.
    assert "add skills" in body["note"].lower()
    assert "nothing is missing" not in body["note"].lower()


def test_skill_gap_for_a_fully_covered_student_says_so(auth_client: TestClient) -> None:
    """The genuine 'you cover everything' case still reports itself."""
    all_skills = [{"skill_name": item["name"]} for item in auth_client.get("/api/skills").json()]
    auth_client.put("/api/profile/skills", json=all_skills)

    body = auth_client.get("/api/skill-gap").json()
    assert body["missing"] == []
    assert body["note"] and "nothing is missing" in body["note"].lower()


# ---------------------------------------------------------------------------
# A single-opportunity gap states its own, narrower scope
# ---------------------------------------------------------------------------
def test_skill_gap_for_a_job_scopes_itself_to_that_job(demo_client: TestClient) -> None:
    job_id = demo_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]
    body = demo_client.get(f"/api/skill-gap/{job_id}").json()
    assert body["scope"] == "Against this single opportunity."
    assert body["job_id"] == job_id


# ---------------------------------------------------------------------------
# 4. The demo account can be restored
# ---------------------------------------------------------------------------
def test_reset_demo_profile_restores_the_documented_baseline(
    monkeypatch: pytest.MonkeyPatch, db
) -> None:  # noqa: ANN001
    """`python -m app.seed --reset-demo` must produce a clean demo state.

    Runs against a throwaway account (with the demo email pointed at it) so the
    real demo student is never mutated by the test suite.
    """
    email = "reset-target@example.com"
    user = User(email=email, password_hash=hash_password("ResetPassword123!"))
    db.add(user)
    db.flush()
    profile = StudentProfile(user_id=user.id, full_name="Someone Else")
    db.add(profile)
    db.flush()

    taxonomy = get_taxonomy()
    baseline_slugs = {
        entry.slug for entry in (taxonomy.find(name) for name in DEMO_SKILLS) if entry
    }
    rows = db.scalars(select(Skill).where(Skill.slug.in_(baseline_slugs))).all()
    assert len(rows) == len(baseline_slugs), "the taxonomy must contain the demo baseline"

    # Baseline skills plus two extras that must be removed.
    extras = db.scalars(
        select(Skill).where(Skill.slug.notin_(baseline_slugs)).limit(2)
    ).all()
    for skill in [*rows, *extras]:
        db.add(
            StudentSkill(
                student_id=profile.id,
                skill_id=skill.id,
                proficiency="intermediate",
                confidence=1.0,
                source="manual",
            )
        )
    db.commit()

    monkeypatch.setattr(settings, "demo_user_email", email)
    summary = reset_demo_profile(db)

    assert summary["reset"] is True
    assert summary["extra_skills_removed"] == len(extras)
    assert summary["baseline_skills"] == len(baseline_slugs)

    db.refresh(profile)
    remaining = {
        row.skill.slug
        for row in db.scalars(
            select(StudentSkill).where(StudentSkill.student_id == profile.id)
        )
    }
    assert remaining == baseline_slugs
    # Profile details are restored too, so the demo reads as documented.
    assert profile.full_name == "Alex Sharma"
    assert profile.preferred_roles

    # Remove the throwaway account regardless of fixture teardown ordering.
    db.delete(user)
    db.commit()


def test_reset_demo_profile_reports_a_missing_account(
    monkeypatch: pytest.MonkeyPatch, db
) -> None:  # noqa: ANN001
    monkeypatch.setattr(settings, "demo_user_email", "no-such-demo@example.com")
    summary = reset_demo_profile(db)
    assert summary["reset"] is False
    assert "reason" in summary
