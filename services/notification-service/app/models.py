"""Domain Entity for Persistent Notification Records (OOP Encapsulation & Inheritance)."""

from typing import Optional
from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from services.common.db.base import BaseORMModel, TimestampMixin, utc_now


class NotificationRecord(BaseORMModel, TimestampMixin):
    """Domain entity storing an inbox notification delivered to a user."""

    __tablename__ = "notifications"

    recipient_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(String(64), default="fcm,websocket,email", nullable=False)
    event_topic: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def mark_as_read(self) -> None:
        """Encapsulated domain behavior transitioning notification to read state."""
        self.is_read = True
        self.updated_at = utc_now()
