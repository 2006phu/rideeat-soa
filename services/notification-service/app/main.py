"""FastAPI Entrypoint for Multi-Channel Notification Service (Port 8009)."""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure rideeat-soa root is on sys.path for shared `services.common` imports
ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.common.config import BaseServiceSettings
from services.common.db.base import DatabaseManager
from services.common.exceptions import register_exception_handlers
from services.common.messaging.kafka_bus import KafkaEventBus
from services.common.observability.telemetry import ObservabilityManager
from app.channels import (
    CompositeNotificationDispatcher,
    EmailNotificationChannel,
    FCMNotificationChannel,
    WebSocketNotificationChannel,
)
from app.event_handlers import (
    SUBSCRIBED_NOTIFICATION_TOPICS,
    KafkaTopicNotificationHandler,
)
from app.models import NotificationRecord
from app.repositories import NotificationRepository
from app.routes import router as notification_router


class NotificationServiceSettings(BaseServiceSettings):
    """Configuration class for Notification Service."""

    SERVICE_NAME: str = "notification-service"
    PORT: int = 8009
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./notification_service.db"
    )


settings = NotificationServiceSettings()
db_manager = DatabaseManager(settings.DATABASE_URL)
kafka_bus = KafkaEventBus(
    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
    service_name=settings.SERVICE_NAME,
    enabled=settings.KAFKA_ENABLED,
)
observability = ObservabilityManager(
    service_name=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
)

ws_channel = WebSocketNotificationChannel()
fcm_channel = FCMNotificationChannel()
email_channel = EmailNotificationChannel()
dispatcher = CompositeNotificationDispatcher(
    channels=[fcm_channel, ws_channel, email_channel]
)


async def seed_demo_notifications() -> None:
    """Seed initial welcome notification if inbox is empty."""
    async for session in db_manager.get_session():
        repo = NotificationRepository(session)
        if await repo.count_all() == 0:
            welcome = NotificationRecord(
                recipient_id="customer-001",
                title="Chào mừng đến với RideEat!",
                body="Ví RideEat của bạn đã được tặng 500,000 VND và mã giảm giá GIAM20, FREESHIP15K, GRAB50.",
                channel="fcm,websocket,email",
                event_topic="system.welcome",
                is_read=False,
            )
            await repo.save(welcome)
        break


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = settings
    app.state.db_manager = db_manager
    app.state.kafka_bus = kafka_bus
    app.state.ws_channel = ws_channel
    app.state.dispatcher = dispatcher

    await db_manager.create_tables()
    await seed_demo_notifications()

    for topic in SUBSCRIBED_NOTIFICATION_TOPICS:
        kafka_bus.register_handler(
            KafkaTopicNotificationHandler(
                topic=topic,
                session_factory=db_manager._session_factory,
                dispatcher=dispatcher,
            )
        )
    await kafka_bus.start()
    yield
    await kafka_bus.stop()
    await db_manager.dispose()


app = FastAPI(
    title="RideEat Notification Service",
    description="SOA Event-Driven Multi-Channel Notification Service (FCM, WebSocket, Email)",
    version=settings.SERVICE_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
observability.instrument_app(app)
app.include_router(notification_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
