"""Polymorphic Payment Processing Strategies & Factory Pattern."""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Type

from services.common.exceptions import BusinessRuleViolationException
from app.models import PaymentMethod, PaymentTransaction
from app.repositories import WalletRepository

logger = logging.getLogger(__name__)


class IPaymentStrategy(ABC):
    """Abstract Strategy interface for executing payments across different tender channels."""

    @abstractmethod
    async def execute_payment(
        self, tx: PaymentTransaction, wallet_repo: WalletRepository
    ) -> bool:
        """Execute payment logic polymorphically and return True if settled."""
        raise NotImplementedError


class CashPaymentStrategy(IPaymentStrategy):
    """Concrete Strategy for physical cash settlement collected upon ride/delivery completion."""

    async def execute_payment(
        self, tx: PaymentTransaction, wallet_repo: WalletRepository
    ) -> bool:
        logger.info(
            f"[CashPaymentStrategy] Settling cash payment tx={tx.id} amount={tx.amount:,.0f} VND for user={tx.user_id}"
        )
        tx.mark_success()
        return True


class WalletPaymentStrategy(IPaymentStrategy):
    """Concrete Strategy debiting the customer's digital RideEat Wallet."""

    async def execute_payment(
        self, tx: PaymentTransaction, wallet_repo: WalletRepository
    ) -> bool:
        wallet = await wallet_repo.get_or_create_wallet(tx.user_id)
        logger.info(
            f"[WalletPaymentStrategy] Debiting {tx.amount:,.0f} VND from wallet={wallet.id} (balance={wallet.balance:,.0f})"
        )
        wallet.debit(tx.amount)
        await wallet_repo.save(wallet)
        tx.mark_success()
        return True


class MockGatewayPaymentStrategy(IPaymentStrategy):
    """Concrete Strategy simulating external VNPay / Momo / Stripe card gateway authorization."""

    async def execute_payment(
        self, tx: PaymentTransaction, wallet_repo: WalletRepository
    ) -> bool:
        if tx.amount <= 0 or tx.amount > 100_000_000:
            logger.warning(
                f"[MockGatewayPaymentStrategy] Rejected payment tx={tx.id} with amount={tx.amount}"
            )
            tx.mark_failed()
            return False

        logger.info(
            f"[MockGatewayPaymentStrategy] Authorized external gateway tx={tx.id} amount={tx.amount:,.0f} VND"
        )
        tx.mark_success()
        return True


class PaymentStrategyFactory:
    """Factory Pattern resolving concrete IPaymentStrategy instances by payment method name."""

    _registry: Dict[str, Type[IPaymentStrategy]] = {
        PaymentMethod.CASH.value: CashPaymentStrategy,
        PaymentMethod.WALLET.value: WalletPaymentStrategy,
        PaymentMethod.MOCK_GATEWAY.value: MockGatewayPaymentStrategy,
    }

    @classmethod
    def get_strategy(cls, method: str) -> IPaymentStrategy:
        normalized = (method or PaymentMethod.WALLET.value).lower().strip()
        strategy_cls = cls._registry.get(normalized)
        if strategy_cls is None:
            raise BusinessRuleViolationException(
                f"Unsupported payment method '{method}'. Supported methods: {list(cls._registry.keys())}",
                details={"payment_method": method},
            )
        return strategy_cls()
