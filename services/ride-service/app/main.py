"""Main Entrypoint for Ride Service (Port 8003)."""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure both rideeat-soa root and ride-service directory are on sys.path
_SERVICE_DIR = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
for _p in (str(_PROJECT_ROOT), str(_SERVICE_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai_assistant import RideAIAssistant
from app.models import Ride  # noqa: F401 - register ORM metadata
from app.routes import router as ride_router
from app.websocket_manager import RideTrackingWebSocketManager
from services.common.config import BaseServiceSettings
from services.common.db.base import DatabaseManager
from services.common.exceptions import register_exception_handlers
from services.common.http_client import InterServiceHttpClient
from services.common.messaging.kafka_bus import KafkaEventBus
from services.common.observability.telemetry import ObservabilityManager


class RideServiceSettings(BaseServiceSettings):
    """Configuration specific to Ride Service (Port 8003)."""

    SERVICE_NAME: str = "ride-service"
    PORT: int = 8003
    DATABASE_URL: str = "sqlite+aiosqlite:///./ride_service.db"


settings = RideServiceSettings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and tear down DB, Kafka Event Bus, HTTP Clients, WebSocket Manager, and AI Assistant."""
    db_manager = DatabaseManager(database_url=settings.DATABASE_URL, echo=False)
    await db_manager.create_tables()

    event_bus = KafkaEventBus(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        service_name=settings.SERVICE_NAME,
        enabled=settings.KAFKA_ENABLED,
    )
    await event_bus.start()

    map_client = InterServiceHttpClient(
        service_name="map-service",
        base_url=settings.MAP_SERVICE_URL,
    )
    promo_client = InterServiceHttpClient(
        service_name="promo-service",
        base_url=settings.PROMO_SERVICE_URL,
    )
    ws_manager = RideTrackingWebSocketManager()
    ai_assistant = RideAIAssistant(gemini_api_key=settings.GEMINI_API_KEY)

    app.state.settings = settings
    app.state.db_manager = db_manager
    app.state.event_bus = event_bus
    app.state.map_client = map_client
    app.state.promo_client = promo_client
    app.state.ws_manager = ws_manager
    app.state.ai_assistant = ai_assistant

    yield

    await event_bus.stop()
    await db_manager.dispose()


def create_app() -> FastAPI:
    """Application Factory for Ride Service."""
    app = FastAPI(
        title="RideEat Ride Service",
        description="Core Ride-Hailing Microservice with Polymorphic Pricing Strategies, State Machine & Live WebSockets",
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

    observability = ObservabilityManager(
        service_name=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
    )
    observability.instrument_app(app)
    register_exception_handlers(app)
    app.include_router(ride_router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
