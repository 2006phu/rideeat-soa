"""Kafka Event Handlers for Notification Service (Observer Pattern & Polymorphism)."""

import logging
from typing import Dict, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from services.common.messaging.interfaces import DomainEvent, IEventHandler
from app.channels import CompositeNotificationDispatcher
from app.repositories import NotificationRepository
from app.schemas import SendNotificationRequest
from app.service import NotificationApplicationService

logger = logging.getLogger(__name__)

SUBSCRIBED_NOTIFICATION_TOPICS: List[str] = [
    "ride.created",
    "ride.accepted",
    "ride.completed",
    "ride.cancelled",
    "order.created",
    "order.confirmed",
    "order.completed",
    "payment.success",
    "driver.approved",
]


class KafkaTopicNotificationHandler(IEventHandler):
    """Concrete IEventHandler translating domain events on a specific Kafka topic into user notifications."""

    _TEMPLATES: Dict[str, Tuple[str, str]] = {
        "ride.created": (
            "Đặt chuyến xe thành công",
            "Hệ thống đang tìm tài xế gần nhất cho chuyến đi #{ref} của bạn.",
        ),
        "ride.accepted": (
            "Tài xế đã nhận chuyến",
            "Tài xế đang di chuyển đến điểm đón cho chuyến xe #{ref}.",
        ),
        "ride.completed": (
            "Chuyến đi hoàn tất",
            "Cảm ơn bạn đã hoàn thành chuyến đi #{ref} cùng RideEat!",
        ),
        "ride.cancelled": (
            "Chuyến đi đã hủy",
            "Chuyến xe #{ref} đã được hủy theo yêu cầu.",
        ),
        "order.created": (
            "Đơn đồ ăn đã được tạo",
            "Đơn hàng #{ref} đã được gửi tới nhà hàng.",
        ),
        "order.confirmed": (
            "Nhà hàng đã xác nhận đơn",
            "Nhà hàng đang chuẩn bị món ăn cho đơn hàng #{ref}.",
        ),
        "order.completed": (
            "Giao đồ ăn thành công",
            "Đơn hàng #{ref} đã được giao thành công. Chúc bạn ngon miệng!",
        ),
        "payment.success": (
            "Thanh toán thành công",
            "Giao dịch thanh toán cho #{ref} đã được xử lý thành công.",
        ),
        "driver.approved": (
            "Hồ sơ tài xế được duyệt",
            "Chúc mừng! Tài khoản đối tác tài xế #{ref} đã được kích hoạt.",
        ),
    }

    def __init__(
        self,
        topic: str,
        session_factory: async_sessionmaker[AsyncSession],
        dispatcher: CompositeNotificationDispatcher,
    ) -> None:
        self._topic = topic
        self._session_factory = session_factory
        self._dispatcher = dispatcher

    @property
    def subscribed_topic(self) -> str:
        return self._topic

    async def handle(self, event: DomainEvent) -> None:
        payload = event.payload or {}
        recipient_id = str(
            payload.get("user_id")
            or payload.get("customer_id")
            or payload.get("driver_id")
            or payload.get("recipient_id")
            or "customer-001"
        )
        ref = str(
            payload.get("ride_id")
            or payload.get("order_id")
            or payload.get("reference_id")
            or payload.get("transaction_id")
            or payload.get("id")
            or event.event_id[:8]
        )

        title_tpl, body_tpl = self._TEMPLATES.get(
            self._topic,
            (f"Thông báo hệ thống ({self._topic})", "Sự kiện #{ref} vừa được cập nhật."),
        )
        title = title_tpl.format(ref=ref)
        body = body_tpl.format(ref=ref)

        async with self._session_factory() as session:
            repo = NotificationRepository(session)
            service = NotificationApplicationService(
                repository=repo,
                dispatcher=self._dispatcher,
            )
            await service.send_notification(
                SendNotificationRequest(
                    recipient_id=recipient_id,
                    title=title,
                    body=body,
                    channel="all",
                    event_topic=self._topic,
                    metadata=payload,
                )
            )
