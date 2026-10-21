"""Entrypoint for RideEat Auth Service (Port 8001)."""

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
from services.common.security.firebase_auth import FirebaseAuthVerifier

from app.repositories import UserAccountRepository
from app.routes import router as auth_router
from app.service import AuthApplicationService


class AuthServiceSettings(BaseServiceSettings):
    """Configuration specific to Auth Service."""

    SERVICE_NAME: str = "auth-service"
    PORT: int = 8001
    DATABASE_URL: str = "sqlite+aiosqlite:///./auth_service.db"


settings = AuthServiceSettings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle for database, Kafka, and demo seed data."""
    db_manager = DatabaseManager(settings.DATABASE_URL)
    await db_manager.create_tables()

    event_bus = KafkaEventBus(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        service_name=settings.SERVICE_NAME,
        enabled=settings.KAFKA_ENABLED,
    )
    await event_bus.start()

    auth_verifier = FirebaseAuthVerifier(
        credentials_path=settings.FIREBASE_CREDENTIALS_PATH,
        secret_key=settings.JWT_SECRET_KEY,
    )

    app.state.db_manager = db_manager
    app.state.event_bus = event_bus
    app.state.auth_verifier = auth_verifier

    # Seed demo accounts on startup
    async for session in db_manager.get_session():
        repo = UserAccountRepository(session=session)
        service = AuthApplicationService(
            repository=repo,
            auth_verifier=auth_verifier,
            event_publisher=event_bus,
        )
        await service.seed_demo_accounts()
        break

    yield

    await event_bus.stop()
    await db_manager.dispose()


def create_app() -> FastAPI:
    """Application factory creating and instrumenting the Auth Service FastAPI app."""
    app = FastAPI(
        title="RideEat Auth Service",
        description="Authentication, Firebase OAuth / JWT Verification & Role-Based Access Control (RBAC)",
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
    app.include_router(auth_router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
