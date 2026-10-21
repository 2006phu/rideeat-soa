"""FastAPI Entrypoint for Promo, Voucher & Loyalty Service (Port 8008)."""

from datetime import datetime, timedelta, timezone
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
from app.models import DiscountType, Voucher
from app.repositories import LoyaltyAccountRepository, VoucherRepository
from app.routes import router as promo_router


class PromoServiceSettings(BaseServiceSettings):
    """Configuration class for Promo Service."""

    SERVICE_NAME: str = "promo-service"
    PORT: int = 8008
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./promo_service.db"
    )


settings = PromoServiceSettings()
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


async def seed_demo_vouchers() -> None:
    """Seed demo vouchers (GIAM20, FREESHIP15K, GRAB50) and initial loyalty account on startup."""
    expiry = datetime.now(timezone.utc) + timedelta(days=90)
    seed_items = [
        Voucher(
            code="GIAM20",
            title="Giảm 20% tối đa 30,000đ cho chuyến xe & đơn đồ ăn",
            discount_type=DiscountType.PERCENTAGE.value,
            discount_value=20.0,
            min_order_value=30_000.0,
            max_discount=30_000.0,
            usage_limit=1000,
            used_count=12,
            is_active=True,
            expires_at=expiry,
        ),
        Voucher(
            code="FREESHIP15K",
            title="Miễn phí giao hàng 15,000đ cho đơn từ 40,000đ",
            discount_type=DiscountType.FIXED.value,
            discount_value=15_000.0,
            min_order_value=40_000.0,
            max_discount=15_000.0,
            usage_limit=2000,
            used_count=45,
            is_active=True,
            expires_at=expiry,
        ),
        Voucher(
            code="GRAB50",
            title="Flash Sale Giảm 50% tối đa 50,000đ cho đơn từ 60,000đ",
            discount_type=DiscountType.PERCENTAGE.value,
            discount_value=50.0,
            min_order_value=60_000.0,
            max_discount=50_000.0,
            usage_limit=500,
            used_count=8,
            is_active=True,
            expires_at=expiry,
        ),
    ]
    async for session in db_manager.get_session():
        voucher_repo = VoucherRepository(session)
        for item in seed_items:
            existing = await voucher_repo.get_by_code(item.code)
            if existing is None:
                await voucher_repo.save(item)

        loyalty_repo = LoyaltyAccountRepository(session)
        await loyalty_repo.get_or_create("customer-001", initial_points=65)
        await loyalty_repo.get_or_create("user-customer-1", initial_points=65)
        break


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = settings
    app.state.db_manager = db_manager
    app.state.redis_manager = redis_manager
    app.state.kafka_bus = kafka_bus

    await db_manager.create_tables()
    await redis_manager.connect()
    await seed_demo_vouchers()
    await kafka_bus.start()
    yield
    await kafka_bus.stop()
    await redis_manager.close()
    await db_manager.dispose()


app = FastAPI(
    title="RideEat Promo, Voucher & Loyalty Service",
    description="SOA Microservice for Polymorphic Discount Strategies, Flash Sales & Loyalty Tiers",
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
app.include_router(promo_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
