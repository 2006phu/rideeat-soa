"""Food Service ORM Domain Models with Encapsulated Business Methods & Order State Machine."""

import json
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from services.common.db.base import BaseORMModel, TimestampMixin
from services.common.exceptions import (
    BusinessRuleViolationException,
    InvalidStateTransitionException,
)


class FoodOrderStatus(str, Enum):
    """Valid lifecycle states for a FoodOrder."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    DELIVERING = "delivering"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Restaurant(BaseORMModel, TimestampMixin):
    """Domain Entity representing a Partner Restaurant in RideEat Food Delivery."""

    __tablename__ = "restaurants"

    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    open_time: Mapped[str] = mapped_column(String(16), nullable=False, default="07:00")
    close_time: Mapped[str] = mapped_column(String(16), nullable=False, default="22:30")
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    banner_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=4.8)

    def toggle_open(self, is_open: bool) -> None:
        """Encapsulated domain method to open or close the restaurant."""
        self.is_open = bool(is_open)


class MenuItem(BaseORMModel, TimestampMixin):
    """Domain Entity representing a Dish/Beverage on a Restaurant's Menu."""

    __tablename__ = "menu_items"

    restaurant_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    price: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="Main")
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def update_price(self, new_price: float) -> None:
        """Encapsulated domain method validating and updating menu item price."""
        if new_price <= 0:
            raise BusinessRuleViolationException(
                "MenuItem price must be greater than 0 VND.",
                details={"new_price": new_price},
            )
        self.price = round(float(new_price), 0)

    def set_availability(self, available: bool) -> None:
        """Encapsulated domain method to mark dish available or sold out."""
        self.is_available = bool(available)


class FoodOrder(BaseORMModel, TimestampMixin):
    """Domain Entity representing a Customer Food Delivery Order with State Machine."""

    __tablename__ = "food_orders"

    customer_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    restaurant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    driver_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)

    items_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    delivery_fee: Mapped[float] = mapped_column(Float, nullable=False, default=15000.0)
    discount_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    delivery_address: Mapped[str] = mapped_column(String(255), nullable=False)
    delivery_lat: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_lng: Mapped[float] = mapped_column(Float, nullable=False)

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=FoodOrderStatus.PENDING.value,
        index=True,
    )
    payment_method: Mapped[str] = mapped_column(String(32), nullable=False, default="wallet")
    cancel_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    promo_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    @property
    def items(self) -> List[Dict[str, Any]]:
        """Deserialize items_json into structured list of order line items."""
        try:
            data = json.loads(self.items_json or "[]")
            return data if isinstance(data, list) else []
        except Exception:
            return []

    # --- Encapsulated Domain State Machine Transitions ---

    def confirm_by_restaurant(self) -> None:
        """Transition order from 'pending' -> 'confirmed'."""
        if self.status != FoodOrderStatus.PENDING.value:
            raise InvalidStateTransitionException(
                entity_name="FoodOrder",
                current_state=self.status,
                target_state=FoodOrderStatus.CONFIRMED.value,
            )
        self.status = FoodOrderStatus.CONFIRMED.value

    def mark_preparing(self) -> None:
        """Transition order from 'confirmed' (or 'pending') -> 'preparing'."""
        if self.status not in (
            FoodOrderStatus.PENDING.value,
            FoodOrderStatus.CONFIRMED.value,
        ):
            raise InvalidStateTransitionException(
                entity_name="FoodOrder",
                current_state=self.status,
                target_state=FoodOrderStatus.PREPARING.value,
            )
        self.status = FoodOrderStatus.PREPARING.value

    def assign_driver(self, driver_id: str) -> None:
        """Assign delivery driver and transition from 'confirmed'/'preparing' -> 'delivering'."""
        if self.status not in (
            FoodOrderStatus.CONFIRMED.value,
            FoodOrderStatus.PREPARING.value,
        ):
            raise InvalidStateTransitionException(
                entity_name="FoodOrder",
                current_state=self.status,
                target_state=FoodOrderStatus.DELIVERING.value,
            )
        if not driver_id or not driver_id.strip():
            raise BusinessRuleViolationException("Valid driver_id is required to assign delivery.")
        self.driver_id = driver_id.strip()
        self.status = FoodOrderStatus.DELIVERING.value

    def complete_delivery(self) -> None:
        """Transition order from 'delivering' -> 'completed'."""
        if self.status != FoodOrderStatus.DELIVERING.value:
            raise InvalidStateTransitionException(
                entity_name="FoodOrder",
                current_state=self.status,
                target_state=FoodOrderStatus.COMPLETED.value,
            )
        self.status = FoodOrderStatus.COMPLETED.value

    def cancel_order(self, reason: str = "Cancelled by customer") -> None:
        """Transition order from 'pending', 'confirmed', or 'preparing' -> 'cancelled'."""
        if self.status not in (
            FoodOrderStatus.PENDING.value,
            FoodOrderStatus.CONFIRMED.value,
            FoodOrderStatus.PREPARING.value,
        ):
            raise InvalidStateTransitionException(
                entity_name="FoodOrder",
                current_state=self.status,
                target_state=FoodOrderStatus.CANCELLED.value,
            )
        self.status = FoodOrderStatus.CANCELLED.value
        self.cancel_reason = (reason or "Cancelled by customer").strip()
