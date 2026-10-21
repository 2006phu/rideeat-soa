"""Pydantic Schemas (DTOs) for User & Driver Profile Service."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SavedAddressCreateRequest(BaseModel):
    """Payload to create a new saved address for a user."""

    label: str = Field(..., min_length=1, max_length=64, description="e.g. Home, Office")
    full_address: str = Field(..., min_length=3, max_length=500)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    is_default: bool = False


class SavedAddressResponse(BaseModel):
    """Serialized SavedAddress entity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: Optional[str] = None
    user_id: str
    label: str
    full_address: str
    latitude: float
    longitude: float
    is_default: bool
    created_at: datetime
    updated_at: datetime


class UserProfileUpdateRequest(BaseModel):
    """Payload to create or update a UserProfile."""

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=32)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class UserProfileResponse(BaseModel):
    """Serialized UserProfile entity including saved addresses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    saved_addresses: List[SavedAddressResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class DriverRegisterRequest(BaseModel):
    """Payload to register or onboard a driver profile."""

    user_id: Optional[str] = None
    vehicle_type: str = Field(default="motorbike", description="motorbike | car4 | car7")
    license_plate: str = Field(..., min_length=3, max_length=32)
    license_image_url: Optional[str] = Field(default=None, max_length=500)


class DriverRejectRequest(BaseModel):
    """Admin payload to reject a pending driver application."""

    reason: str = Field(default="Driver documents did not pass verification.")


class DriverOnlineToggleRequest(BaseModel):
    """Payload to set a driver's online/offline availability."""

    is_online: bool


class DriverProfileResponse(BaseModel):
    """Serialized DriverProfile entity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    vehicle_type: str
    license_plate: str
    license_image_url: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    is_online: bool
    created_at: datetime
    updated_at: datetime


class QRVerificationResponse(BaseModel):
    """Response containing QR verification SVG and Base64 payload."""

    subject_type: str
    subject_id: str
    checksum: str
    qr_payload: Dict[str, Any]
    qr_svg: str
    qr_base64: str
    qr_data_uri: str
