"""Common Data Transfer Objects (DTOs) and Value Objects for SOA Microservices."""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field

from services.common.contracts.enums import UserRole, VehicleType, PaymentMethod, PaymentStatus


class GeoCoordinateDTO(BaseModel):
    """Immutable 2D geographical coordinate with optional human-readable address."""
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    address: Optional[str] = Field(default=None, description="Human readable address string")


class MoneyDTO(BaseModel):
    """Value object representing financial currency and amount."""
    amount: float = Field(..., ge=0.0, description="Monetary value in standard unit")
    currency: str = Field(default="VND", description="ISO 4217 currency code")


class UserPrincipalDTO(BaseModel):
    """Authenticated principal extracted from validated JWT or Firebase Token."""
    uid: str = Field(..., description="Unique system user identifier")
    email: str = Field(..., description="User primary email address")
    role: UserRole = Field(..., description="Assigned role (customer, driver, restaurant, admin)")
    full_name: str = Field(default="User", description="Display name")
    phone_number: Optional[str] = Field(default=None, description="E.164 phone number")


class RideEstimateDTO(BaseModel):
    """Fare computation result from ride & map service pricing engine."""
    origin: GeoCoordinateDTO
    destination: GeoCoordinateDTO
    vehicle_type: VehicleType
    distance_km: float = Field(..., ge=0.0)
    duration_minutes: float = Field(..., ge=0.0)
    base_fare: float = Field(..., ge=0.0)
    distance_fare: float = Field(..., ge=0.0)
    time_fare: float = Field(..., ge=0.0)
    surge_multiplier: float = Field(default=1.0, ge=1.0)
    total_fare: float = Field(..., ge=0.0)


class CartItemDTO(BaseModel):
    """Single dish line item in a customer's food cart."""
    item_id: str
    item_name: str
    unit_price: float = Field(..., ge=0.0)
    quantity: int = Field(..., ge=1)
    notes: Optional[str] = None


class FoodOrderSummaryDTO(BaseModel):
    """High-level summary of a food delivery order."""
    order_id: str
    customer_id: str
    restaurant_id: str
    restaurant_name: str
    items_count: int
    subtotal: float
    delivery_fee: float
    total_amount: float
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
