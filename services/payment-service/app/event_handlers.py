"""Kafka Domain Event Handlers for Payment Service (Observer Pattern & Polymorphism)."""

import logging
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from services.common.messaging.interfaces import DomainEvent, IEventHandler, IEventPublisher
from app.models import PaymentMethod, ReferenceType
from app.repositories import PaymentTransactionRepository, WalletRepository
from app.schemas import ProcessPaymentRequest
from app.service import PaymentApplicationService

logger = logging.getLogger(__name__)


class BasePaymentEventHandler(IEventHandler):
    """Base event handler encapsulating DB session lifecycle for async payment settlement."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        event_publisher: IEventPublisher,
    ) -> None:
        self._session_factory = session_factory
        self._event_publisher = event_publisher


class RideCompletedPaymentHandler(BasePaymentEventHandler):
    """Subscribes to 'ride.completed' and automatically settles ride fare payment."""

    @property
    def subscribed_topic(self) -> str:
        return "ride.completed"

    async def handle(self, event: DomainEvent) -> None:
        payload = event.payload or {}
        ride_id = str(payload.get("ride_id") or payload.get("id") or "")
        user_id = str(
            payload.get("customer_id")
            or payload.get("passenger_id")
            or payload.get("user_id")
            or "customer-001"
        )
        amount = float(payload.get("fare") or payload.get("total_fare") or payload.get("amount") or 0.0)
        payment_method = str(payload.get("payment_method") or PaymentMethod.WALLET.value)

        if not ride_id or amount <= 0:
            logger.debug(f"[RideCompletedPaymentHandler] Skipping invalid ride event: {payload}")
            return

        async with self._session_factory() as session:
            tx_repo = PaymentTransactionRepository(session)
            existing = await tx_repo.get_by_reference(ride_id, ReferenceType.RIDE.value)
            if existing is not None:
                logger.info(f"[RideCompletedPaymentHandler] Payment already recorded for ride={ride_id}")
                return

            wallet_repo = WalletRepository(session)
            service = PaymentApplicationService(
                tx_repository=tx_repo,
                wallet_repository=wallet_repo,
                event_publisher=self._event_publisher,
            )
            try:
                await service.process_payment(
                    ProcessPaymentRequest(
                        user_id=user_id,
                        reference_id=ride_id,
                        reference_type=ReferenceType.RIDE.value,
                        payment_method=payment_method,
                        amount=amount,
                        description=f"Auto-settlement for completed ride #{ride_id}",
                    )
                )
            except Exception as exc:
                logger.warning(
                    f"[RideCompletedPaymentHandler] Wallet settlement failed for ride={ride_id} ({exc}); falling back to cash settlement."
                )
                await service.process_payment(
                    ProcessPaymentRequest(
                        user_id=user_id,
                        reference_id=ride_id,
                        reference_type=ReferenceType.RIDE.value,
                        payment_method=PaymentMethod.CASH.value,
                        amount=amount,
                        description=f"Fallback cash settlement for completed ride #{ride_id}",
                    )
                )


class OrderCompletedPaymentHandler(BasePaymentEventHandler):
    """Subscribes to 'order.completed' and automatically settles food order payment."""

    @property
    def subscribed_topic(self) -> str:
        return "order.completed"

    async def handle(self, event: DomainEvent) -> None:
        payload = event.payload or {}
        order_id = str(payload.get("order_id") or payload.get("id") or "")
        user_id = str(payload.get("customer_id") or payload.get("user_id") or "customer-001")
        amount = float(
            payload.get("final_amount")
            or payload.get("total_amount")
            or payload.get("amount")
            or 0.0
        )
        payment_method = str(payload.get("payment_method") or PaymentMethod.WALLET.value)

        if not order_id or amount <= 0:
            logger.debug(f"[OrderCompletedPaymentHandler] Skipping invalid order event: {payload}")
            return

        async with self._session_factory() as session:
            tx_repo = PaymentTransactionRepository(session)
            existing = await tx_repo.get_by_reference(order_id, ReferenceType.FOOD_ORDER.value)
            if existing is not None:
                logger.info(f"[OrderCompletedPaymentHandler] Payment already recorded for order={order_id}")
                return

            wallet_repo = WalletRepository(session)
            service = PaymentApplicationService(
                tx_repository=tx_repo,
                wallet_repository=wallet_repo,
                event_publisher=self._event_publisher,
            )
            try:
                await service.process_payment(
                    ProcessPaymentRequest(
                        user_id=user_id,
                        reference_id=order_id,
                        reference_type=ReferenceType.FOOD_ORDER.value,
                        payment_method=payment_method,
                        amount=amount,
                        description=f"Auto-settlement for completed food order #{order_id}",
                    )
                )
            except Exception as exc:
                logger.warning(
                    f"[OrderCompletedPaymentHandler] Wallet settlement failed for order={order_id} ({exc}); falling back to cash settlement."
                )
                await service.process_payment(
                    ProcessPaymentRequest(
                        user_id=user_id,
                        reference_id=order_id,
                        reference_type=ReferenceType.FOOD_ORDER.value,
                        payment_method=PaymentMethod.CASH.value,
                        amount=amount,
                        description=f"Fallback cash settlement for completed food order #{order_id}",
                    )
                )
