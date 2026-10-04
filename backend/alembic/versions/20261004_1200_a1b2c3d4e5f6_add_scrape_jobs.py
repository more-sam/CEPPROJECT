"""add scrape jobs

Revision ID: a1b2c3d4e5f6
Revises: 7eeceefb8a48
Create Date: 2026-10-04 12:00:00.000000+00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "7eeceefb8a48"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scrape_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(length=128), nullable=True),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("request_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("compliance_mode", sa.String(length=16), nullable=False, server_default="regular"),
        sa.Column("target_urls", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("output_schema", sa.JSON(), nullable=True),
        sa.Column("table_shape", sa.String(length=8), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="queued"),
        sa.Column("turns_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("turns_baseline", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("awaiting_turn", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("poll_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.JSON(), nullable=True),
        sa.Column("files", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("schema_conformance", sa.JSON(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("refusal", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["student_profiles.id"],
            name="fk_scrape_jobs_student_id",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_scrape_jobs_student_id", "scrape_jobs", ["student_id"])
    op.create_index("ix_scrape_jobs_session_id", "scrape_jobs", ["session_id"], unique=True)
    op.create_index("ix_scrape_jobs_status", "scrape_jobs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_scrape_jobs_status", table_name="scrape_jobs")
    op.drop_index("ix_scrape_jobs_session_id", table_name="scrape_jobs")
    op.drop_index("ix_scrape_jobs_student_id", table_name="scrape_jobs")
    op.drop_table("scrape_jobs")
