"""Application Service for Auth Service (Constructor Dependency Injection & OOP)."""

import uuid
from typing import Any, Dict, List, Optional

from services.common.domain.base_service import BaseApplicationService
from services.common.exceptions import (
    BusinessRuleViolationException,
    ForbiddenAccessException,
    UnauthorizedAccessException,
)
from services.common.messaging.interfaces import IEventPublisher
from services.common.security.firebase_auth import CurrentUser, FirebaseAuthVerifier, UserRole

from app.models import UserAccount
from app.repositories import UserAccountRepository
from app.schemas import (
    AuthTokenResponse,
    FirebaseLoginRequest,
    LoginRequest,
    RegisterRequest,
    TokenVerificationResponse,
    UserAccountResponse,
)


class AuthApplicationService(BaseApplicationService[UserAccountRepository]):
    """Encapsulates authentication, token issuance, RBAC management, and account lifecycle."""

    def __init__(
        self,
        repository: UserAccountRepository,
        auth_verifier: FirebaseAuthVerifier,
        event_publisher: Optional[IEventPublisher] = None,
    ) -> None:
        super().__init__(repository=repository, event_publisher=event_publisher)
        self._auth_verifier = auth_verifier

    async def register(self, payload: RegisterRequest) -> AuthTokenResponse:
        """Register a new user account, hash password, persist, and issue JWT."""
        normalized_email = payload.email.strip().lower()
        existing_email = await self.repository.get_by_email(normalized_email)
        if existing_email is not None:
            raise BusinessRuleViolationException(
                f"Account with email '{normalized_email}' is already registered.",
                details={"email": normalized_email},
            )

        normalized_phone = payload.phone.strip() if payload.phone else None
        if normalized_phone:
            existing_phone = await self.repository.get_by_phone(normalized_phone)
            if existing_phone is not None:
                raise BusinessRuleViolationException(
                    f"Account with phone '{normalized_phone}' is already registered.",
                    details={"phone": normalized_phone},
                )

        user = UserAccount(
            id=str(uuid.uuid4()),
            email=normalized_email,
            phone=normalized_phone,
            full_name=payload.full_name.strip(),
            password_hash=UserAccount.hash_password(payload.password),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        user.change_role(payload.role.strip().lower())
        saved_user = await self.repository.save(user)

        token = self._auth_verifier.create_signed_token(
            uid=saved_user.id,
            email=saved_user.email,
            role=saved_user.role,
            name=saved_user.full_name,
        )

        await self.publish_domain_event(
            topic="user.registered",
            payload={
                "user_id": saved_user.id,
                "email": saved_user.email,
                "phone": saved_user.phone,
                "full_name": saved_user.full_name,
                "role": saved_user.role,
            },
            source_service="auth-service",
        )

        return AuthTokenResponse(
            access_token=token,
            user=UserAccountResponse.model_validate(saved_user),
        )

    async def login(self, payload: LoginRequest) -> AuthTokenResponse:
        """Authenticate a user with email and password and issue a signed token."""
        normalized_email = payload.email.strip().lower()
        user = await self.repository.get_by_email(normalized_email)
        if user is None or not user.verify_password(payload.password):
            raise UnauthorizedAccessException("Invalid email or password.")

        if not user.is_active:
            raise ForbiddenAccessException("User account has been deactivated by an administrator.")

        token = self._auth_verifier.create_signed_token(
            uid=user.id,
            email=user.email,
            role=user.role,
            name=user.full_name,
        )
        return AuthTokenResponse(
            access_token=token,
            user=UserAccountResponse.model_validate(user),
        )

    async def firebase_oauth_login(self, payload: FirebaseLoginRequest) -> AuthTokenResponse:
        """Authenticate or auto-provision a user via Firebase OAuth ID token."""
        fb_uid: Optional[str] = payload.firebase_uid
        email: Optional[str] = payload.email.strip().lower() if payload.email else None
        full_name: Optional[str] = payload.full_name
        role_str: str = payload.role.strip().lower() if payload.role else UserRole.CUSTOMER.value

        if payload.id_token:
            try:
                verified: CurrentUser = self._auth_verifier.verify_token(payload.id_token)
                fb_uid = fb_uid or verified.uid
                email = email or (verified.email.lower() if verified.email else None)
                full_name = full_name or verified.name
                if verified.role:
                    role_str = verified.role.value
            except UnauthorizedAccessException:
                if not email and not fb_uid:
                    raise

        if not email and not fb_uid:
            raise BusinessRuleViolationException(
                "Firebase login requires either a valid id_token or (email / firebase_uid)."
            )

        user: Optional[UserAccount] = None
        if fb_uid:
            user = await self.repository.get_by_firebase_uid(fb_uid)
        if user is None and email:
            user = await self.repository.get_by_email(email)

        if user is None:
            generated_uid = fb_uid or f"fb-{uuid.uuid4().hex[:12]}"
            resolved_email = email or f"{generated_uid}@firebase.rideeat.vn"
            user = UserAccount(
                id=str(uuid.uuid4()),
                email=resolved_email,
                phone=payload.phone.strip() if payload.phone else None,
                full_name=full_name or resolved_email.split("@")[0],
                password_hash=UserAccount.hash_password(uuid.uuid4().hex),
                role=UserRole.CUSTOMER.value,
                is_active=True,
                firebase_uid=generated_uid,
            )
            user.change_role(role_str)
            user = await self.repository.save(user)
            await self.publish_domain_event(
                topic="user.registered",
                payload={
                    "user_id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "provider": "firebase",
                },
                source_service="auth-service",
            )
        else:
            if fb_uid and not user.firebase_uid:
                user.firebase_uid = fb_uid
                user = await self.repository.save(user)

        if not user.is_active:
            raise ForbiddenAccessException("User account has been deactivated by an administrator.")

        token = self._auth_verifier.create_signed_token(
            uid=user.id,
            email=user.email,
            role=user.role,
            name=user.full_name,
        )
        return AuthTokenResponse(
            access_token=token,
            user=UserAccountResponse.model_validate(user),
        )

    async def verify_token(self, token: str) -> TokenVerificationResponse:
        """Verify a JWT or Firebase token and enrich with live account status."""
        principal = self._auth_verifier.verify_token(token)
        user = await self.repository.get_by_id(principal.uid)
        if user is not None:
            if not user.is_active:
                raise ForbiddenAccessException("User account is deactivated.")
            return TokenVerificationResponse(
                valid=True,
                uid=user.id,
                email=user.email,
                role=user.role,
                name=user.full_name,
                is_active=user.is_active,
            )

        return TokenVerificationResponse(
            valid=True,
            uid=principal.uid,
            email=principal.email,
            role=principal.role.value,
            name=principal.name,
            is_active=True,
        )

    async def get_user_profile(self, current_user: CurrentUser) -> UserAccountResponse:
        """Retrieve the full UserAccount record for the currently authenticated user."""
        user = await self.repository.get_by_id(current_user.uid)
        if user is None and current_user.email:
            user = await self.repository.get_by_email(current_user.email)
        if user is None:
            user = await self.repository.get_by_id_or_raise(current_user.uid)
        return UserAccountResponse.model_validate(user)

    async def toggle_user_status(
        self,
        user_id: str,
        is_active: bool,
        new_role: Optional[str] = None,
    ) -> UserAccountResponse:
        """Activate or deactivate a user account (and optionally update role) via domain methods."""
        user = await self.repository.get_by_id_or_raise(user_id)
        if is_active:
            user.activate()
        else:
            user.deactivate()

        if new_role:
            user.change_role(new_role.strip().lower())

        saved = await self.repository.save(user)
        await self.publish_domain_event(
            topic="user.status_changed",
            payload={
                "user_id": saved.id,
                "email": saved.email,
                "is_active": saved.is_active,
                "role": saved.role,
            },
            source_service="auth-service",
        )
        return UserAccountResponse.model_validate(saved)

    async def list_users(
        self,
        role: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[UserAccountResponse]:
        """Return a paginated list of user accounts."""
        users = await self.repository.list_by_role(role=role, skip=skip, limit=limit)
        return [UserAccountResponse.model_validate(u) for u in users]

    async def seed_demo_accounts(self) -> List[Dict[str, Any]]:
        """Idempotently seed standard RideEat demo accounts for all 4 RBAC roles."""
        demo_accounts = [
            {
                "id": "demo-customer-001",
                "email": "customer@rideeat.vn",
                "phone": "0901000001",
                "full_name": "Nguyen Van Khach",
                "role": UserRole.CUSTOMER.value,
                "firebase_uid": "fb-customer-001",
            },
            {
                "id": "demo-driver-001",
                "email": "driver@rideeat.vn",
                "phone": "0901000002",
                "full_name": "Tran Van Tai Xe",
                "role": UserRole.DRIVER.value,
                "firebase_uid": "fb-driver-001",
            },
            {
                "id": "demo-restaurant-001",
                "email": "restaurant@rideeat.vn",
                "phone": "0901000003",
                "full_name": "Nha Hang Pho Viet",
                "role": UserRole.RESTAURANT.value,
                "firebase_uid": "fb-restaurant-001",
            },
            {
                "id": "demo-admin-001",
                "email": "admin@rideeat.vn",
                "phone": "0901000004",
                "full_name": "Quan Tri Vien RideEat",
                "role": UserRole.ADMIN.value,
                "firebase_uid": "fb-admin-001",
            },
        ]
        seeded: List[Dict[str, Any]] = []
        default_password_hash = UserAccount.hash_password("Password123!")

        for item in demo_accounts:
            existing = await self.repository.get_by_email(item["email"])
            if existing is None:
                account = UserAccount(
                    id=item["id"],
                    email=item["email"],
                    phone=item["phone"],
                    full_name=item["full_name"],
                    password_hash=default_password_hash,
                    role=item["role"],
                    is_active=True,
                    firebase_uid=item["firebase_uid"],
                )
                await self.repository.save(account)
                seeded.append({"email": item["email"], "role": item["role"], "id": item["id"]})
        if seeded:
            self.logger.info(f"Seeded {len(seeded)} demo accounts: {seeded}")
        return seeded
