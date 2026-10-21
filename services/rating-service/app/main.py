"""FastAPI Entrypoint for Rating & Review Service (Port 8007)."""

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

from services.common.cache.redis_client import RedisManager
from services.common.config import BaseServiceSettings
from services.common.db.base import DatabaseManager
from services.common.exceptions import register_exception_handlers
from services.common.messaging.kafka_bus import KafkaEventBus
from services.common.observability.telemetry import ObservabilityManager
from app.models import Review, TargetType
from app.repositories import ReviewRepository
from app.routes import router as rating_router


class RatingServiceSettings(BaseServiceSettings):
    """Configuration class for Rating Service."""

    SERVICE_NAME: str = "rating-service"
    PORT: int = 8007
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./rating_service.db"
    )


settings = RatingServiceSettings()
db_manager = DatabaseManager(settings.DATABASE_URL)
redis_manager = RedisManager(settings.REDIS_URL)
kafka_bus = KafkaEventBus(
    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
    service_name=settings.SERVICE_NAME,
    enabled=settings.KAFKA_ENABLED,
)
observability = ObservabilityManager(
    service_name=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
)


async def seed_demo_reviews() -> None:
    """Seed initial demo reviews if database is empty."""
    async for session in db_manager.get_session():
        repo = ReviewRepository(session)
        if await repo.count_all() == 0:
            samples = [
                Review(
                    reviewer_id="customer-001",
                    target_id="driver-001",
                    target_type=TargetType.DRIVER.value,
                    reference_id="ride-seed-001",
                    stars=5,
                    comment="Tài xế thân thiện, lái xe an toàn và đúng giờ!",
                ),
                Review(
                    reviewer_id="customer-002",
                    target_id="driver-001",
                    target_type=TargetType.DRIVER.value,
                    reference_id="ride-seed-002",
                    stars=5,
                    comment="Xe sạch sẽ, chạy êm.",
                ),
                Review(
                    reviewer_id="customer-001",
                    target_id="rest-001",
                    target_type=TargetType.RESTAURANT.value,
                    reference_id="order-seed-001",
                    stars=5,
                    comment="Phở bò thơm ngon, đóng gói cẩn thận và còn nóng hổi!",
                ),
            ]
            for sample in samples:
                await repo.save(sample)
        break


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = settings
    app.state.db_manager = db_manager
    app.state.redis_manager = redis_manager
    app.state.kafka_bus = kafka_bus

    await db_manager.create_tables()
    await redis_manager.connect()
    await seed_demo_reviews()
    await kafka_bus.start()
    yield
    await kafka_bus.stop()
    await redis_manager.close()
    await db_manager.dispose()


app = FastAPI(
    title="RideEat Rating & Review Service",
    description="SOA Microservice for Driver & Restaurant Reviews with Redis Summary Caching",
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
app.include_router(rating_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
