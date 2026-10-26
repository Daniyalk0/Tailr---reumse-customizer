"""add ATS guest quota counters

Revision ID: c9fd1600ea19
Revises: 6c93096dafa6
Create Date: 2026-10-26 20:38:34.080983

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9fd1600ea19'
down_revision: Union[str, Sequence[str], None] = '6c93096dafa6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "guest_usage",
        sa.Column(
            "ats_successful_generations",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "guest_usage",
        sa.Column(
            "ats_reserved_generations",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("guest_usage", "ats_reserved_generations")
    op.drop_column("guest_usage", "ats_successful_generations")
