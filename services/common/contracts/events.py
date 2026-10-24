"""Strongly Typed Domain Event Contracts for Apache Kafka & Event-Driven Architecture.

Replaces loose dictionaries with validated event payloads ensuring cross-service contract stability.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

from services.common.contracts.enums import RideStatus, OrderStatus, PaymentStatus, PaymentMethod, VehicleType
from services.common.contracts.dtos import GeoCoordinateDTO


class BaseEventEnvelope(BaseModel):
    """Universal Kafka envelope wrapping strongly-typed domain payloads."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    source_service: str
    occurred_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    correlation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payload: Dict[str, Any] = Field(default_factory=dict)


class RideRequestedEventPayload(BaseModel):
    """Event emitted when a customer submits a new ride request."""
    ride_id: str
    customer_id: str
    vehicle_type: VehicleType
    origin: GeoCoordinateDTO
    destination: GeoCoordinateDTO
    estimated_fare: float
    distance_km: float


class RideMatchedEventPayload(BaseModel):
    """Event emitted when a driver accepts an open ride request."""
    ride_id: str
    customer_id: str
    driver_id: str
    driver_name: str
    license_plate: str
    driver_location: GeoCoordinateDTO
    fare_amount: float


class RideStatusChangedEventPayload(BaseModel):
    """Event emitted when a ride progresses through its lifecycle states."""
    ride_id: str
    customer_id: str
    driver_id: Optional[str] = None
    old_status: RideStatus
    new_status: RideStatus
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FoodOrderPlacedEventPayload(BaseModel):
    """Event emitted when a food order is created and pending restaurant acceptance."""
    order_id: str
    customer_id: str
    restaurant_id: str
    items_count: int
    total_amount: float
    payment_method: PaymentMethod
    delivery_address: GeoCoordinateDTO


class PaymentCompletedEventPayload(BaseModel):
    """Event emitted when payment-service successfully records or charges a transaction."""
    transaction_id: str
    invoice_number: str
    user_id: str
    order_or_ride_id: str
    amount: float
    payment_method: PaymentMethod
    status: PaymentStatus = PaymentStatus.SUCCESS
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DriverLocationUpdateEventPayload(BaseModel):
    """High-frequency event streamed by active drivers to update spatial cache in Redis."""
    driver_id: str
    vehicle_type: VehicleType
    latitude: float
    longitude: float
    heading: Optional[float] = None
    speed_kmh: Optional[float] = None
    is_available: bool = True
