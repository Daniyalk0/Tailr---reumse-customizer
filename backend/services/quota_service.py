from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert

from backend.database import SessionLocal
from backend.models import GuestUsage

GUEST_DAILY_LIMIT = 1


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def reserve_guest_generation(
    guest_id: str,
    daily_limit: int = GUEST_DAILY_LIMIT,
) -> date:
    usage_date = _today_utc()

    with SessionLocal.begin() as session:
        # Create today's usage row if it doesn't exist.
        session.execute(
            insert(GuestUsage)
            .values(
                guest_id=guest_id,
                usage_date=usage_date,
                successful_generations=0,
                reserved_generations=0,
            )
            .on_conflict_do_nothing(constraint="uq_guest_usage_date")
        )

        # Atomically reserve a slot only if capacity remains.
        result = session.execute(
            update(GuestUsage)
            .where(
                GuestUsage.guest_id == guest_id,
                GuestUsage.usage_date == usage_date,
                (GuestUsage.successful_generations + GuestUsage.reserved_generations)
                < daily_limit,
            )
            .values(reserved_generations=GuestUsage.reserved_generations + 1)
        )

        if result.rowcount != 1:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "DAILY_QUOTA_EXCEEDED",
                    "message": "You've used your daily resume generation. Try again tomorrow.",
                    "daily_limit": daily_limit,
                },
            )

    return usage_date


def finalize_guest_generation(
    guest_id: str,
    usage_date: date,
    *,
    succeeded: bool,
) -> None:
    with SessionLocal.begin() as session:
        values = {
            "reserved_generations": GuestUsage.reserved_generations - 1,
        }

        if succeeded:
            values["successful_generations"] = GuestUsage.successful_generations + 1

        result = session.execute(
            update(GuestUsage)
            .where(
                GuestUsage.guest_id == guest_id,
                GuestUsage.usage_date == usage_date,
                GuestUsage.reserved_generations > 0,
            )
            .values(**values)
        )

        if result.rowcount != 1:
            raise RuntimeError("Could not finalize the quota reservation")


def get_guest_quota_status(
    guest_id: str,
    daily_limit: int = GUEST_DAILY_LIMIT,
) -> dict:
    """Read-only snapshot of the guest's quota for the current UTC day.

    Mirrors the capacity expression used by ``reserve_guest_generation`` so the
    UI and the enforcement path cannot disagree. Never writes, never raises for
    a guest with no usage row yet.
    """
    usage_date = _today_utc()

    with SessionLocal() as session:
        row = session.execute(
            select(GuestUsage).where(
                GuestUsage.guest_id == guest_id,
                GuestUsage.usage_date == usage_date,
            )
        ).scalar_one_or_none()

    used = row.successful_generations if row is not None else 0
    reserved = row.reserved_generations if row is not None else 0
    remaining = max(0, daily_limit - used - reserved)

    return {
        "usage_date": usage_date.isoformat(),
        "daily_limit": daily_limit,
        "used": used,
        "remaining": remaining,
    }
