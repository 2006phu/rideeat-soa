"""FastAPI Entrypoint for Payment & Wallet Service (Port 8006)."""

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
from app.event_handlers import OrderCompletedPaymentHandler, RideCompletedPaymentHandler
from app.repositories import WalletRepository
from app.routes import router as payment_router


class PaymentServiceSettings(BaseServiceSettings):
    """Configuration class for Payment Service."""

    SERVICE_NAME: str = "payment-service"
    PORT: int = 8006
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./payment_service.db"
    )


settings = PaymentServiceSettings()
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


async def seed_demo_wallets() -> None:
    """Seed demo customer wallets with 500,000 VND on startup."""
    demo_users = [
        "customer-001",
        "user-customer-1",
        "demo-customer",
        "cust-001",
    ]
    async for session in db_manager.get_session():
        wallet_repo = WalletRepository(session)
        for uid in demo_users:
            await wallet_repo.get_or_create_wallet(uid, initial_balance=500_000.0)
        break


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = settings
    app.state.db_manager = db_manager
    app.state.kafka_bus = kafka_bus

    await db_manager.create_tables()
    await seed_demo_wallets()

    # Register Observer Event Handlers for ride.completed and order.completed
    kafka_bus.register_handler(
        RideCompletedPaymentHandler(db_manager._session_factory, kafka_bus)
    )
    kafka_bus.register_handler(
        OrderCompletedPaymentHandler(db_manager._session_factory, kafka_bus)
    )
    await kafka_bus.start()
    yield
    await kafka_bus.stop()
    await db_manager.dispose()


app = FastAPI(
    title="RideEat Payment & Wallet Service",
    description="SOA Microservice for Digital Wallets, Polymorphic Payment Strategies, Refunds & Electronic Invoices",
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
app.include_router(payment_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
