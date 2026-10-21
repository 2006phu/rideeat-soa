"""Application Service for Multi-Channel Notification Dispatch & Inbox Persistence."""

from typing import List, Optional

from services.common.domain.base_service import BaseApplicationService
from services.common.messaging.interfaces import IEventPublisher
from app.channels import CompositeNotificationDispatcher
from app.models import NotificationRecord
from app.repositories import NotificationRepository
from app.schemas import SendNotificationRequest


class NotificationApplicationService(BaseApplicationService[NotificationRepository]):
    """Encapsulates persisting notifications and dispatching them via CompositeNotificationDispatcher."""

    def __init__(
        self,
        repository: NotificationRepository,
        dispatcher: CompositeNotificationDispatcher,
        event_publisher: Optional[IEventPublisher] = None,
    ) -> None:
        super().__init__(repository=repository, event_publisher=event_publisher)
        self._dispatcher = dispatcher

    async def send_notification(
        self, payload: SendNotificationRequest
    ) -> NotificationRecord:
        """Persist notification record and dispatch across configured channels."""
        channel_label = (
            self._dispatcher.channel_name
            if payload.channel == "all"
            else payload.channel
        )
        record = NotificationRecord(
            recipient_id=payload.recipient_id,
            title=payload.title,
            body=payload.body,
            channel=channel_label,
            event_topic=payload.event_topic or "manual.notification",
            is_read=False,
        )
        record = await self.repository.save(record)

        metadata = dict(payload.metadata or {})
        metadata["notification_id"] = record.id
        metadata["event_topic"] = record.event_topic
        metadata["preferred_channel"] = payload.channel

        await self._dispatcher.send(
            recipient_id=payload.recipient_id,
            title=payload.title,
            body=payload.body,
            metadata=metadata,
        )
        return record

    async def list_user_notifications(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[NotificationRecord]:
        """List notifications for a specific user ordered by newest first."""
        return await self.repository.list_by_recipient(
            recipient_id=user_id, skip=skip, limit=limit
        )

    async def mark_notification_read(self, notification_id: str) -> NotificationRecord:
        """Mark a specific notification as read using its encapsulated domain method."""
        record = await self.repository.get_by_id_or_raise(notification_id)
        record.mark_as_read()
        return await self.repository.save(record)
