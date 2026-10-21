"""Entrypoint for RideEat User Service (Port 8002)."""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure both service root and rideeat-soa monorepo root are on sys.path
_SERVICE_ROOT = Path(__file__).resolve().parents[1]
_MONOREPO_ROOT = Path(__file__).resolve().parents[3]
for _p in (str(_SERVICE_ROOT), str(_MONOREPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.common.config import BaseServiceSettings
from services.common.db.base import DatabaseManager
from services.common.exceptions import register_exception_handlers
from services.common.messaging.kafka_bus import KafkaEventBus
from services.common.observability.telemetry import ObservabilityManager

from app.qr_generator import QRCodeGenerator
from app.repositories import AddressRepository, DriverProfileRepository, UserProfileRepository
from app.routes import router as user_router
from app.service import UserApplicationService


class UserServiceSettings(BaseServiceSettings):
    """Configuration specific to User Service."""

    SERVICE_NAME: str = "user-service"
    PORT: int = 8002
    DATABASE_URL: str = "sqlite+aiosqlite:///./user_service.db"


settings = UserServiceSettings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle for database, Kafka, QR generator, and demo seed data."""
    db_manager = DatabaseManager(settings.DATABASE_URL)
    await db_manager.create_tables()

    event_bus = KafkaEventBus(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        service_name=settings.SERVICE_NAME,
        enabled=settings.KAFKA_ENABLED,
    )
    await event_bus.start()

    qr_generator = QRCodeGenerator(issuer="RideEat-UserService")

    app.state.db_manager = db_manager
    app.state.event_bus = event_bus
    app.state.qr_generator = qr_generator

    # Seed demo profiles, addresses, and driver profiles on startup
    async for session in db_manager.get_session():
        service = UserApplicationService(
            profile_repo=UserProfileRepository(session=session),
            address_repo=AddressRepository(session=session),
            driver_repo=DriverProfileRepository(session=session),
            event_publisher=event_bus,
            qr_generator=qr_generator,
        )
        await service.seed_demo_data()
        break

    yield

    await event_bus.stop()
    await db_manager.dispose()


def create_app() -> FastAPI:
    """Application factory creating and instrumenting the User Service FastAPI app."""
    app = FastAPI(
        title="RideEat User & Driver Profile Service",
        description="User Profiles, Saved Addresses, Driver Onboarding State Machine & QR Verification",
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
    observability = ObservabilityManager(
        service_name=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
    )
    observability.instrument_app(app)
    app.include_router(user_router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
