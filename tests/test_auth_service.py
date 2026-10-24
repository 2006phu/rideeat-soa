"""Unit & Integration Test Suite for Auth Service & RBAC Architecture (Step 2 Test Gate)."""

import os
import sys
import unittest
from datetime import datetime, timezone
from typing import Dict, List, Optional

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "services", "auth-service"))

from services.common.contracts.dtos import UserPrincipalDTO
from services.common.contracts.enums import UserRole
from services.common.exceptions import (
    BusinessRuleViolationException,
    ForbiddenAccessException,
    UnauthorizedAccessException,
)
from services.common.messaging.interfaces import DomainEvent, IEventPublisher
from services.common.security.firebase_auth import CurrentUser, FirebaseAuthVerifier, RequireRole

from app.models import UserAccount
from app.schemas import (
    AuthTokenResponse,
    FirebaseLoginRequest,
    GoogleOAuthExchangeRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
)
from app.service import AuthApplicationService


class MockUserAccountRepository:
    """In-memory mock repository implementing UserAccountRepository contract."""

    def __init__(self) -> None:
        self._storage: Dict[str, UserAccount] = {}

    async def get_by_id(self, user_id: str) -> Optional[UserAccount]:
        return self._storage.get(user_id)

    async def get_by_email(self, email: str) -> Optional[UserAccount]:
        for u in self._storage.values():
            if u.email.lower() == email.lower():
                return u
        return None

    async def get_by_phone(self, phone: str) -> Optional[UserAccount]:
        for u in self._storage.values():
            if u.phone and u.phone == phone:
                return u
        return None

    async def get_by_firebase_uid(self, fb_uid: str) -> Optional[UserAccount]:
        for u in self._storage.values():
            if u.firebase_uid and u.firebase_uid == fb_uid:
                return u
        return None

    async def save(self, entity: UserAccount) -> UserAccount:
        if not hasattr(entity, "created_at") or entity.created_at is None:
            entity.created_at = datetime.now(timezone.utc)
        entity.updated_at = datetime.now(timezone.utc)
        self._storage[entity.id] = entity
        return entity

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[UserAccount]:
        return list(self._storage.values())[skip : skip + limit]

    async def delete(self, entity: UserAccount) -> None:
        self._storage.pop(entity.id, None)


class MockEventPublisher(IEventPublisher):
    """In-memory event capture for testing published domain events."""

    def __init__(self) -> None:
        self.published_events: List[DomainEvent] = []

    async def publish(self, event: DomainEvent) -> bool:
        self.published_events.append(event)
        return True


