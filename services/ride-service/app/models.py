"""Ride ORM Domain Model with Encapsulated Lifecycle State Machine."""

import random
import secrets
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from services.common.db.base import BaseORMModel, TimestampMixin
from services.common.exceptions import (
    BusinessRuleViolationException,
    InvalidStateTransitionException,
)


class RideStatus(str, Enum):
    """Valid lifecycle states for a Ride."""

    SEARCHING = "searching"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


def _generate_otp() -> str:
    return f"{random.randint(1000, 9999)}"


def _generate_share_token() -> str:
    return secrets.token_urlsafe(16)


class Ride(BaseORMModel, TimestampMixin):
    """Domain Entity representing a customer ride booking with encapsulated state transitions."""

    __tablename__ = "rides"

    customer_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    driver_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)

    pickup_address: Mapped[str] = mapped_column(String(255), nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)

    dropoff_address: Mapped[str] = mapped_column(String(255), nullable=False)
    dropoff_lat: Mapped[float] = mapped_column(Float, nullable=False)
    dropoff_lng: Mapped[float] = mapped_column(Float, nullable=False)

    vehicle_type: Mapped[str] = mapped_column(String(32), nullable=False, default="motorbike")
    distance_km: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    duration_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)

    estimated_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    final_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=RideStatus.SEARCHING.value,
        index=True,
    )
    verification_otp: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=_generate_otp,
    )
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    share_token: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
        default=_generate_share_token,
    )
    cancel_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    current_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    promo_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(32), nullable=False, default="wallet")

    # --- Encapsulated Domain State Machine Transitions ---

    def accept(self, driver_id: str) -> None:
        """Transition ride from 'searching' -> 'accepted' and assign driver."""
        if self.status != RideStatus.SEARCHING.value:
            raise InvalidStateTransitionException(
                entity_name="Ride",
                current_state=self.status,
                target_state=RideStatus.ACCEPTED.value,
            )
        if not driver_id or not driver_id.strip():
            raise BusinessRuleViolationException("Valid driver_id is required to accept a ride.")
        self.driver_id = driver_id.strip()
        self.status = RideStatus.ACCEPTED.value
        if self.current_lat is None:
            self.current_lat = self.pickup_lat
        if self.current_lng is None:
            self.current_lng = self.pickup_lng

    def start_ride(self, otp_code: Optional[str] = None) -> None:
        """Transition ride from 'accepted' -> 'in_progress' after verifying OTP or QR code."""
        if self.status != RideStatus.ACCEPTED.value:
            raise InvalidStateTransitionException(
                entity_name="Ride",
                current_state=self.status,
                target_state=RideStatus.IN_PROGRESS.value,
            )
        if otp_code is not None and otp_code.strip() != "":
            provided = otp_code.strip()
            if provided != self.verification_otp and provided != self.share_token:
                raise BusinessRuleViolationException(
                    "Invalid verification OTP or QR token provided to start ride.",
                    details={"expected_hint": f"Ends with {self.verification_otp[-2:]}"},
                )
        self.status = RideStatus.IN_PROGRESS.value

    def update_live_location(self, latitude: float, longitude: float) -> None:
        """Update live GPS coordinates when ride is accepted or in progress."""
        if self.status not in (RideStatus.ACCEPTED.value, RideStatus.IN_PROGRESS.value):
            raise BusinessRuleViolationException(
                f"Cannot update GPS coordinates while ride is in '{self.status}' state."
            )
        self.current_lat = float(latitude)
        self.current_lng = float(longitude)

    def complete_ride(self) -> None:
        """Transition ride from 'in_progress' -> 'completed'."""
        if self.status != RideStatus.IN_PROGRESS.value:
            raise InvalidStateTransitionException(
                entity_name="Ride",
                current_state=self.status,
                target_state=RideStatus.COMPLETED.value,
            )
        self.status = RideStatus.COMPLETED.value
        self.current_lat = self.dropoff_lat
        self.current_lng = self.dropoff_lng

    def cancel_ride(self, reason: str = "Cancelled by user") -> None:
        """Transition ride from 'searching' or 'accepted' -> 'cancelled'."""
        if self.status not in (RideStatus.SEARCHING.value, RideStatus.ACCEPTED.value):
            raise InvalidStateTransitionException(
                entity_name="Ride",
                current_state=self.status,
                target_state=RideStatus.CANCELLED.value,
            )
        self.status = RideStatus.CANCELLED.value
        self.cancel_reason = (reason or "Cancelled by user").strip()

    def to_estimate_dto(self):
        """Export ride route & pricing to standard RideEstimateDTO contract."""
        from services.common.contracts.dtos import GeoCoordinateDTO, RideEstimateDTO
        from services.common.contracts.enums import VehicleType

        v_type = VehicleType.MOTORBIKE
        if self.vehicle_type in VehicleType._value2member_map_:
            v_type = VehicleType(self.vehicle_type)
        elif self.vehicle_type == "car4":
            v_type = VehicleType.CAR_4
        elif self.vehicle_type == "car7":
            v_type = VehicleType.CAR_7

        return RideEstimateDTO(
            origin=GeoCoordinateDTO(lat=self.pickup_lat, lng=self.pickup_lng, address=self.pickup_address),
            destination=GeoCoordinateDTO(lat=self.dropoff_lat, lng=self.dropoff_lng, address=self.dropoff_address),
            vehicle_type=v_type,
            distance_km=self.distance_km,
            duration_minutes=self.duration_minutes,
            base_fare=self.estimated_price,
            distance_fare=0.0,
            time_fare=0.0,
            surge_multiplier=1.0,
            total_fare=self.final_price or self.estimated_price,
        )
