"""Domain ORM Models for Auth Service with Encapsulated Business Behavior."""

import hashlib
import hmac
import secrets
from typing import Optional

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from services.common.db.base import BaseORMModel, TimestampMixin
from services.common.exceptions import BusinessRuleViolationException, InvalidStateTransitionException
from services.common.security.firebase_auth import UserRole


class UserAccount(BaseORMModel, TimestampMixin):
    """Domain Entity representing an authenticated user account in RideEat."""

    __tablename__ = "user_accounts"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default=UserRole.CUSTOMER.value, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    firebase_uid: Mapped[Optional[str]] = mapped_column(String(128), unique=True, index=True, nullable=True)

    @staticmethod
    def hash_password(plain_password: str) -> str:
        """Hash a plain-text password using PBKDF2-HMAC-SHA256 with a random salt."""
        if not plain_password or len(plain_password) < 6:
            raise BusinessRuleViolationException("Password must be at least 6 characters long.")
        salt = secrets.token_hex(16)
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000,
        )
        return f"pbkdf2_sha256$100000${salt}${dk.hex()}"

    def verify_password(self, plain_password: str) -> bool:
        """Verify a candidate plain-text password against the stored password hash."""
        if not self.password_hash or "$" not in self.password_hash:
            return False
        try:
            algorithm, iterations_str, salt, stored_hex = self.password_hash.split("$", 3)
            if algorithm != "pbkdf2_sha256":
                return False
            dk = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations_str),
            )
            return hmac.compare_digest(dk.hex(), stored_hex)
        except Exception:
            return False

    def deactivate(self) -> None:
        """Deactivate this user account (Domain Behavior)."""
        self.is_active = False

    def activate(self) -> None:
        """Activate this user account (Domain Behavior)."""
        self.is_active = True

    def change_role(self, new_role: str) -> None:
        """Validate and transition user role (Domain Behavior)."""
        valid_roles = {r.value for r in UserRole}
        if new_role not in valid_roles:
            raise BusinessRuleViolationException(
                f"Invalid role '{new_role}'. Allowed roles: {sorted(valid_roles)}",
                details={"invalid_role": new_role},
            )
        self.role = new_role
