"""Domain Entities and Aggregate Roots for Payment & Wallet Service (OOP Encapsulation & Inheritance)."""

from enum import Enum
from typing import Optional
from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from services.common.db.base import BaseORMModel, TimestampMixin, utc_now
from services.common.exceptions import (
    BusinessRuleViolationException,
    InsufficientBalanceException,
    InvalidStateTransitionException,
)


class ReferenceType(str, Enum):
    RIDE = "ride"
    FOOD_ORDER = "food_order"
    WALLET = "wallet"


class TransactionType(str, Enum):
    PAYMENT = "payment"
    REFUND = "refund"
    TOPUP = "topup"
    WITHDRAW = "withdraw"


class PaymentMethod(str, Enum):
    CASH = "cash"
    WALLET = "wallet"
    MOCK_GATEWAY = "mock_gateway"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class Wallet(BaseORMModel, TimestampMixin):
    """Domain entity representing a user's digital wallet with encapsulated balance invariants."""

    __tablename__ = "wallets"

    user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(16), default="VND", nullable=False)

    def deposit(self, amount: float) -> float:
        """Encapsulated domain behavior: credit funds to wallet after validating amount."""
        if amount <= 0:
            raise BusinessRuleViolationException(
                "Deposit amount must be strictly positive.",
                details={"amount": amount},
            )
        self.balance = round(self.balance + amount, 2)
        self.updated_at = utc_now()
        return self.balance

    def debit(self, amount: float) -> float:
        """Encapsulated domain behavior: debit funds from wallet if sufficient balance exists."""
        if amount <= 0:
            raise BusinessRuleViolationException(
                "Debit amount must be strictly positive.",
                details={"amount": amount},
            )
        if self.balance < amount:
            raise InsufficientBalanceException(
                current_balance=self.balance,
                required_amount=amount,
            )
        self.balance = round(self.balance - amount, 2)
        self.updated_at = utc_now()
        return self.balance


class PaymentTransaction(BaseORMModel, TimestampMixin):
    """Domain entity representing an immutable financial ledger record and its state lifecycle."""

    __tablename__ = "payment_transactions"

    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    reference_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    reference_type: Mapped[str] = mapped_column(
        String(32), default=ReferenceType.RIDE.value, nullable=False
    )
    transaction_type: Mapped[str] = mapped_column(
        String(32), default=TransactionType.PAYMENT.value, nullable=False
    )
    payment_method: Mapped[str] = mapped_column(
        String(32), default=PaymentMethod.WALLET.value, nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default=TransactionStatus.PENDING.value, index=True, nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    def mark_success(self) -> None:
        """Transition transaction state to SUCCESS."""
        if self.status not in (TransactionStatus.PENDING.value, TransactionStatus.SUCCESS.value):
            raise InvalidStateTransitionException(
                "PaymentTransaction", self.status, TransactionStatus.SUCCESS.value
            )
        self.status = TransactionStatus.SUCCESS.value
        self.updated_at = utc_now()

    def mark_failed(self) -> None:
        """Transition transaction state to FAILED."""
        if self.status not in (TransactionStatus.PENDING.value, TransactionStatus.FAILED.value):
            raise InvalidStateTransitionException(
                "PaymentTransaction", self.status, TransactionStatus.FAILED.value
            )
        self.status = TransactionStatus.FAILED.value
        self.updated_at = utc_now()

    def mark_refunded(self) -> None:
        """Transition transaction state from SUCCESS to REFUNDED."""
        if self.status != TransactionStatus.SUCCESS.value:
            raise InvalidStateTransitionException(
                "PaymentTransaction", self.status, TransactionStatus.REFUNDED.value
            )
        self.status = TransactionStatus.REFUNDED.value
        self.updated_at = utc_now()
