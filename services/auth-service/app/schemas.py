"""Pydantic Schemas (DTOs) for Auth Service API Requests and Responses."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload to register a new RideEat user account."""

    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=32)
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="customer", description="customer | driver | restaurant | admin")


class LoginRequest(BaseModel):
    """Payload to authenticate with email and password."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class FirebaseLoginRequest(BaseModel):
    """Payload to authenticate via Firebase ID token or OAuth provider profile."""

    id_token: Optional[str] = None
    firebase_uid: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = Field(default="customer")


class VerifyTokenRequest(BaseModel):
    """Payload to verify a JWT or Firebase Bearer token."""

    token: str


class ToggleUserStatusRequest(BaseModel):
    """Admin payload to activate/deactivate a user account or optionally update role."""

    is_active: bool
    role: Optional[str] = None


class UserAccountResponse(BaseModel):
    """Serialized representation of a UserAccount domain entity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    phone: Optional[str] = None
    full_name: str
    role: str
    is_active: bool
    firebase_uid: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RefreshTokenRequest(BaseModel):
    """Payload to refresh an access token."""

    refresh_token: str = Field(..., min_length=1, description="Valid signed refresh token")


class GoogleOAuthExchangeRequest(BaseModel):
    """Payload for backend OAuth2 code or id_token exchange (Zero frontend secrets)."""

    id_token: Optional[str] = Field(default=None, description="Google Identity ID Token from popup/mobile")
    auth_code: Optional[str] = Field(default=None, description="Google OAuth2 authorization code")
    redirect_uri: Optional[str] = Field(default=None, description="OAuth redirect URI if code flow")
    role: str = Field(default="customer", description="Target role if registering for the first time")


class AuthTokenResponse(BaseModel):
    """Authentication response returning JWT access token, refresh token and user account details."""

    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int = Field(default=86400, description="Token validity in seconds")
    user: UserAccountResponse


class TokenVerificationResponse(BaseModel):
    """Result of token verification."""

    valid: bool
    uid: str
    email: Optional[str] = None
    role: str
    name: Optional[str] = None
    is_active: bool = True