class TestAuthServiceArchitecture(unittest.IsolatedAsyncioTestCase):
    """Step 2 Test Gate: Verifies Auth Service, Google OAuth Exchange, JWT Tokens & RBAC."""

    def setUp(self) -> None:
        self.repo = MockUserAccountRepository()
        self.verifier = FirebaseAuthVerifier()
        self.event_bus = MockEventPublisher()
        self.service = AuthApplicationService(
            repository=self.repo,
            auth_verifier=self.verifier,
            event_publisher=self.event_bus,
        )

    def test_01_user_account_password_hashing_and_verification(self) -> None:
        """Verifies PBKDF2-HMAC-SHA256 password hashing and constant-time verification."""
        raw_pwd = "SecretPassword123!"
        hashed = UserAccount.hash_password(raw_pwd)

        self.assertTrue(hashed.startswith("pbkdf2_sha256$100000$"))
        user = UserAccount(
            id="u-test-1",
            email="test@rideeat.vn",
            full_name="Test User",
            password_hash=hashed,
            role="customer",
            is_active=True,
        )
        self.assertTrue(user.verify_password(raw_pwd))
        self.assertFalse(user.verify_password("WrongPassword999"))
        self.assertFalse(user.verify_password(""))

        # Rejects short passwords
        with self.assertRaises(BusinessRuleViolationException):
            UserAccount.hash_password("12345")

    def test_02_dto_principal_contract_conversion(self) -> None:
        """Verifies export to standard UserPrincipalDTO contract."""
        user = UserAccount(
            id="u-principal-1",
            email="driver@rideeat.vn",
            phone="+84901234567",
            full_name="Driver Hoang",
            password_hash="hash",
            role="driver",
            is_active=True,
        )
        dto: UserPrincipalDTO = user.to_principal_dto()
        self.assertEqual(dto.uid, "u-principal-1")
        self.assertEqual(dto.email, "driver@rideeat.vn")
        self.assertEqual(dto.role, UserRole.DRIVER)
        self.assertEqual(dto.full_name, "Driver Hoang")
        self.assertEqual(dto.phone_number, "+84901234567")

    async def test_03_register_and_login_lifecycle(self) -> None:
        """Verifies registration, token issuance, password check, and event publishing."""
        reg_req = RegisterRequest(
            email="newcustomer@rideeat.vn",
            phone="+84988776655",
            full_name="Le Van C",
            password="SecurePass2026!",
            role="customer",
        )
        reg_resp: AuthTokenResponse = await self.service.register(reg_req)
        self.assertIsNotNone(reg_resp.access_token)
        self.assertIsNotNone(reg_resp.refresh_token)
        self.assertEqual(reg_resp.user.email, "newcustomer@rideeat.vn")
        self.assertEqual(reg_resp.user.role, "customer")

        # Verify domain event emitted
        self.assertEqual(len(self.event_bus.published_events), 1)
        self.assertEqual(self.event_bus.published_events[0].topic, "user.registered")

        # Duplicate email rejected
        with self.assertRaises(BusinessRuleViolationException):
            await self.service.register(reg_req)

        # Successful login
        login_resp = await self.service.login(
            LoginRequest(email="newcustomer@rideeat.vn", password="SecurePass2026!")
        )
        self.assertEqual(login_resp.user.id, reg_resp.user.id)
        self.assertIsNotNone(login_resp.access_token)
        self.assertIsNotNone(login_resp.refresh_token)

        # Wrong password rejected
        with self.assertRaises(UnauthorizedAccessException):
            await self.service.login(
                LoginRequest(email="newcustomer@rideeat.vn", password="WrongPassword!")
            )

    async def test_04_refresh_token_rotation(self) -> None:
        """Verifies token refreshing using a valid refresh token."""
        reg_resp = await self.service.register(
            RegisterRequest(
                email="refresh_user@rideeat.vn",
                full_name="Refresh Tester",
                password="Password123!",
                role="customer",
            )
        )
        refresh_token = reg_resp.refresh_token
        self.assertIsNotNone(refresh_token)

        # Refresh to get a new access token
        new_token_resp = await self.service.refresh_token(refresh_token)
        self.assertIsNotNone(new_token_resp.access_token)
        self.assertIsNotNone(new_token_resp.refresh_token)
        self.assertEqual(new_token_resp.user.id, reg_resp.user.id)

    async def test_05_google_oauth_backend_token_exchange(self) -> None:
        """Verifies Google OAuth ID token backend exchange without exposing frontend secrets."""
        # Synthesize a signed Google ID token
        google_id_token = self.verifier.create_signed_token(
            uid="google-uid-888999",
            email="googleuser@gmail.com",
            role="customer",
            name="Google Test User",
        )

        exchange_req = GoogleOAuthExchangeRequest(
            id_token=google_id_token,
            role="customer",
        )
        exchange_resp = await self.service.google_oauth_exchange(exchange_req)

        self.assertIsNotNone(exchange_resp.access_token)
        self.assertIsNotNone(exchange_resp.refresh_token)
        self.assertEqual(exchange_resp.user.email, "googleuser@gmail.com")
        self.assertEqual(exchange_resp.user.full_name, "Google Test User")
        self.assertEqual(exchange_resp.user.role, "customer")

        # Second login with same Google token retrieves the same user
        second_resp = await self.service.google_oauth_exchange(exchange_req)
        self.assertEqual(second_resp.user.id, exchange_resp.user.id)

    async def test_06_rbac_require_role_guard(self) -> None:
        """Verifies RBAC access restrictions for customer, driver, restaurant, admin."""
        guard_driver = RequireRole(UserRole.DRIVER)
        guard_admin = RequireRole(UserRole.ADMIN)

        cust_user = CurrentUser(uid="u-c1", email="c1@rideeat.vn", role=UserRole.CUSTOMER)
        driver_user = CurrentUser(uid="u-d1", email="d1@rideeat.vn", role=UserRole.DRIVER)
        admin_user = CurrentUser(uid="u-a1", email="a1@rideeat.vn", role=UserRole.ADMIN)

        # Driver guard allows DRIVER
        self.assertEqual(await guard_driver(driver_user), driver_user)
        # Driver guard allows ADMIN (super-role)
        self.assertEqual(await guard_driver(admin_user), admin_user)

        # Driver guard blocks CUSTOMER with 403 Forbidden
        with self.assertRaises(ForbiddenAccessException):
            await guard_driver(cust_user)

        # Admin guard allows ADMIN, blocks DRIVER
        self.assertEqual(await guard_admin(admin_user), admin_user)
        with self.assertRaises(ForbiddenAccessException):
            await guard_admin(driver_user)


if __name__ == "__main__":
    unittest.main()
