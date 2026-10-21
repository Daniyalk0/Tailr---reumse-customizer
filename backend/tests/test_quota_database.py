from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, select

from backend.database import SessionLocal
from backend.models import GuestUsage
from backend.services.quota_service import finalize_guest_generation


def test_failed_generation_releases_real_database_reservation():
    guest_id = str(uuid4())
    usage_date = datetime.now(timezone.utc).date()

    try:
        # Create an isolated test guest with one active reservation.
        with SessionLocal.begin() as session:
            session.add(
                GuestUsage(
                    guest_id=guest_id,
                    usage_date=usage_date,
                    successful_generations=0,
                    reserved_generations=1,
                )
            )

        # Simulate a failed generation without calling Groq.
        finalize_guest_generation(
            guest_id,
            usage_date,
            succeeded=False,
        )

        # Verify the actual PostgreSQL counters.
        with SessionLocal() as session:
            usage = session.execute(
                select(GuestUsage).where(
                    GuestUsage.guest_id == guest_id,
                    GuestUsage.usage_date == usage_date,
                )
            ).scalar_one()

            assert usage.reserved_generations == 0
            assert usage.successful_generations == 0

    finally:
        # Remove only this test's uniquely identified row.
        with SessionLocal.begin() as session:
            session.execute(
                delete(GuestUsage).where(
                    GuestUsage.guest_id == guest_id,
                    GuestUsage.usage_date == usage_date,
                )
            )


def test_successful_generation_commits_usage_to_database():
    guest_id = str(uuid4())
    usage_date = datetime.now(timezone.utc).date()

    try:
        with SessionLocal.begin() as session:
            session.add(
                GuestUsage(
                    guest_id=guest_id,
                    usage_date=usage_date,
                    successful_generations=0,
                    reserved_generations=1,
                )
            )

        finalize_guest_generation(
            guest_id,
            usage_date,
            succeeded=True,
        )

        with SessionLocal() as session:
            usage = session.execute(
                select(GuestUsage).where(
                    GuestUsage.guest_id == guest_id,
                    GuestUsage.usage_date == usage_date,
                )
            ).scalar_one()

            assert usage.reserved_generations == 0
            assert usage.successful_generations == 1

    finally:
        with SessionLocal.begin() as session:
            session.execute(
                delete(GuestUsage).where(
                    GuestUsage.guest_id == guest_id,
                    GuestUsage.usage_date == usage_date,
                )
            )
