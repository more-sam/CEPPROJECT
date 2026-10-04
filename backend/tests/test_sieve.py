"""Sieve integration tests.

The Sieve API is exercised through `httpx.MockTransport`, so every recorded
response sits exactly at the HTTP boundary and the code under test is the real
client and service. Nothing here reaches the network.
"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.models.profile import StudentProfile
from app.models.scrape import ScrapeJob
from app.models.user import User
from app.services import sieve_service
from app.services.sieve_client import (
    SieveClient,
    SieveError,
    build_scrape_body,
    map_error,
)


def _client(handler, **overrides) -> SieveClient:
    return SieveClient(
        api_key="dc_sk_test",
        base_url="https://scrape.example",
        transport=httpx.MockTransport(handler),
        retry_backoff=0.0,
        **overrides,
    )


def _make_profile(db) -> StudentProfile:
    user = User(email="scraper@example.com", password_hash="not-a-real-hash")
    db.add(user)
    db.commit()
    db.refresh(user)
    profile = StudentProfile(
        user_id=user.id, preferred_roles=[], preferred_locations=[]
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def _job(**overrides) -> ScrapeJob:
    """A detached ScrapeJob, used to test response application without a database."""
    job = ScrapeJob(student_id=1, instruction="Extract quotes", request_payload={})
    job.status = "running"
    job.turns_count = 0
    job.turns_baseline = 0
    job.awaiting_turn = False
    for key, value in overrides.items():
        setattr(job, key, value)
    return job


# ---------------------------------------------------------------------------
# Request building
# ---------------------------------------------------------------------------
def test_build_scrape_body_requires_only_the_instruction() -> None:
    assert build_scrape_body("Extract the text and author of each quote") == {
        "instruction": "Extract the text and author of each quote"
    }


def test_build_scrape_body_maps_every_contract_field() -> None:
    body = build_scrape_body(
        "Extract quotes",
        target_urls=["https://quotes.toscrape.com"],
        fields=["quote", "author"],
        schema={"type": "object"},
        output_schema={"type": "object", "properties": {}},
        table_shape="long",
        compliance_mode="regular",
    )
    assert body["target_urls"] == ["https://quotes.toscrape.com"]
    assert body["fields"] == ["quote", "author"]
    assert body["schema"] == {"type": "object"}
    assert body["output_schema"] == {"type": "object", "properties": {}}
    assert body["table_shape"] == "long"
    assert body["compliance_mode"] == "regular"


def test_build_scrape_body_omits_unset_optionals() -> None:
    body = build_scrape_body("Extract quotes", compliance_mode="regular")
    for key in ("target_urls", "fields", "schema", "output_schema", "table_shape"):
        assert key not in body


def test_start_scrape_sends_the_bearer_header_and_body() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("Authorization")
        seen["path"] = request.url.path
        seen["body"] = json.loads(request.content)
        return httpx.Response(202, json={"status": "queued", "session_id": "s1"})

    client = _client(handler)
    payload = client.start_scrape({"instruction": "Extract quotes"})

    assert payload == {"status": "queued", "session_id": "s1"}
    assert seen["auth"] == "Bearer dc_sk_test"
    assert seen["path"] == "/api/scrapes"
    assert seen["body"] == {"instruction": "Extract quotes"}


# ---------------------------------------------------------------------------
# Never retry POST on timeout
# ---------------------------------------------------------------------------
def test_start_scrape_never_retries_on_timeout() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        raise httpx.ConnectTimeout("timed out", request=request)

    client = _client(handler)
    with pytest.raises(SieveError) as info:
        client.start_scrape({"instruction": "Extract quotes"})

    assert calls["n"] == 1, "a timed-out POST must not be sent again"
    assert info.value.code == "timeout"
    assert info.value.retryable is False


def test_post_message_does_not_retry_on_network_error() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        raise httpx.ConnectError("no route", request=request)

    client = _client(handler)
    with pytest.raises(SieveError) as info:
        client.post_message("s1", {"instruction": "more"})

    assert calls["n"] == 1
    assert info.value.retryable is False


def test_post_message_surfaces_turn_in_flight() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(409, json={"error": "a turn is in flight"})

    client = _client(handler)
    with pytest.raises(SieveError) as info:
        client.post_message("s1", {"instruction": "more"})

    assert info.value.code == "turn_in_flight"


# ---------------------------------------------------------------------------
# Retry on idempotent GETs
# ---------------------------------------------------------------------------
def test_get_scrape_retries_5xx_then_succeeds() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(503, json={"error": "unavailable"})
        return httpx.Response(200, json={"status": "running"})

    client = _client(handler)
    body = client.get_scrape("s1")

    assert calls["n"] == 2
    assert body["status"] == "running"


def test_get_scrape_does_not_retry_client_errors() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(400, json={"error": "no target"})

    client = _client(handler)
    with pytest.raises(SieveError) as info:
        client.get_scrape("s1")

    assert calls["n"] == 1
    assert info.value.code == "bad_request"


def test_download_file_prefixes_the_base_url_and_sends_the_bearer_header() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("Authorization")
        return httpx.Response(
            200, content=b"quote,author\n", headers={"Content-Type": "text/csv"}
        )

    client = _client(handler)
    content, content_type = client.download_file("/api/scrapes/s1/files/0")

    assert content == b"quote,author\n"
    assert content_type == "text/csv"
    assert seen["auth"] == "Bearer dc_sk_test"
    assert seen["url"] == "https://scrape.example/api/scrapes/s1/files/0"


# ---------------------------------------------------------------------------
# Error mapping
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("status_code", "code", "retryable"),
    [
        (400, "bad_request", False),
        (401, "unauthorized", False),
        (402, "out_of_credits", False),
        (404, "not_found", False),
        (409, "turn_in_flight", False),
        (429, "rate_limited", True),
        (500, "server_error", True),
        (503, "server_error", True),
    ],
)
def test_map_error(status_code: int, code: str, retryable: bool) -> None:
    error = map_error(status_code, {"error": "upstream detail"})
    assert error.status_code == status_code
    assert error.code == code
    assert error.retryable is retryable


# ---------------------------------------------------------------------------
# Status handling
# ---------------------------------------------------------------------------
def test_running_status_keeps_polling() -> None:
    job = _job()
    sieve_service.apply_scrape_response(job, {"status": "running"})
    assert job.status == "running"
    assert job.error is None


def test_done_status_reads_the_outcome() -> None:
    job = _job()
    sieve_service.apply_scrape_response(
        job,
        {
            "status": "done",
            "summary": {"rows": 2},
            "files": [{"name": "quotes.csv", "size": 12, "ext": "csv", "url": "/f/0"}],
            "schema_conformance": {"status": "pass"},
            "result": {"quotes": [{"author": "a"}]},
        },
    )
    assert job.status == "done"
    assert job.summary == {"rows": 2}
    assert job.files[0]["name"] == "quotes.csv"
    assert job.schema_conformance == {"status": "pass"}
    assert job.result == {"quotes": [{"author": "a"}]}


def test_refused_status_is_terminal_with_a_reason() -> None:
    job = _job()
    sieve_service.apply_scrape_response(
        job, {"status": "refused", "refusal": {"code": "quota"}}
    )
    assert job.status == "refused"
    assert job.refusal == {"code": "quota"}


def test_unknown_status_is_recorded_as_an_error() -> None:
    job = _job()
    sieve_service.apply_scrape_response(job, {"status": "banana"})
    assert job.status == "error"
    assert "banana" in (job.error or "")


# ---------------------------------------------------------------------------
# Follow-up turn check
# ---------------------------------------------------------------------------
def test_follow_up_is_answered_only_when_turns_advance() -> None:
    job = _job(awaiting_turn=True, turns_count=0, turns_baseline=0)
    sieve_service.apply_scrape_response(
        job, {"status": "done", "turns": [{"question": "q"}]}
    )
    assert job.turns_count == 1
    assert job.awaiting_turn is False


def test_follow_up_is_not_answered_when_turns_have_not_advanced() -> None:
    job = _job(awaiting_turn=True, turns_count=1, turns_baseline=1)
    sieve_service.apply_scrape_response(
        job, {"status": "done", "turns": [{"question": "q"}]}
    )
    assert job.turns_count == 1
    assert job.awaiting_turn is True, (
        "a done run with unchanged turns is the previous answer, not the new one"
    )


def test_follow_up_stays_pending_while_running_even_if_turns_advanced() -> None:
    job = _job(awaiting_turn=True, turns_count=0, turns_baseline=0)
    sieve_service.apply_scrape_response(
        job, {"status": "running", "turns": [{"question": "q"}]}
    )
    assert job.turns_count == 1
    assert job.awaiting_turn is True


# ---------------------------------------------------------------------------
# Backoff
# ---------------------------------------------------------------------------
def test_next_poll_delay_backs_off_to_the_ceiling() -> None:
    assert sieve_service.next_poll_delay(0) == settings.sieve_poll_initial_seconds
    assert sieve_service.next_poll_delay(50) == settings.sieve_poll_max_seconds
    assert (
        sieve_service.next_poll_delay(2)
        <= settings.sieve_poll_max_seconds
    )


# ---------------------------------------------------------------------------
# Persistence and orchestration
# ---------------------------------------------------------------------------
def test_start_job_persists_session_id_durably(db) -> None:
    profile = _make_profile(db)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(202, json={"status": "queued", "session_id": "sess-1"})

    job = sieve_service.start_job(
        db, profile, instruction="Extract quotes", client=_client(handler)
    )

    assert job.session_id == "sess-1"
    assert job.status in {"queued", "running"}

    # A cold read (as after a restart) still finds the session id.
    db.expire_all()
    stored = sieve_service.get_job(db, profile, job.id)
    assert stored is not None
    assert stored.session_id == "sess-1"


def test_poll_job_applies_a_done_response(db) -> None:
    profile = _make_profile(db)
    responses = iter(
        [
            httpx.Response(202, json={"status": "queued", "session_id": "sess-2"}),
            httpx.Response(
                200,
                json={
                    "status": "done",
                    "summary": {"rows": 1},
                    "files": [],
                    "schema_conformance": {"status": "pass"},
                },
            ),
        ]
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return next(responses)

    client = _client(handler)
    job = sieve_service.start_job(db, profile, instruction="x", client=client)
    polled = sieve_service.poll_job(db, job, client=client, force=True)

    assert polled.status == "done"
    assert polled.summary == {"rows": 1}


def test_poll_job_keeps_the_status_when_sieve_is_unreachable(db) -> None:
    profile = _make_profile(db)

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down", request=request)

    client = _client(handler)
    job = ScrapeJob(
        student_id=profile.id,
        instruction="x",
        request_payload={},
        session_id="sess-3",
        status="running",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    polled = sieve_service.poll_job(db, job, client=client, force=True)
    assert polled.status == "running", "a transient outage must not fail a run"
    assert polled.error


def test_start_job_records_an_error_without_retrying_the_post(db) -> None:
    profile = _make_profile(db)
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        raise httpx.ConnectTimeout("timed out", request=request)

    client = _client(handler)
    with pytest.raises(SieveError):
        sieve_service.start_job(db, profile, instruction="x", client=client)

    assert calls["n"] == 1
    jobs = sieve_service.list_jobs(db, profile)
    assert len(jobs) == 1
    assert jobs[0].status == "error"


def test_add_turn_records_before_posting_and_waits_for_the_new_turn(db) -> None:
    profile = _make_profile(db)
    state = {"turn_posted": False}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path.endswith("/messages"):
            state["turn_posted"] = True
            return httpx.Response(202, json={"status": "running"})
        if request.method == "POST":
            return httpx.Response(
                202, json={"status": "queued", "session_id": "sess-4"}
            )
        turns = [{"question": "q", "answer": "a"}] if state["turn_posted"] else []
        return httpx.Response(200, json={"status": "done", "turns": turns})

    client = _client(handler)
    job = sieve_service.start_job(db, profile, instruction="x", client=client)

    # Pretend the first run finished before the follow-up.
    job.status = "done"
    db.commit()

    sieve_service.add_turn(db, job, instruction="follow up", client=client)
    assert job.awaiting_turn is True
    assert job.turns_baseline == 0
    assert job.status == "running"

    sieve_service.poll_job(db, job, client=client, force=True)
    assert job.turns_count == 1
    assert job.awaiting_turn is False


def test_add_turn_409_leaves_no_pending_turn(db) -> None:
    profile = _make_profile(db)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/messages"):
            return httpx.Response(409, json={"error": "in flight"})
        return httpx.Response(202, json={"status": "done", "session_id": "sess-5"})

    client = _client(handler)
    job = sieve_service.start_job(db, profile, instruction="x", client=client)

    with pytest.raises(SieveError) as info:
        sieve_service.add_turn(db, job, instruction="follow up", client=client)

    assert info.value.code == "turn_in_flight"
    assert job.awaiting_turn is False


# ---------------------------------------------------------------------------
# Behaviour when sieve is not configured
# ---------------------------------------------------------------------------
def test_capabilities_reports_not_configured(monkeypatch) -> None:
    monkeypatch.setattr(settings, "sieve_api_key", "")
    with TestClient(app) as client:
        response = client.get("/api/scrapes/capabilities")
    assert response.status_code == 200
    assert response.json()["configured"] is False


def test_start_scrape_is_unavailable_when_not_configured(auth_client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "sieve_api_key", "")
    response = auth_client.post(
        "/api/scrapes", json={"instruction": "Extract the text and author of each quote"}
    )
    assert response.status_code == 503
    assert "SIEVE_API_KEY" in response.json()["detail"]


def test_output_schema_over_the_size_limit_is_rejected(auth_client) -> None:
    oversized = {"type": "object", "description": "a" * 40000}
    response = auth_client.post(
        "/api/scrapes",
        json={"instruction": "x", "output_schema": oversized},
    )
    assert response.status_code == 422
