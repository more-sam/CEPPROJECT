"""Entrypoint for `python -m app.seed`.

Runs inside the application's own session factory so it uses the same
DATABASE_URL as the API.

    python -m app.seed                 # seed/refresh reference data (idempotent)
    python -m app.seed --reset-demo    # additionally restore the demo account
"""

import argparse
import sys

from app.core.config import settings
from app.database.database import SessionLocal
from app.seed.seeder import reset_demo_profile, run_seed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.seed", description=__doc__)
    parser.add_argument(
        "--reset-demo",
        action="store_true",
        help=(
            "Restore the development demo account to its documented starting "
            "state: baseline skills only, and no resumes, roadmaps, progress, "
            "assessment results or saved opportunities."
        ),
    )
    args = parser.parse_args(argv)

    print(f"Seeding {settings.app_name} ({settings.app_env}) …")
    session = SessionLocal()
    try:
        summary = run_seed(session)
        reset_summary = reset_demo_profile(session) if args.reset_demo else None
    except Exception as exc:  # noqa: BLE001 - surface the failure clearly
        session.rollback()
        print(f"Seeding failed: {exc}", file=sys.stderr)
        return 1
    finally:
        session.close()

    print("Seed complete:")
    for key, value in summary.items():
        print(f"  {key:18} {value}")

    if reset_summary is not None:
        print()
        if reset_summary.get("reset"):
            print("Demo account reset to its documented baseline:")
            print(f"  {reset_summary['email']}")
            print(f"  baseline skills:        {reset_summary['baseline_skills']}")
            print(f"  extra skills removed:   {reset_summary['extra_skills_removed']}")
        else:
            print(f"Demo account was not reset ({reset_summary.get('reason')}).")

    if summary.get("demo_user"):
        print()
        print("Development demo account (NOT for production use):")
        print(f"  email:    {settings.demo_user_email}")
        print(f"  password: {settings.demo_user_password}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
