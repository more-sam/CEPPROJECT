"""Device login for the Sieve scrape API.

    python -m app.sieve_login

The user approves in their own browser; this process only polls. The approved
key is written straight into the root `.env` as `SIEVE_API_KEY` and is never
printed, logged or returned.

This mirrors the phishing safeguards in the Sieve device flow: the approval page
shows the requested-from location, labels the tool name as self-reported, warns
the user to approve only codes they started, requires an explicit click, and the
codes expire after 10 minutes and work once. This helper therefore only *shows*
the link and code - it never opens the link, signs in, or approves anything.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import httpx

from app.core.config import REPO_ROOT, settings

CLIENT_NAME = "SkillBridge AI"
DEFAULT_BASE_URL = "https://scrape.usesieve.com"


def _env_path() -> Path:
    return REPO_ROOT / ".env"


def upsert_env_var(path: Path, key: str, value: str) -> bool:
    """Set `key=value` in `path`, replacing an existing line or appending.

    Returns True when the value changed. The file is created if absent.
    """
    lines: list[str] = []
    if path.is_file():
        lines = path.read_text(encoding="utf-8").splitlines()

    prefix = f"{key}="
    replaced = False
    for index, line in enumerate(lines):
        if line.startswith(prefix):
            lines[index] = f"{key}={value}"
            replaced = True
            break
    if not replaced:
        if lines and lines[-1].strip():
            lines.append("")
        lines.append(f"{key}={value}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return True


def request_device_code(base_url: str) -> dict:
    response = httpx.post(
        f"{base_url.rstrip('/')}/api/auth/device/code",
        json={"client_name": CLIENT_NAME},
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def poll_for_token(
    base_url: str,
    device_code: str,
    *,
    interval: int,
    expires_in: int,
    sleep=time.sleep,
) -> str:
    """Poll until approved, returning the API key.

    Raises `SystemExit` with a clear message for every terminal outcome.
    """
    endpoint = f"{base_url.rstrip('/')}/api/auth/device/token"
    deadline = time.monotonic() + max(0, expires_in)

    while time.monotonic() < deadline:
        try:
            response = httpx.post(
                endpoint, json={"device_code": device_code}, timeout=30.0
            )
        except httpx.HTTPError as exc:
            raise SystemExit(f"Network error while polling: {exc}")

        if response.status_code == 200:
            payload = response.json()
            api_key = payload.get("api_key")
            if not api_key:
                raise SystemExit("Sieve approved the login but returned no API key.")
            return str(api_key)

        error = ""
        try:
            error = str(response.json().get("error") or "")
        except ValueError:
            error = ""

        if error == "authorization_pending":
            sleep(interval)
            continue
        if error == "slow_down":
            interval += 5
            sleep(interval)
            continue
        if error == "access_denied":
            raise SystemExit("You declined the request in the browser. Nothing was changed.")
        if error == "expired_token":
            raise SystemExit("The code expired. Run the command again to start over.")
        raise SystemExit(
            f"Sieve returned an unexpected response (HTTP {response.status_code}"
            f"{', ' + error if error else ''})."
        )

    raise SystemExit("The code expired before it was approved. Run the command again.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.sieve_login", description=__doc__)
    parser.add_argument(
        "--base-url",
        default=settings.sieve_base_url or DEFAULT_BASE_URL,
        help="Sieve base URL (default: SIEVE_BASE_URL, else the public API).",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=None,
        help="Where to store the key (default: the repository-root .env).",
    )
    args = parser.parse_args(argv)

    target = args.env_file or _env_path()

    print(f"Requesting a device code from {args.base_url.rstrip('/')} …")
    try:
        payload = request_device_code(args.base_url)
    except httpx.HTTPError as exc:
        print(f"Could not start the device login: {exc}", file=sys.stderr)
        return 1

    user_code = payload.get("user_code") or ""
    verification_uri = payload.get("verification_uri_complete") or payload.get(
        "verification_uri"
    )
    device_code = payload.get("device_code") or ""
    expires_in = int(payload.get("expires_in") or 600)
    interval = int(payload.get("interval") or 5)

    if not (device_code and user_code and verification_uri):
        print("Sieve returned an incomplete device-code response.", file=sys.stderr)
        return 1

    print()
    print("  Open this link in your browser and approve the code:")
    print(f"    {verification_uri}")
    print()
    print(f"  Your code:  {user_code}")
    print()
    print("  Approve ONLY a code you started yourself. The tool name on the")
    print("  approval page is self-reported. Check the location it was requested")
    print("  from matches yours, then click Approve. Never share this code.")
    print()
    print(f"Waiting for approval (the code expires in {expires_in // 60} minutes) …")

    api_key = poll_for_token(
        args.base_url,
        device_code,
        interval=interval,
        expires_in=expires_in,
    )

    upsert_env_var(target, "SIEVE_API_KEY", api_key)
    stored = target.resolve()
    print()
    print(f"Approved. SIEVE_API_KEY was written to {stored}.")
    print("The key was not printed. Restart the API so it is picked up:")
    print("  docker compose up -d")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
