from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class GuestUsage(Base):
    __tablename__ = "guest_usage"

    __table_args__ = (
        UniqueConstraint(
            "guest_id",
            "usage_date",
            name="uq_guest_usage_date",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    usage_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Resume customization quota
    successful_generations: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    reserved_generations: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    # ATS analysis quota — independent of customization
    ats_successful_generations: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    ats_reserved_generations: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
