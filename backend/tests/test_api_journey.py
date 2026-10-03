"""End-to-end API tests covering the critical user journey.

register -> login -> profile -> resume upload -> skills -> recommendations ->
job detail -> skill gap -> roadmap -> assessment -> progress -> assistant
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"


def _fixture(name: str) -> bytes:
    path = FIXTURE_DIR / name
    if not path.is_file():
        pytest.skip(f"fixture {name} missing - run tests/fixtures/make_fixtures.py")
    return path.read_bytes()


# ---------------------------------------------------------------------------
# Health and public endpoints
# ---------------------------------------------------------------------------
def test_health_endpoints(client: TestClient) -> None:
    assert client.get("/api/health").json()["status"] == "ok"
    ready = client.get("/api/health/ready")
    assert ready.status_code == 200
    assert ready.json()["database"] == "connected"


def test_openapi_schema_is_served(client: TestClient) -> None:
    schema = client.get("/api/openapi.json").json()
    assert "/api/auth/login" in schema["paths"]
    assert "/api/matching/recommendations" in schema["paths"]


# ---------------------------------------------------------------------------
# Seeded data
# ---------------------------------------------------------------------------
def test_seed_created_the_expected_volume(client: TestClient, seeded: dict) -> None:
    assert seeded["companies"] >= 20
    assert seeded["jobs"] >= 50
    assert seeded["skills"] >= 100
    assert seeded["assessments"] >= 7
    assert seeded["questions"] >= 70


def test_seeded_jobs_are_labelled_as_demo_data(client: TestClient) -> None:
    """Nothing may imply a seeded listing is a live vacancy."""
    page = client.get("/api/jobs?page_size=5").json()
    assert page["items"]
    assert all(item["source"] == "DEMO" for item in page["items"])


def test_jobs_are_paginated(client: TestClient) -> None:
    page = client.get("/api/jobs?page_size=5&page=2").json()
    assert len(page["items"]) <= 5
    assert page["meta"]["page"] == 2
    assert page["meta"]["total"] >= 50
    assert page["meta"]["has_next"] is True


def test_job_filters_are_applied(client: TestClient) -> None:
    interns = client.get("/api/jobs?employment_type=internship&page_size=50").json()
    assert interns["items"]
    assert all(item["employment_type"] == "internship" for item in interns["items"])

    remote = client.get("/api/jobs?work_type=remote&page_size=50").json()
    assert all(item["work_type"] == "remote" for item in remote["items"])


def test_job_search_matches_title_and_skill(client: TestClient) -> None:
    results = client.get("/api/jobs?q=react&page_size=50").json()
    assert results["meta"]["total"] > 0
    # search_text covers title, company, location and required skills.
    assert any(
        "react" in item["title"].lower()
        or any(s["slug"] == "react" for s in item["required_skills"])
        for item in results["items"]
    )


def test_job_search_matches_company_name(client: TestClient) -> None:
    results = client.get("/api/jobs?q=nimbusstack&page_size=50").json()
    assert results["meta"]["total"] > 0
    assert all(item["company"]["name"] == "NimbusStack" for item in results["items"])


def test_anonymous_visitor_can_browse_without_compatibility_scores(
    client: TestClient,
) -> None:
    """Browsing must not require an account, and must not fake a score."""
    response = client.get("/api/jobs?page_size=3")
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    assert all(item["compatibility_score"] is None for item in items)
    assert all(item["is_saved"] is False for item in items)


def test_signed_in_student_gets_compatibility_scores(demo_client: TestClient) -> None:
    items = demo_client.get("/api/jobs?page_size=3").json()["items"]
    assert items
    assert all(item["compatibility_score"] is not None for item in items)


def test_filter_options_are_populated(client: TestClient) -> None:
    options = client.get("/api/jobs/filters").json()
    assert options["locations"]
    assert options["employment_types"]


def test_skill_catalogue_is_exposed(client: TestClient) -> None:
    skills = client.get("/api/skills").json()
    assert len(skills) >= 100
    assert {"name", "slug", "category"} <= set(skills[0])


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------
def test_new_user_profile_starts_empty(auth_client: TestClient) -> None:
    profile = auth_client.get("/api/profile").json()
    assert profile["full_name"] is None
    assert profile["preferred_roles"] == []


def test_profile_can_be_updated(auth_client: TestClient) -> None:
    response = auth_client.put(
        "/api/profile",
        json={
            "full_name": "Test Student",
            "college": "Test College",
            "degree": "B.Tech",
            "branch": "CSE",
            "graduation_year": 2027,
            "preferred_roles": ["Backend Developer", "Backend Developer"],
            "preferred_locations": ["Remote"],
            "work_type": "remote",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Test Student"
    # Duplicates must be collapsed by the validator.
    assert body["preferred_roles"] == ["Backend Developer"]
    assert body["work_type"] == "remote"


def test_profile_rejects_impossible_graduation_year(auth_client: TestClient) -> None:
    assert (
        auth_client.put("/api/profile", json={"graduation_year": 1200}).status_code == 422
    )


def test_skills_can_be_added_and_removed_manually(auth_client: TestClient) -> None:
    created = auth_client.post("/api/profile/skills", json={"skill_name": "Docker"})
    assert created.status_code == 201
    skill_id = created.json()["id"]
    assert created.json()["name"] == "Docker"

    listed = auth_client.get("/api/profile/skills").json()
    assert [item["name"] for item in listed] == ["Docker"]

    assert auth_client.delete(f"/api/profile/skills/{skill_id}").status_code == 200
    assert auth_client.get("/api/profile/skills").json() == []


def test_manual_skill_is_normalised_through_aliases(auth_client: TestClient) -> None:
    created = auth_client.post("/api/profile/skills", json={"skill_name": "Postgres"})
    assert created.json()["name"] == "PostgreSQL"


# ---------------------------------------------------------------------------
# Resume
# ---------------------------------------------------------------------------
def test_resume_upload_extracts_skills_and_persists_them(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/resumes",
        files={"file": ("resume_rich.pdf", _fixture("resume_rich.pdf"), "application/pdf")},
    )

    assert response.status_code == 201, response.text
    analysis = response.json()["analysis"]

    assert analysis["resume"]["analysis_status"] == "completed"
    assert analysis["detected_email"] == "alex.sharma@example.com"
    assert len(analysis["detected_skills"]) >= 20
    assert "skills" in analysis["sections_found"]

    # High-confidence skills must have been written to the profile.
    profile_skills = {item["name"] for item in auth_client.get("/api/profile/skills").json()}
    assert {"Python", "Docker"} <= profile_skills


def test_resume_response_never_leaks_storage_path(auth_client: TestClient) -> None:
    auth_client.post(
        "/api/resumes",
        files={"file": ("resume_rich.pdf", _fixture("resume_rich.pdf"), "application/pdf")},
    )
    listing = auth_client.get("/api/resumes")
    assert "storage_path" not in listing.text


def test_unsupported_resume_type_is_rejected(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/resumes", files={"file": ("notes.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_corrupt_pdf_marks_the_resume_failed(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/resumes",
        files={"file": ("broken.pdf", b"not a real pdf at all", "application/pdf")},
    )
    assert response.status_code == 400
    # A failed row is still recorded so the student can see what happened.
    listing = auth_client.get("/api/resumes").json()
    assert listing[0]["analysis_status"] == "failed"
    assert listing[0]["analysis_error"]


def test_resume_can_be_deleted(auth_client: TestClient) -> None:
    created = auth_client.post(
        "/api/resumes",
        files={"file": ("resume_rich.pdf", _fixture("resume_rich.pdf"), "application/pdf")},
    )
    resume_id = created.json()["analysis"]["resume"]["id"]

    assert auth_client.delete(f"/api/resumes/{resume_id}").status_code == 200
    assert auth_client.get(f"/api/resumes/{resume_id}").status_code == 404


def test_cannot_read_another_students_resume(client: TestClient) -> None:
    """Ownership is enforced, and a foreign id must look like it does not exist."""
    client.post(
        "/api/auth/register", json={"email": "owner@example.com", "password": "TestPassword123!"}
    )
    created = client.post(
        "/api/resumes",
        files={"file": ("resume_rich.pdf", _fixture("resume_rich.pdf"), "application/pdf")},
    )
    foreign_id = created.json()["analysis"]["resume"]["id"]
    client.post("/api/auth/logout")

    client.post(
        "/api/auth/register", json={"email": "intruder@example.com", "password": "TestPassword123!"}
    )
    assert client.get(f"/api/resumes/{foreign_id}").status_code == 404
    assert client.delete(f"/api/resumes/{foreign_id}").status_code == 404


# ---------------------------------------------------------------------------
# Recommendations, matching and skill gaps
# ---------------------------------------------------------------------------
def test_recommendations_require_skills_first(auth_client: TestClient) -> None:
    response = auth_client.get("/api/matching/recommendations")
    body = response.json()
    assert body["items"] == []
    assert body["note"] and "Upload a resume" in body["note"]


def test_recommendations_are_ranked_and_explained(demo_client: TestClient) -> None:
    body = demo_client.get("/api/matching/recommendations?limit=10").json()

    assert body["total"] > 0
    scores = [item["compatibility_score"] for item in body["items"]]
    assert all(0 <= score <= 100 for score in scores)
    assert all(item["required_skills"] for item in body["items"])
    # Every recommendation must carry an explanation.
    assert any(item["reasons"] for item in body["items"])


def test_match_endpoint_returns_explainable_components(demo_client: TestClient) -> None:
    job_id = demo_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]
    body = demo_client.get(f"/api/matching/{job_id}").json()

    assert body["job_id"] == job_id
    assert 0 <= body["compatibility_score"] <= 100
    assert body["total_required"] > 0
    assert len(body["skill_breakdown"]) == body["total_required"]
    assert "not a hiring probability" in body["disclaimer"]

    exact = {e["skill"] for e in body["skill_breakdown"] if e["relation"] == "exact"}
    assert exact == set(body["matched_skills"])


def test_analyze_endpoint_scores_a_chosen_job(demo_client: TestClient) -> None:
    job_id = demo_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]
    response = demo_client.post("/api/matching/analyze", json={"job_id": job_id})
    assert response.status_code == 200
    assert response.json()["job_id"] == job_id


def test_matching_unknown_job_returns_404(demo_client: TestClient) -> None:
    assert demo_client.get("/api/matching/999999").status_code == 404


def test_recommendations_never_exceed_the_limit(demo_client: TestClient) -> None:
    body = demo_client.get("/api/matching/recommendations?limit=3").json()
    assert len(body["items"]) <= 3


def test_skill_gap_for_a_job_classifies_skills(demo_client: TestClient) -> None:
    job_id = demo_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]
    body = demo_client.get(f"/api/skill-gap/{job_id}").json()

    assert body["job_id"] == job_id
    assert body["total_required"] > 0
    # Every required skill must appear in exactly one bucket.
    buckets = body["available"] + body["developing"] + body["missing"]
    assert len(buckets) == body["total_required"]
    for item in body["missing"]:
        assert item["why_it_matters"]


def test_overall_skill_gap_aggregates_demand(demo_client: TestClient) -> None:
    body = demo_client.get("/api/skill-gap").json()
    assert body["job_id"] is None
    assert body["missing"], "the demo student should have gaps"
    # Demand counts must be ordered high to low.
    counts = [item["opportunities_requiring"] for item in body["missing"]]
    assert counts == sorted(counts, reverse=True)


# ---------------------------------------------------------------------------
# Saved opportunities
# ---------------------------------------------------------------------------
def test_save_and_unsave_a_job(demo_client: TestClient) -> None:
    job_id = demo_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]

    assert demo_client.post(f"/api/saved-jobs/{job_id}").status_code == 201
    # Saving twice must be idempotent rather than erroring.
    assert demo_client.post(f"/api/saved-jobs/{job_id}").status_code == 201

    saved = demo_client.get("/api/saved-jobs").json()
    assert any(item["job_id"] == job_id for item in saved)

    assert demo_client.delete(f"/api/saved-jobs/{job_id}").status_code == 200
    assert demo_client.delete(f"/api/saved-jobs/{job_id}").status_code == 404


# ---------------------------------------------------------------------------
# Roadmap
# ---------------------------------------------------------------------------
def test_generate_roadmap_is_ordered_and_explained(demo_client: TestClient) -> None:
    body = demo_client.post("/api/roadmaps", json={}).json()

    assert body["items"]
    assert body["total_items"] == len(body["items"])
    assert body["progress_percentage"] == 0.0

    orders = [item["order_index"] for item in body["items"]]
    assert orders == sorted(orders)

    names = [item["skill_name"] for item in body["items"]]
    # Prerequisites must appear before the skills that need them.
    for item in body["items"]:
        for prerequisite in item["prerequisites"]:
            assert names.index(prerequisite) < names.index(item["skill_name"])
        assert item["reason"]
        assert item["estimated_hours"] > 0


def test_roadmap_item_status_updates_progress(demo_client: TestClient) -> None:
    roadmap = demo_client.post("/api/roadmaps", json={}).json()
    item = roadmap["items"][0]

    updated = demo_client.put(
        f"/api/roadmaps/{roadmap['id']}/items/{item['id']}",
        json={"status": "completed"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"

    refreshed = demo_client.get(f"/api/roadmaps/{roadmap['id']}").json()
    assert refreshed["completed_items"] == 1
    assert refreshed["progress_percentage"] > 0

    progress = demo_client.get("/api/progress").json()
    skill = next(
        entry for entry in progress["items"] if entry["skill_name"] == item["skill_name"]
    )
    assert skill["progress_percentage"] == 100


def test_roadmap_for_a_job_targets_that_job(demo_client: TestClient) -> None:
    job_id = demo_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]
    body = demo_client.post("/api/roadmaps", json={"job_id": job_id}).json()

    assert body["source"] == "job"
    assert body["target_job_id"] == job_id
    assert body["target_job_title"]


def test_roadmap_for_a_fully_covered_job_is_a_conflict(auth_client: TestClient) -> None:
    """Asking for a roadmap with no gaps is a state problem, not a bad request.

    Deliberately uses a throwaway account rather than the demo student: granting
    every skill would otherwise leave the shared demo account gap-free for every
    later test in the run.
    """
    all_skills = [
        {"skill_name": item["name"]} for item in auth_client.get("/api/skills").json()
    ]
    auth_client.put("/api/profile/skills", json=all_skills)

    job_id = auth_client.get("/api/jobs?page_size=1").json()["items"][0]["id"]
    response = auth_client.post("/api/roadmaps", json={"job_id": job_id})
    assert response.status_code == 409
    assert "already cover" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Assessments
# ---------------------------------------------------------------------------
def test_assessment_list_shows_attempt_history(demo_client: TestClient) -> None:
    listing = demo_client.get("/api/assessments").json()
    assert len(listing) >= 7
    assert all(item["question_count"] >= 10 for item in listing)


def test_assessment_questions_do_not_leak_answers(demo_client: TestClient) -> None:
    listing = demo_client.get("/api/assessments").json()
    assessment_id = listing[0]["id"]

    response = demo_client.get(f"/api/assessments/{assessment_id}")
    assert response.status_code == 200
    assert "correct_answer" not in response.text
    assert "explanation" not in response.text


def test_submitting_a_perfect_attempt_passes_and_updates_progress(
    demo_client: TestClient,
) -> None:
    listing = demo_client.get("/api/assessments").json()
    assessment_id = listing[0]["id"]

    # Submit empty first: the review reveals the correct answers, which lets the
    # test build a perfect second attempt without hard-coding the answer key.
    probe = demo_client.post(
        f"/api/assessments/{assessment_id}/submit", json={"answers": []}
    ).json()
    assert probe["score"] == 0.0
    assert len(probe["review"]) == probe["total_count"]

    perfect = [
        {"question_id": entry["question_id"], "answer": entry["correct"]}
        for entry in probe["review"]
    ]
    result = demo_client.post(
        f"/api/assessments/{assessment_id}/submit", json={"answers": perfect}
    ).json()

    assert result["score"] == 100.0
    assert result["passed"] is True
    assert result["progress_percentage"] == 100
    assert all(entry["is_correct"] for entry in result["review"])
    assert all(entry["explanation"] for entry in result["review"])


def test_unanswered_questions_count_as_incorrect(demo_client: TestClient) -> None:
    listing = demo_client.get("/api/assessments").json()
    assessment_id = listing[0]["id"]

    result = demo_client.post(
        f"/api/assessments/{assessment_id}/submit", json={"answers": []}
    ).json()
    assert result["score"] == 0.0
    assert result["correct_count"] == 0
    assert result["passed"] is False


def test_unknown_assessment_returns_404(demo_client: TestClient) -> None:
    assert demo_client.get("/api/assessments/999999").status_code == 404


# ---------------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------------
def test_progress_overview_shape(demo_client: TestClient) -> None:
    body = demo_client.get("/api/progress").json()
    for key in (
        "total_skills",
        "mastered",
        "developing",
        "roadmap_items_total",
        "assessments_taken",
        "average_assessment_score",
        "category_breakdown",
        "score_history",
    ):
        assert key in body


def test_progress_can_be_set_directly(demo_client: TestClient) -> None:
    skill = demo_client.get("/api/skills").json()[0]
    response = demo_client.put(
        f"/api/progress/{skill['id']}", json={"progress_percentage": 60}
    )
    assert response.status_code == 200
    assert response.json()["progress_percentage"] == 60
    assert response.json()["status"] == "developing"


def test_progress_rejects_out_of_range_values(demo_client: TestClient) -> None:
    skill = demo_client.get("/api/skills").json()[0]
    assert (
        demo_client.put(f"/api/progress/{skill['id']}", json={"progress_percentage": 150}).status_code
        == 422
    )


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
def test_dashboard_aggregates_everything(demo_client: TestClient) -> None:
    body = demo_client.get("/api/dashboard").json()

    assert body["greeting_name"]
    assert body["skills_identified"] >= 1
    assert body["has_skills"] is True
    assert len(body["metrics"]) == 4
    assert body["recommendations"]
    assert body["skill_constellation"]
    # Every constellation node must declare a state the UI can render.
    assert all(node["state"] in {"owned", "learning", "gap"} for node in body["skill_constellation"])


def test_dashboard_for_a_brand_new_student_is_usable(auth_client: TestClient) -> None:
    """A fresh account must return a valid payload, not an error."""
    body = auth_client.get("/api/dashboard").json()
    assert body["skills_identified"] == 0
    assert body["has_resume"] is False
    assert body["recommendations"] == []
    # Onboarding guidance must be present so the UI is not a dead end.
    assert any(step["done"] is False for step in body["onboarding_steps"])


# ---------------------------------------------------------------------------
# Assistant
# ---------------------------------------------------------------------------
def test_assistant_reports_its_mode_honestly(demo_client: TestClient) -> None:
    body = demo_client.get("/api/assistant/capabilities").json()
    assert body["llm_enabled"] is False  # no key configured in tests
    assert body["note"]
    assert body["suggested_prompts"]


@pytest.mark.parametrize(
    "question",
    [
        "What should I learn next?",
        "Which roles match my current skills?",
        "What skills appear most often in my recommended jobs?",
        "How can I improve my resume?",
        "Why is Docker recommended?",
        "Help me prepare for this role.",
    ],
)
def test_assistant_answers_each_supported_question(demo_client: TestClient, question: str) -> None:
    response = demo_client.post("/api/assistant/chat", json={"message": question})

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]
    assert body["mode"] in {"local", "llm"}
    assert body["suggested_prompts"]


def test_assistant_reply_uses_real_student_data(demo_client: TestClient) -> None:
    """The roles answer must name a real seeded company."""
    reply = demo_client.post(
        "/api/assistant/chat", json={"message": "Which roles match my current skills?"}
    ).json()["reply"]

    companies = {
        item["company"]["name"]
        for item in demo_client.get("/api/matching/recommendations?limit=5").json()["items"]
    }
    assert any(company in reply for company in companies)


def test_assistant_rejects_empty_message(demo_client: TestClient) -> None:
    assert demo_client.post("/api/assistant/chat", json={"message": ""}).status_code == 422


def test_assistant_works_for_a_student_with_no_data(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/assistant/chat", json={"message": "What should I learn next?"}
    )
    assert response.status_code == 200
    # It should prompt the student to upload a resume rather than hallucinate.
    assert "resume" in response.json()["reply"].lower()


# ---------------------------------------------------------------------------
# Data isolation
# ---------------------------------------------------------------------------
def test_students_cannot_see_each_others_data(client: TestClient) -> None:
    client.post(
        "/api/auth/register", json={"email": "first@example.com", "password": "TestPassword123!"}
    )
    client.post("/api/profile/skills", json={"skill_name": "Docker"})

    client.post("/api/auth/logout")
    client.post(
        "/api/auth/register", json={"email": "second@example.com", "password": "TestPassword123!"}
    )

    assert client.get("/api/profile/skills").json() == []
    assert client.get("/api/dashboard").json()["skills_identified"] == 0
