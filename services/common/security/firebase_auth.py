"""OOP Authentication & RBAC Guard using real Firebase Admin SDK (Strict Real Mode)."""

import json
import logging
import os
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import jwt
from cryptography.hazmat.primitives import serialization
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
    """Concrete token verifier enforcing REAL Firebase Admin SDK authentication without simulated fallbacks."""

    def __init__(self, credentials_path: Optional[str] = None) -> None:
        self._firebase_initialized = False
        self._public_key = None
        self._project_id = None
        self._init_firebase(credentials_path)

    def _resolve_credentials_path(self, credentials_path: Optional[str]) -> Optional[str]:
        """Find the real serviceAccountKey.json from explicit path, env var, or standard repo locations."""
        candidates = []
        if credentials_path:
            candidates.append(credentials_path)

        env_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if env_path:
            candidates.append(env_path)

        # Standard project directories
        here = Path(__file__).resolve()
        repo_root = here.parents[3]  # services/common/security/firebase_auth.py -> rideeat-soa root
        candidates.extend([
            str(repo_root / "config" / "firebase" / "serviceAccountKey.json"),
            "/app/config/firebase/serviceAccountKey.json",
            "config/firebase/serviceAccountKey.json",
            str(Path.cwd() / "config" / "firebase" / "serviceAccountKey.json"),
        ])

        for c in candidates:
            if c and os.path.exists(c):
                return os.path.abspath(c)
        return None

    def _init_firebase(self, credentials_path: Optional[str]) -> None:
        resolved_path = self._resolve_credentials_path(credentials_path)
        if not resolved_path:
            raise RuntimeError(
                "Real Firebase Mode Active: Firebase Admin SDK credentials file 'serviceAccountKey.json' "
                "was not found! Please place your real serviceAccountKey.json into config/firebase/."
            )

        try:
            with open(resolved_path, "r", encoding="utf-8") as f:
                key_dict = json.load(f)

            self._project_id = key_dict.get("project_id")
            # Extract RSA public key from service account private key to verify custom tokens minted by this project
            priv_key = serialization.load_pem_private_key(
                key_dict["private_key"].encode("utf-8"),
                password=None,
            )
            self._public_key = priv_key.public_key()

            import firebase_admin
            from firebase_admin import credentials

            if not firebase_admin._apps:
                cred = credentials.Certificate(resolved_path)
                firebase_admin.initialize_app(cred)
            self._firebase_initialized = True
            logger.info(f"Firebase Admin SDK strictly initialized with project '{self._project_id}' ({resolved_path}).")
        except Exception as exc:
            raise RuntimeError(f"Failed to initialize real Firebase Admin SDK from '{resolved_path}': {exc}") from exc

    def create_signed_token(
        self,
        uid: str,
        email: str,
        role: str = "customer",
        name: str = "",
        expires_in_seconds: int = 86400 * 7,
    ) -> str:
        """Create a real Firebase Custom Token signed with the Firebase Service Account RSA private key."""
        if not self._firebase_initialized:
            raise UnauthorizedAccessException("Firebase Admin SDK is not initialized.")

        from firebase_admin import auth as fb_auth

        claims = {
            "email": email,
            "role": role,
            "name": name,
        }
        token_bytes = fb_auth.create_custom_token(uid, developer_claims=claims)
        return token_bytes.decode("utf-8") if isinstance(token_bytes, bytes) else str(token_bytes)

    def verify_token(self, token: str) -> CurrentUser:
        """Strictly verify real Firebase tokens (Google ID tokens or Service Account Custom Tokens).

        Raises UnauthorizedAccessException if invalid. NO local fallback/bypass.
        """
        if not self._firebase_initialized:
            raise UnauthorizedAccessException("Firebase Admin SDK is not initialized.")

        from firebase_admin import auth as fb_auth

        # 1. Attempt to verify as a Google Firebase ID Token (issued when clients sign in with Google/Firebase)
        try:
            decoded = fb_auth.verify_id_token(token)
            role_str = decoded.get("role", UserRole.CUSTOMER.value)
            return CurrentUser(
                uid=decoded["uid"],
                email=decoded.get("email"),
                role=UserRole(role_str) if role_str in UserRole._value2member_map_ else UserRole.CUSTOMER,
                name=decoded.get("name"),
            )
        except Exception as fb_exc:
            id_token_error = str(fb_exc)

        # 2. Attempt to verify as a Firebase Custom Token (minted by this service account)
        if self._public_key is not None:
            try:
                decoded_custom = jwt.decode(
                    token,
                    self._public_key,
                    algorithms=["RS256"],
                    audience="https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
                )
                claims = decoded_custom.get("claims", {})
                role_val = claims.get("role", UserRole.CUSTOMER.value)
                return CurrentUser(
                    uid=str(decoded_custom.get("uid") or decoded_custom.get("sub")),
                    email=claims.get("email"),
                    role=UserRole(role_val) if role_val in UserRole._value2member_map_ else UserRole.CUSTOMER,
                    name=claims.get("name"),
                )
            except Exception as jwt_exc:
                logger.debug(f"Custom token verification also failed: {jwt_exc}")

        # Strict: reject invalid tokens
        raise UnauthorizedAccessException(f"Invalid or expired Firebase token. Verification failed: {id_token_error}")


def _get_default_verifier() -> FirebaseAuthVerifier:
    try:
        return FirebaseAuthVerifier()
    except Exception as exc:
        logger.warning(f"Default FirebaseAuthVerifier deferred initialization: {exc}")
        return None  # Will be provided via DI in FastAPI lifecycle


default_auth_verifier = _get_default_verifier()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(default=None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
) -> CurrentUser:
    """FastAPI dependency resolving CurrentUser strictly from Bearer Token or Gateway headers."""
    if credentials and credentials.credentials:
        verifier = default_auth_verifier or FirebaseAuthVerifier()
        return verifier.verify_token(credentials.credentials)

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
