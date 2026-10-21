"""Domain Entities for Vouchers & Loyalty Program (OOP Encapsulation & Inheritance)."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from services.common.db.base import BaseORMModel, TimestampMixin, utc_now
from services.common.exceptions import BusinessRuleViolationException


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class LoyaltyTier(str, Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class Voucher(BaseORMModel, TimestampMixin):
    """Domain entity representing a promotional voucher with encapsulated eligibility and quota logic."""

    __tablename__ = "vouchers"

    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    discount_type: Mapped[str] = mapped_column(
        String(32), default=DiscountType.PERCENTAGE.value, nullable=False
    )
    discount_value: Mapped[float] = mapped_column(Float, nullable=False)
    min_order_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_discount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    usage_limit: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def validate_applicable(self, order_amount: float) -> None:
        """Encapsulated domain validation checking active status, expiration, usage quota, and minimum spend."""
        if not self.is_active:
            raise BusinessRuleViolationException(
                f"Voucher '{self.code}' is inactive.",
                details={"code": self.code},
            )
        if self.expires_at is not None:
            now = datetime.now(timezone.utc)
            exp = (
                self.expires_at
                if self.expires_at.tzinfo is not None
                else self.expires_at.replace(tzinfo=timezone.utc)
            )
            if now > exp:
                raise BusinessRuleViolationException(
                    f"Voucher '{self.code}' has expired.",
                    details={"code": self.code, "expires_at": exp.isoformat()},
                )
        if self.used_count >= self.usage_limit:
            raise BusinessRuleViolationException(
                f"Voucher '{self.code}' has reached its maximum usage limit ({self.usage_limit}).",
                details={"code": self.code, "usage_limit": self.usage_limit},
            )
        if order_amount < self.min_order_value:
            raise BusinessRuleViolationException(
                f"Order amount ({order_amount:,.0f} VND) does not meet minimum requirement ({self.min_order_value:,.0f} VND) for voucher '{self.code}'.",
                details={
                    "code": self.code,
                    "order_amount": order_amount,
                    "min_order_value": self.min_order_value,
                },
            )

    def consume(self, order_amount: Optional[float] = None) -> None:
        """Increment voucher usage count after validating constraints."""
        check_amount = order_amount if order_amount is not None else self.min_order_value
        self.validate_applicable(check_amount)
        self.used_count += 1
        self.updated_at = utc_now()


class LoyaltyAccount(BaseORMModel, TimestampMixin):
    """Domain entity representing a customer's loyalty points balance and membership tier."""

    __tablename__ = "loyalty_accounts"

    user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tier: Mapped[str] = mapped_column(
        String(32), default=LoyaltyTier.BRONZE.value, nullable=False
    )

    def earn_points(self, spend_amount: float) -> int:
        """Earn +1 point per 10,000 VND spent and automatically upgrade membership tier."""
        if spend_amount <= 0:
            raise BusinessRuleViolationException(
                "Spend amount must be positive to earn loyalty points.",
                details={"spend_amount": spend_amount},
            )
        earned = max(1, int(spend_amount // 10_000))
        self.points += earned
        self._recalculate_tier()
        self.updated_at = utc_now()
        return earned

    def redeem_points(self, points_to_redeem: int) -> int:
        """Redeem loyalty points if user has sufficient points balance."""
        if points_to_redeem <= 0:
            raise BusinessRuleViolationException(
                "Points to redeem must be strictly positive.",
                details={"points": points_to_redeem},
            )
        if self.points < points_to_redeem:
            raise BusinessRuleViolationException(
                f"Insufficient loyalty points: available {self.points}, requested {points_to_redeem}.",
                details={"available_points": self.points, "requested_points": points_to_redeem},
            )
        self.points -= points_to_redeem
        self._recalculate_tier()
        self.updated_at = utc_now()
        return self.points

    def _recalculate_tier(self) -> None:
        """Encapsulated tier progression rule based on accumulated points."""
        if self.points >= 500:
            self.tier = LoyaltyTier.PLATINUM.value
        elif self.points >= 200:
            self.tier = LoyaltyTier.GOLD.value
        elif self.points >= 50:
            self.tier = LoyaltyTier.SILVER.value
        else:
            self.tier = LoyaltyTier.BRONZE.value
