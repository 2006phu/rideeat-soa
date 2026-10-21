"""OOP Authentication & RBAC Guard using Firebase Admin SDK with JWT Fallback."""

import base64
import hmac
import hashlib
import json
import logging
import os
import time
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from services.common.exceptions import ForbiddenAccessException, UnauthorizedAccessException

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    """Enumeration of supported RBAC roles across RideEat SOA."""

    CUSTOMER = "customer"
    DRIVER = "driver"
    RESTAURANT = "restaurant"
    ADMIN = "admin"


class CurrentUser(BaseModel):
    """Value object representing the authenticated principal in a request."""

    uid: str
    email: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    name: Optional[str] = None

    def has_role(self, *allowed_roles: UserRole) -> bool:
        if self.role == UserRole.ADMIN:
            return True
        return self.role in allowed_roles


class IAuthVerifier(ABC):
    """Abstract interface for verifying identity tokens (Abstraction & Polymorphism)."""

    @abstractmethod
    def verify_token(self, token: str) -> CurrentUser:
        """Validate token and return CurrentUser principal."""
        raise NotImplementedError


class FirebaseAuthVerifier(IAuthVerifier):
    """Concrete token verifier supporting Firebase Admin SDK + signed HMAC JWT fallback for local/demo mode."""

    def __init__(
        self,
        credentials_path: Optional[str] = None,
        secret_key: str = "rideeat-soa-super-secret-jwt-key-2026",
    ) -> None:
        self._secret_key = secret_key
        self._firebase_initialized = False
        self._init_firebase(credentials_path)

    def _init_firebase(self, credentials_path: Optional[str]) -> None:
        if not credentials_path or not os.path.exists(credentials_path):
            logger.info("Firebase credentials file not provided; FirebaseAuthVerifier running in hybrid JWT/Firebase-compatible mode.")
            return
        try:
            import firebase_admin
            from firebase_admin import credentials

            if not firebase_admin._apps:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
            self._firebase_initialized = True
            logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as exc:
            logger.warning(f"Could not initialize Firebase Admin SDK ({exc}); using JWT fallback verifier.")

    def create_signed_token(
        self,
        uid: str,
        email: str,
        role: str = "customer",
        name: str = "",
        expires_in_seconds: int = 86400 * 7,
    ) -> str:
        """Create a signed JWT token (used when Firebase client SDK is simulated or in local dev)."""
        header = {"alg": "HS256", "typ": "JWT"}
        payload = {
            "sub": uid,
            "uid": uid,
            "email": email,
            "role": role,
            "name": name,
            "iat": int(time.time()),
            "exp": int(time.time()) + expires_in_seconds,
        }
        h_b64 = self._b64url_encode(json.dumps(header).encode("utf-8"))
        p_b64 = self._b64url_encode(json.dumps(payload).encode("utf-8"))
        signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
        signature = hmac.new(self._secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        s_b64 = self._b64url_encode(signature)
        return f"{h_b64}.{p_b64}.{s_b64}"

    def verify_token(self, token: str) -> CurrentUser:
        """Verify Firebase ID token first (if initialized), otherwise verify signed JWT token."""
        if self._firebase_initialized:
            try:
                from firebase_admin import auth as fb_auth

                decoded = fb_auth.verify_id_token(token)
                role_str = decoded.get("role", UserRole.CUSTOMER.value)
                return CurrentUser(
                    uid=decoded["uid"],
                    email=decoded.get("email"),
                    role=UserRole(role_str) if role_str in UserRole._value2member_map_ else UserRole.CUSTOMER,
                    name=decoded.get("name"),
                )
            except Exception as fb_exc:
                logger.debug(f"Firebase token check fell back to local JWT check: {fb_exc}")

        # Fallback: Verify signed HS256 JWT or demo token
        payload = self._decode_signed_token(token)
        role_val = payload.get("role", UserRole.CUSTOMER.value)
        role = UserRole(role_val) if role_val in UserRole._value2member_map_ else UserRole.CUSTOMER
        return CurrentUser(
            uid=str(payload.get("uid") or payload.get("sub")),
            email=payload.get("email"),
            role=role,
            name=payload.get("name"),
        )

    def _decode_signed_token(self, token: str) -> Dict[str, Any]:
        parts = token.split(".")
        if len(parts) != 3:
            raise UnauthorizedAccessException("Malformed authentication token.")
        h_b64, p_b64, s_b64 = parts
        signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
        expected_sig = hmac.new(self._secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        expected_b64 = self._b64url_encode(expected_sig)
        if not hmac.compare_digest(s_b64, expected_b64):
            raise UnauthorizedAccessException("Invalid token signature.")
        try:
            payload = json.loads(self._b64url_decode(p_b64).decode("utf-8"))
        except Exception as exc:
            raise UnauthorizedAccessException(f"Invalid token payload: {exc}")
        if payload.get("exp") and int(time.time()) > int(payload["exp"]):
            raise UnauthorizedAccessException("Authentication token has expired.")
        return payload

    @staticmethod
    def _b64url_encode(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

    @staticmethod
    def _b64url_decode(data: str) -> bytes:
        padding = "=" * (-len(data) % 4)
        return base64.urlsafe_b64decode(data + padding)


default_auth_verifier = FirebaseAuthVerifier(
    credentials_path=os.getenv("FIREBASE_CREDENTIALS_PATH"),
    secret_key=os.getenv("JWT_SECRET_KEY", "rideeat-soa-super-secret-jwt-key-2026"),
)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(default=None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
) -> CurrentUser:
    """FastAPI dependency resolving CurrentUser from Bearer Token or Gateway headers."""
    if credentials and credentials.credentials:
        return default_auth_verifier.verify_token(credentials.credentials)

    if x_user_id:
        role = UserRole(x_user_role) if x_user_role in UserRole._value2member_map_ else UserRole.CUSTOMER
        return CurrentUser(uid=x_user_id, email=x_user_email, role=role)

    raise UnauthorizedAccessException("Missing Bearer token or X-User-ID header.")


class RequireRole:
    """Callable OOP FastAPI Dependency enforcing Role-Based Access Control (RBAC)."""

    def __init__(self, *allowed_roles: UserRole) -> None:
        self._allowed_roles: List[UserRole] = list(allowed_roles)

    async def __call__(self, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.has_role(*self._allowed_roles):
            allowed_names = ", ".join(r.value for r in self._allowed_roles)
            raise ForbiddenAccessException(
                f"Role '{user.role.value}' is not authorized. Required: [{allowed_names}]"
            )
        return user
