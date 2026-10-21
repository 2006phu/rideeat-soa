"""Main Entrypoint for Food Service (Port 8004)."""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure both rideeat-soa root and food-service directory are on sys.path
_SERVICE_DIR = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
for _p in (str(_PROJECT_ROOT), str(_SERVICE_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai_recommender import FoodAIRecommender
from app.cart_manager import RedisCartManager
from app.models import FoodOrder, MenuItem, Restaurant  # noqa: F401 - register ORM models
from app.routes import router as food_router
from app.service import OrderTrackingWebSocketManager, seed_initial_vietnamese_restaurants
from services.common.cache.redis_client import RedisManager
from services.common.config import BaseServiceSettings
from services.common.db.base import DatabaseManager
from services.common.exceptions import register_exception_handlers
from services.common.http_client import InterServiceHttpClient
from services.common.messaging.kafka_bus import KafkaEventBus
from services.common.observability.telemetry import ObservabilityManager


class FoodServiceSettings(BaseServiceSettings):
    """Configuration specific to Food Service (Port 8004)."""

    SERVICE_NAME: str = "food-service"
    PORT: int = 8004
    DATABASE_URL: str = "sqlite+aiosqlite:///./food_service.db"


settings = FoodServiceSettings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB, seed 4 Vietnamese restaurants, connect Redis & Kafka, and tear down cleanly."""
    db_manager = DatabaseManager(database_url=settings.DATABASE_URL, echo=False)
    await db_manager.create_tables()

    # Seed realistic Vietnamese restaurants and dishes on startup
    async for session in db_manager.get_session():
        await seed_initial_vietnamese_restaurants(session)
        break

    redis_manager = RedisManager(redis_url=settings.REDIS_URL)
    await redis_manager.connect()

    cart_manager = RedisCartManager(cache_provider=redis_manager)

    event_bus = KafkaEventBus(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        service_name=settings.SERVICE_NAME,
        enabled=settings.KAFKA_ENABLED,
    )
    await event_bus.start()

    promo_client = InterServiceHttpClient(
        service_name="promo-service",
        base_url=settings.PROMO_SERVICE_URL,
    )
    ws_manager = OrderTrackingWebSocketManager()
    ai_recommender = FoodAIRecommender(gemini_api_key=settings.GEMINI_API_KEY)

    app.state.settings = settings
    app.state.db_manager = db_manager
    app.state.redis_manager = redis_manager
    app.state.cart_manager = cart_manager
    app.state.event_bus = event_bus
    app.state.promo_client = promo_client
    app.state.ws_manager = ws_manager
    app.state.ai_recommender = ai_recommender

    yield

    await event_bus.stop()
    await redis_manager.close()
    await db_manager.dispose()


def create_app() -> FastAPI:
    """Application Factory for Food Service."""
    app = FastAPI(
        title="RideEat Food Service",
        description="Food Delivery Microservice with Redis Menu Cache, Redis Carts, Order State Machine & AI Recommender",
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
    app.include_router(food_router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
