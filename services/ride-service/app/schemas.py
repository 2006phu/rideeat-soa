"""Pydantic Request & Response Schemas for Ride Service."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RideEstimateRequest(BaseModel):
    """Request payload to estimate ride distance, duration, and polymorphic vehicle fares."""

    pickup_lat: float = Field(..., ge=-90.0, le=90.0)
    pickup_lng: float = Field(..., ge=-180.0, le=180.0)
    dropoff_lat: float = Field(..., ge=-90.0, le=90.0)
    dropoff_lng: float = Field(..., ge=-180.0, le=180.0)
    vehicle_type: str = Field(default="motorbike")
    surge_multiplier: float = Field(default=1.0, ge=1.0, le=5.0)
    promo_code: Optional[str] = Field(default=None)


class VehicleFareOption(BaseModel):
    """Estimated price breakdown for a single vehicle type."""

    vehicle_type: str
    base_fare: float
    per_km_rate: float
    per_minute_rate: float
    surge_multiplier: float
    estimated_price: float
    discount_amount: float
    final_price: float


class RideEstimateResponse(BaseModel):
    """Response containing route metrics and fare options across vehicle strategies."""

    distance_km: float
    duration_minutes: float
    surge_multiplier: float
    selected_vehicle: VehicleFareOption
    all_options: List[VehicleFareOption]


class CreateRideRequest(BaseModel):
    """Request payload for booking a new ride."""

    pickup_address: str = Field(..., min_length=2, max_length=255)
    pickup_lat: float = Field(..., ge=-90.0, le=90.0)
    pickup_lng: float = Field(..., ge=-180.0, le=180.0)
    dropoff_address: str = Field(..., min_length=2, max_length=255)
    dropoff_lat: float = Field(..., ge=-90.0, le=90.0)
    dropoff_lng: float = Field(..., ge=-180.0, le=180.0)
    vehicle_type: str = Field(default="motorbike")
    surge_multiplier: float = Field(default=1.0, ge=1.0, le=5.0)
    promo_code: Optional[str] = Field(default=None)
    payment_method: str = Field(default="wallet")
    scheduled_at: Optional[datetime] = Field(default=None)


class AcceptRideRequest(BaseModel):
    """Optional request body when a driver accepts a ride."""

    driver_id: Optional[str] = Field(default=None)


class StartRideRequest(BaseModel):
    """Request payload to verify OTP / QR code and start the ride."""

    otp_code: Optional[str] = Field(default=None)


class UpdateRideLocationRequest(BaseModel):
    """Request payload to stream live driver GPS coordinates."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    heading: Optional[float] = Field(default=None)
    speed_kmh: Optional[float] = Field(default=None)


class CancelRideRequest(BaseModel):
    """Request payload to cancel a ride with reason."""

    reason: str = Field(default="Cancelled by user", max_length=255)


class RideAISupportRequest(BaseModel):
    """Request payload for the AI Ride Support & Fare Advisor."""

    question: str = Field(..., min_length=2, max_length=1000)
    distance_km: Optional[float] = Field(default=None, gt=0)
    duration_minutes: Optional[float] = Field(default=None, gt=0)
    surge_multiplier: float = Field(default=1.0, ge=1.0, le=5.0)


class RideResponse(BaseModel):
    """Serialized representation of a Ride domain entity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    customer_id: str
    driver_id: Optional[str] = None
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    dropoff_address: str
    dropoff_lat: float
    dropoff_lng: float
    vehicle_type: str
    distance_km: float
    duration_minutes: float
    estimated_price: float
    discount_amount: float
    final_price: float
    status: str
    verification_otp: str
    scheduled_at: Optional[datetime] = None
    share_token: str
    cancel_reason: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    promo_code: Optional[str] = None
    payment_method: str = "wallet"
    created_at: datetime
    updated_at: datetime


class SharedRideTrackingResponse(BaseModel):
    """Public safety view of a ride accessed via share_token."""

    ride_id: str
    status: str
    vehicle_type: str
    driver_id: Optional[str] = None
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    dropoff_address: str
    dropoff_lat: float
    dropoff_lng: float
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    distance_km: float
    duration_minutes: float
    updated_at: datetime
    safety_note: str = "Live RideEat Safety Share Link"
