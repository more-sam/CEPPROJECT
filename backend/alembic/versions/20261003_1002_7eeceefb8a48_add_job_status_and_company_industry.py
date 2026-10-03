"""add job status and company industry

Revision ID: 7eeceefb8a48
Revises: ce04ea8c5a6c
Create Date: 2026-10-03 10:02:28.943420+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7eeceefb8a48'
down_revision: Union[str, None] = 'ce04ea8c5a6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing rows get the honest default "unknown": the table alone never
    # proved applications were open (spec section 7/22). The seeder then writes
    # explicit statuses for every demo opportunity.
    op.add_column(
        'jobs',
        sa.Column('status', sa.String(length=16), nullable=False, server_default='unknown'),
    )
    op.add_column('companies', sa.Column('industry', sa.String(length=120), nullable=True))
    op.add_column('jobs', sa.Column('last_verified_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_jobs_status'), table_name='jobs')
    op.drop_column('jobs', 'last_verified_at')
    op.drop_column('jobs', 'status')
    op.drop_column('companies', 'industry')
