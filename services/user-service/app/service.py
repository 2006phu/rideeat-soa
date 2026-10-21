"""Application Service for User & Driver Profile Management."""

import uuid
from typing import Any, Dict, List, Optional

from services.common.domain.base_service import BaseApplicationService
from services.common.exceptions import BusinessRuleViolationException, EntityNotFoundException
from services.common.messaging.interfaces import IEventPublisher

from app.models import DriverProfile, SavedAddress, UserProfile
from app.qr_generator import QRCodeGenerator
from app.repositories import AddressRepository, DriverProfileRepository, UserProfileRepository
from app.schemas import (
    DriverProfileResponse,
    DriverRegisterRequest,
    QRVerificationResponse,
    SavedAddressCreateRequest,
    SavedAddressResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
)


class UserApplicationService(BaseApplicationService[UserProfileRepository]):
    """Orchestrates user profiles, saved addresses, driver onboarding state machine, and QR verification."""

    def __init__(
        self,
        profile_repo: UserProfileRepository,
        address_repo: AddressRepository,
        driver_repo: DriverProfileRepository,
        event_publisher: Optional[IEventPublisher] = None,
        qr_generator: Optional[QRCodeGenerator] = None,
    ) -> None:
        super().__init__(repository=profile_repo, event_publisher=event_publisher)
        self._profile_repo = profile_repo
        self._address_repo = address_repo
        self._driver_repo = driver_repo
        self._qr_generator = qr_generator or QRCodeGenerator()

    async def get_or_create_profile(
        self,
        user_id: str,
        default_name: Optional[str] = None,
    ) -> UserProfileResponse:
        """Retrieve a UserProfile by user_id or lazily initialize one."""
        profile = await self._profile_repo.get_by_user_id(user_id)
        if profile is None:
            profile = UserProfile(
                id=str(uuid.uuid4()),
                user_id=user_id,
                full_name=default_name or f"RideEat User ({user_id[:8]})",
                phone=None,
                avatar_url=None,
            )
            profile = await self._profile_repo.save(profile)
        return UserProfileResponse.model_validate(profile)

    async def update_profile(
        self,
        user_id: str,
        payload: UserProfileUpdateRequest,
        default_name: Optional[str] = None,
    ) -> UserProfileResponse:
        """Update user profile attributes via domain method."""
        profile = await self._profile_repo.get_by_user_id(user_id)
        if profile is None:
            profile = UserProfile(
                id=str(uuid.uuid4()),
                user_id=user_id,
                full_name=payload.full_name or default_name or f"RideEat User ({user_id[:8]})",
                phone=payload.phone,
                avatar_url=payload.avatar_url,
            )
        else:
            profile.update_profile(
                full_name=payload.full_name,
                phone=payload.phone,
                avatar_url=payload.avatar_url,
            )
        saved = await self._profile_repo.save(profile)
        return UserProfileResponse.model_validate(saved)

    async def add_saved_address(
        self,
        user_id: str,
        payload: SavedAddressCreateRequest,
    ) -> SavedAddressResponse:
        """Attach a new saved address to a user's profile."""
        profile = await self._profile_repo.get_by_user_id(user_id)
        if profile is None:
            profile = UserProfile(
                id=str(uuid.uuid4()),
                user_id=user_id,
                full_name=f"RideEat User ({user_id[:8]})",
            )
            profile = await self._profile_repo.save(profile)

        if payload.is_default:
            await self._address_repo.clear_default_for_user(user_id)

        address = SavedAddress(
            id=str(uuid.uuid4()),
            profile_id=profile.id,
            user_id=user_id,
            label=payload.label.strip(),
            full_address=payload.full_address.strip(),
            latitude=payload.latitude,
            longitude=payload.longitude,
            is_default=payload.is_default,
        )
        saved = await self._address_repo.save(address)
        return SavedAddressResponse.model_validate(saved)

    async def list_saved_addresses(self, user_id: str) -> List[SavedAddressResponse]:
        """List all saved addresses for a user."""
        addresses = await self._address_repo.list_by_user_id(user_id)
        return [SavedAddressResponse.model_validate(a) for a in addresses]

    async def delete_saved_address(self, user_id: str, address_id: str) -> Dict[str, Any]:
        """Delete a saved address belonging to the specified user."""
        address = await self._address_repo.get_by_id_or_raise(address_id)
        if address.user_id != user_id:
            raise BusinessRuleViolationException("Address does not belong to the specified user.")
        await self._address_repo.delete(address)
        return {"deleted": True, "address_id": address_id}

    async def register_driver(
        self,
        user_id: str,
        payload: DriverRegisterRequest,
    ) -> DriverProfileResponse:
        """Create or re-submit a driver onboarding profile in 'pending' state."""
        target_user_id = (payload.user_id or user_id).strip()
        existing = await self._driver_repo.get_by_user_id(target_user_id)
        if existing is not None:
            existing.vehicle_type = payload.vehicle_type.strip().lower()
            existing.license_plate = payload.license_plate.strip().upper()
            if payload.license_image_url is not None:
                existing.license_image_url = payload.license_image_url
            existing.validate_vehicle_type()
            if existing.status == "rejected":
                existing.status = "pending"
                existing.rejection_reason = None
            saved = await self._driver_repo.save(existing)
            return DriverProfileResponse.model_validate(saved)

        driver = DriverProfile(
            id=str(uuid.uuid4()),
            user_id=target_user_id,
            vehicle_type=payload.vehicle_type.strip().lower(),
            license_plate=payload.license_plate.strip().upper(),
            license_image_url=payload.license_image_url,
            status="pending",
            is_online=False,
        )
        driver.validate_vehicle_type()
        saved = await self._driver_repo.save(driver)
        return DriverProfileResponse.model_validate(saved)

    async def get_driver_profile(self, identifier: str) -> DriverProfileResponse:
        """Retrieve a driver profile by driver.id or driver.user_id."""
        driver = await self._driver_repo.get_by_id_or_user_id(identifier)
        if driver is None:
            raise EntityNotFoundException("DriverProfile", identifier)
        return DriverProfileResponse.model_validate(driver)

    async def list_drivers(
        self,
        status: Optional[str] = None,
        vehicle_type: Optional[str] = None,
        is_online: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[DriverProfileResponse]:
        """List driver profiles with optional filtering."""
        drivers = await self._driver_repo.list_drivers(
            status=status,
            vehicle_type=vehicle_type,
            is_online=is_online,
            skip=skip,
            limit=limit,
        )
        return [DriverProfileResponse.model_validate(d) for d in drivers]

    async def approve_driver(self, identifier: str) -> DriverProfileResponse:
        """Approve a pending driver via domain state machine and emit 'driver.approved' Kafka event."""
        driver = await self._driver_repo.get_by_id_or_user_id(identifier)
        if driver is None:
            raise EntityNotFoundException("DriverProfile", identifier)

        driver.approve()
        saved = await self._driver_repo.save(driver)

        await self.publish_domain_event(
            topic="driver.approved",
            payload={
                "driver_id": saved.id,
                "user_id": saved.user_id,
                "vehicle_type": saved.vehicle_type,
                "license_plate": saved.license_plate,
                "status": saved.status,
            },
            source_service="user-service",
        )
        return DriverProfileResponse.model_validate(saved)

    async def reject_driver(self, identifier: str, reason: str) -> DriverProfileResponse:
        """Reject a pending driver via domain state machine."""
        driver = await self._driver_repo.get_by_id_or_user_id(identifier)
        if driver is None:
            raise EntityNotFoundException("DriverProfile", identifier)

        driver.reject(reason=reason)
        saved = await self._driver_repo.save(driver)

        await self.publish_domain_event(
            topic="driver.rejected",
            payload={
                "driver_id": saved.id,
                "user_id": saved.user_id,
                "reason": reason,
                "status": saved.status,
            },
            source_service="user-service",
        )
        return DriverProfileResponse.model_validate(saved)

    async def set_driver_online(self, identifier: str, is_online: bool) -> DriverProfileResponse:
        """Toggle driver online status (only allowed if driver is approved)."""
        driver = await self._driver_repo.get_by_id_or_user_id(identifier)
        if driver is None:
            raise EntityNotFoundException("DriverProfile", identifier)

        driver.set_online(is_online)
        saved = await self._driver_repo.save(driver)
        return DriverProfileResponse.model_validate(saved)

    async def generate_driver_qr(self, identifier: str) -> QRVerificationResponse:
        """Generate a signed SVG + Base64 QR verification badge for a driver."""
        driver = await self._driver_repo.get_by_id_or_user_id(identifier)
        if driver is None:
            raise EntityNotFoundException("DriverProfile", identifier)

        qr_data = self._qr_generator.generate_driver_qr(
            driver_id=driver.id,
            user_id=driver.user_id,
            license_plate=driver.license_plate,
            vehicle_type=driver.vehicle_type,
            status=driver.status,
        )
        return QRVerificationResponse(**qr_data)

    async def seed_demo_data(self) -> Dict[str, Any]:
        """Idempotently seed demo user profiles, addresses, and driver profiles."""
        customer_profile = await self._profile_repo.get_by_user_id("demo-customer-001")
        if customer_profile is None:
            customer_profile = UserProfile(
                id="profile-customer-001",
                user_id="demo-customer-001",
                full_name="Nguyen Van Khach",
                phone="0901000001",
                avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=customer001",
            )
            customer_profile = await self._profile_repo.save(customer_profile)

            home_addr = SavedAddress(
                id="addr-home-001",
                profile_id=customer_profile.id,
                user_id="demo-customer-001",
                label="Home",
                full_address="Cho Ben Thanh, Quan 1, TP. Ho Chi Minh",
                latitude=10.7725,
                longitude=106.6980,
                is_default=True,
            )
            work_addr = SavedAddress(
                id="addr-work-001",
                profile_id=customer_profile.id,
                user_id="demo-customer-001",
                label="Office",
                full_address="Landmark 81, Binh Thanh, TP. Ho Chi Minh",
                latitude=10.7950,
                longitude=106.7218,
                is_default=False,
            )
            await self._address_repo.save(home_addr)
            await self._address_repo.save(work_addr)

        driver_user_profile = await self._profile_repo.get_by_user_id("demo-driver-001")
        if driver_user_profile is None:
            driver_user_profile = UserProfile(
                id="profile-driver-001",
                user_id="demo-driver-001",
                full_name="Tran Van Tai Xe",
                phone="0901000002",
                avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=driver001",
            )
            await self._profile_repo.save(driver_user_profile)

        # Approved & Online Demo Driver
        approved_driver = await self._driver_repo.get_by_user_id("demo-driver-001")
        if approved_driver is None:
            approved_driver = DriverProfile(
                id="driver-profile-001",
                user_id="demo-driver-001",
                vehicle_type="motorbike",
                license_plate="59-A1 123.45",
                license_image_url="https://storage.googleapis.com/rideeat-soa.appspot.com/licenses/driver-001.jpg",
                status="pending",
                is_online=False,
            )
            approved_driver.approve()
            approved_driver.set_online(True)
            await self._driver_repo.save(approved_driver)

        # Pending Demo Driver for Admin Approval Workflow testing
        pending_driver = await self._driver_repo.get_by_user_id("demo-driver-002")
        if pending_driver is None:
            pending_driver = DriverProfile(
                id="driver-profile-002",
                user_id="demo-driver-002",
                vehicle_type="car4",
                license_plate="51F-888.99",
                license_image_url="https://storage.googleapis.com/rideeat-soa.appspot.com/licenses/driver-002.jpg",
                status="pending",
                is_online=False,
            )
            await self._driver_repo.save(pending_driver)

        return {"seeded": True}
