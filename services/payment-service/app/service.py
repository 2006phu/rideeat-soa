"""Application Service for Wallet & Payment Orchestration (Inheritance & Strategy Pattern)."""

from typing import Any, Dict, List, Optional

from services.common.domain.base_service import BaseApplicationService
from services.common.exceptions import BusinessRuleViolationException
from services.common.messaging.interfaces import IEventPublisher
from app.invoice_generator import InvoiceGenerator
from app.models import (
    PaymentMethod,
    PaymentTransaction,
    ReferenceType,
    TransactionStatus,
    TransactionType,
    Wallet,
)
from app.payment_strategy import PaymentStrategyFactory
from app.repositories import PaymentTransactionRepository, WalletRepository
from app.schemas import (
    ProcessPaymentRequest,
    RefundPaymentRequest,
    WalletTopupRequest,
    WalletWithdrawRequest,
)


class PaymentApplicationService(BaseApplicationService[PaymentTransactionRepository]):
    """Encapsulates payment processing, wallet operations, refunds, and invoice generation."""

    def __init__(
        self,
        tx_repository: PaymentTransactionRepository,
        wallet_repository: WalletRepository,
        event_publisher: Optional[IEventPublisher] = None,
        invoice_generator: Optional[InvoiceGenerator] = None,
    ) -> None:
        super().__init__(repository=tx_repository, event_publisher=event_publisher)
        self._wallet_repo = wallet_repository
        self._invoice_generator = invoice_generator or InvoiceGenerator()

    @property
    def wallet_repository(self) -> WalletRepository:
        return self._wallet_repo

    async def get_wallet(self, user_id: str) -> Wallet:
        """Retrieve a user's wallet, auto-initializing a demo wallet with 500,000 VND if absent."""
        return await self._wallet_repo.get_or_create_wallet(user_id, initial_balance=500_000.0)

    async def topup_wallet(self, payload: WalletTopupRequest) -> Wallet:
        """Deposit funds into user's wallet and record a TOPUP ledger transaction."""
        wallet = await self._wallet_repo.get_or_create_wallet(payload.user_id)
        wallet.deposit(payload.amount)
        wallet = await self._wallet_repo.save(wallet)

        tx = PaymentTransaction(
            user_id=payload.user_id,
            reference_id=wallet.id,
            reference_type=ReferenceType.WALLET.value,
            transaction_type=TransactionType.TOPUP.value,
            payment_method=PaymentMethod.MOCK_GATEWAY.value,
            amount=payload.amount,
            status=TransactionStatus.SUCCESS.value,
            description=payload.description or "Wallet top-up",
        )
        await self.repository.save(tx)

        await self.publish_domain_event(
            topic="payment.wallet_topup",
            payload={
                "user_id": payload.user_id,
                "wallet_id": wallet.id,
                "amount": payload.amount,
                "new_balance": wallet.balance,
                "transaction_id": tx.id,
            },
            source_service="payment-service",
        )
        return wallet

    async def withdraw_wallet(self, payload: WalletWithdrawRequest) -> Wallet:
        """Debit funds from user's wallet and record a WITHDRAW ledger transaction."""
        wallet = await self._wallet_repo.get_or_create_wallet(payload.user_id)
        wallet.debit(payload.amount)
        wallet = await self._wallet_repo.save(wallet)

        tx = PaymentTransaction(
            user_id=payload.user_id,
            reference_id=wallet.id,
            reference_type=ReferenceType.WALLET.value,
            transaction_type=TransactionType.WITHDRAW.value,
            payment_method=PaymentMethod.WALLET.value,
            amount=payload.amount,
            status=TransactionStatus.SUCCESS.value,
            description=payload.description or "Wallet withdrawal",
        )
        await self.repository.save(tx)
        return wallet

    async def process_payment(self, payload: ProcessPaymentRequest) -> PaymentTransaction:
        """Execute a payment polymorphically via PaymentStrategyFactory and emit payment.success."""
        tx = PaymentTransaction(
            user_id=payload.user_id,
            reference_id=payload.reference_id,
            reference_type=payload.reference_type,
            transaction_type=TransactionType.PAYMENT.value,
            payment_method=payload.payment_method.lower(),
            amount=payload.amount,
            status=TransactionStatus.PENDING.value,
            description=payload.description
            or f"Payment for {payload.reference_type} #{payload.reference_id}",
        )
        tx = await self.repository.save(tx)

        strategy = PaymentStrategyFactory.get_strategy(payload.payment_method)
        settled = await strategy.execute_payment(tx, self._wallet_repo)
        tx = await self.repository.save(tx)

        if settled and tx.status == TransactionStatus.SUCCESS.value:
            await self.publish_domain_event(
                topic="payment.success",
                payload={
                    "transaction_id": tx.id,
                    "user_id": tx.user_id,
                    "reference_id": tx.reference_id,
                    "reference_type": tx.reference_type,
                    "payment_method": tx.payment_method,
                    "amount": tx.amount,
                    "status": tx.status,
                },
                source_service="payment-service",
            )
        else:
            await self.publish_domain_event(
                topic="payment.failed",
                payload={
                    "transaction_id": tx.id,
                    "user_id": tx.user_id,
                    "reference_id": tx.reference_id,
                    "amount": tx.amount,
                    "status": tx.status,
                },
                source_service="payment-service",
            )
        return tx

    async def refund_payment(
        self, tx_id: str, payload: Optional[RefundPaymentRequest] = None
    ) -> PaymentTransaction:
        """Refund a settled payment transaction and return funds to the user's wallet."""
        tx = await self.repository.get_by_id_or_raise(tx_id)
        if tx.transaction_type != TransactionType.PAYMENT.value:
            raise BusinessRuleViolationException(
                f"Only '{TransactionType.PAYMENT.value}' transactions can be refunded.",
                details={"transaction_id": tx.id, "transaction_type": tx.transaction_type},
            )

        tx.mark_refunded()
        tx = await self.repository.save(tx)

        # Credit refunded amount back to user's wallet
        wallet = await self._wallet_repo.get_or_create_wallet(tx.user_id)
        wallet.deposit(tx.amount)
        await self._wallet_repo.save(wallet)

        refund_reason = (
            payload.reason if payload and payload.reason else f"Refund for tx {tx.id}"
        )
        refund_record = PaymentTransaction(
            user_id=tx.user_id,
            reference_id=tx.reference_id,
            reference_type=tx.reference_type,
            transaction_type=TransactionType.REFUND.value,
            payment_method=PaymentMethod.WALLET.value,
            amount=tx.amount,
            status=TransactionStatus.SUCCESS.value,
            description=refund_reason,
        )
        await self.repository.save(refund_record)

        await self.publish_domain_event(
            topic="payment.refunded",
            payload={
                "original_transaction_id": tx.id,
                "refund_transaction_id": refund_record.id,
                "user_id": tx.user_id,
                "reference_id": tx.reference_id,
                "amount": tx.amount,
                "wallet_balance": wallet.balance,
            },
            source_service="payment-service",
        )
        return tx

    async def list_user_transactions(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[PaymentTransaction]:
        """Retrieve paginated transaction ledger for a specific user."""
        return await self.repository.list_by_user(user_id=user_id, skip=skip, limit=limit)

    async def get_transaction_invoice(self, tx_id: str) -> Dict[str, Any]:
        """Generate structured invoice & HTML receipt for a transaction."""
        tx = await self.repository.get_by_id_or_raise(tx_id)
        return self._invoice_generator.generate_structured_invoice(tx)
