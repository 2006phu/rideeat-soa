"""Domain ORM Models for User Service with State Machine & Encapsulation."""

from typing import List, Optional
from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.common.db.base import BaseORMModel, TimestampMixin
from services.common.exceptions import BusinessRuleViolationException, InvalidStateTransitionException

ALLOWED_VEHICLE_TYPES = {"motorbike", "car4", "car7"}
ALLOWED_DRIVER_STATUSES = {"pending", "approved", "rejected"}


class UserProfile(BaseORMModel, TimestampMixin):
    """Domain Entity representing a customer/user personal profile and saved addresses."""

    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    saved_addresses: Mapped[List["SavedAddress"]] = relationship(
        "SavedAddress",
        back_populates="user_profile",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def update_profile(
        self,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> None:
        """Encapsulated domain method to update mutable user profile fields."""
        if full_name is not None:
            cleaned_name = full_name.strip()
            if len(cleaned_name) < 2:
                raise BusinessRuleViolationException("Full name must be at least 2 characters long.")
            self.full_name = cleaned_name
        if phone is not None:
            self.phone = phone.strip() or None
        if avatar_url is not None:
            self.avatar_url = avatar_url.strip() or None


class SavedAddress(BaseORMModel, TimestampMixin):
    """Domain Entity representing a user's saved delivery/pickup location."""

    __tablename__ = "saved_addresses"

    profile_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    full_address: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user_profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile",
        back_populates="saved_addresses",
    )


class DriverProfile(BaseORMModel, TimestampMixin):
    """Domain Entity representing a driver onboarding profile and online state machine."""

    __tablename__ = "driver_profiles"

    user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(32), default="motorbike", nullable=False)
    license_plate: Mapped[str] = mapped_column(String(32), nullable=False)
    license_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True, nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def validate_vehicle_type(self) -> None:
        """Validate vehicle type invariant."""
        if self.vehicle_type not in ALLOWED_VEHICLE_TYPES:
            raise BusinessRuleViolationException(
                f"Unsupported vehicle_type '{self.vehicle_type}'. Allowed: {sorted(ALLOWED_VEHICLE_TYPES)}",
                details={"vehicle_type": self.vehicle_type},
            )

    def approve(self) -> None:
        """Transition driver status from pending -> approved."""
        if self.status != "pending":
            raise InvalidStateTransitionException("DriverProfile", self.status, "approved")
        self.status = "approved"
        self.rejection_reason = None

    def reject(self, reason: str = "Driver documents did not meet verification requirements.") -> None:
        """Transition driver status from pending -> rejected and force offline."""
        if self.status != "pending":
            raise InvalidStateTransitionException("DriverProfile", self.status, "rejected")
        self.status = "rejected"
        self.rejection_reason = reason
        self.is_online = False

    def set_online(self, online: bool) -> None:
        """Toggle driver online availability; only approved drivers may go online."""
        if online and self.status != "approved":
            raise BusinessRuleViolationException(
                f"Driver cannot go online while status is '{self.status}'. Approval is required.",
                details={"driver_id": self.id, "user_id": self.user_id, "status": self.status},
            )
        self.is_online = online
