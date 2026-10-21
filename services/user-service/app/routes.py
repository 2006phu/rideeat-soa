"""FastAPI Routes for User & Driver Profile Service (/api/users/...)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.security.firebase_auth import CurrentUser, RequireRole, UserRole, get_current_user

from app.repositories import AddressRepository, DriverProfileRepository, UserProfileRepository
from app.schemas import (
    DriverOnlineToggleRequest,
    DriverProfileResponse,
    DriverRegisterRequest,
    DriverRejectRequest,
    QRVerificationResponse,
    SavedAddressCreateRequest,
    SavedAddressResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
)
from app.service import UserApplicationService

router = APIRouter(prefix="/api/users", tags=["Users, Addresses & Drivers"])


async def get_db_session(request: Request):
    """Yield an AsyncSession from the app state's DatabaseManager."""
    async for session in request.app.state.db_manager.get_session():
        yield session


def get_user_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> UserApplicationService:
    """Construct UserApplicationService with injected Repositories, EventBus, and QRCodeGenerator."""
    return UserApplicationService(
        profile_repo=UserProfileRepository(session=session),
        address_repo=AddressRepository(session=session),
        driver_repo=DriverProfileRepository(session=session),
        event_publisher=request.app.state.event_bus,
        qr_generator=request.app.state.qr_generator,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> UserProfileResponse:
    """Get or lazily initialize the authenticated user's profile."""
    return await service.get_or_create_profile(
        user_id=current_user.uid,
        default_name=current_user.name,
    )


@router.put("/me", response_model=UserProfileResponse)
async def update_my_profile(
    payload: UserProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> UserProfileResponse:
    """Update the authenticated user's profile."""
    return await service.update_profile(
        user_id=current_user.uid,
        payload=payload,
        default_name=current_user.name,
    )


@router.get("/profiles/{user_id}", response_model=UserProfileResponse)
async def get_profile_by_user_id(
    user_id: str,
    service: UserApplicationService = Depends(get_user_service),
) -> UserProfileResponse:
    """Retrieve a user profile by user_id."""
    return await service.get_or_create_profile(user_id=user_id)


@router.put("/profiles/{user_id}", response_model=UserProfileResponse)
async def update_profile_by_user_id(
    user_id: str,
    payload: UserProfileUpdateRequest,
    service: UserApplicationService = Depends(get_user_service),
) -> UserProfileResponse:
    """Update a user profile by user_id."""
    return await service.update_profile(user_id=user_id, payload=payload)


@router.get("/me/addresses", response_model=List[SavedAddressResponse])
async def list_my_addresses(
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> List[SavedAddressResponse]:
    """List saved addresses for the authenticated user."""
    return await service.list_saved_addresses(user_id=current_user.uid)


@router.post("/me/addresses", response_model=SavedAddressResponse, status_code=status.HTTP_201_CREATED)
async def add_my_address(
    payload: SavedAddressCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> SavedAddressResponse:
    """Add a saved address for the authenticated user."""
    return await service.add_saved_address(user_id=current_user.uid, payload=payload)


@router.delete("/me/addresses/{address_id}")
async def delete_my_address(
    address_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> Dict[str, Any]:
    """Delete a saved address belonging to the authenticated user."""
    return await service.delete_saved_address(user_id=current_user.uid, address_id=address_id)


@router.get("/{user_id}/addresses", response_model=List[SavedAddressResponse])
async def list_user_addresses(
    user_id: str,
    service: UserApplicationService = Depends(get_user_service),
) -> List[SavedAddressResponse]:
    """List saved addresses for a specific user_id."""
    return await service.list_saved_addresses(user_id=user_id)


@router.post("/{user_id}/addresses", response_model=SavedAddressResponse, status_code=status.HTTP_201_CREATED)
async def add_user_address(
    user_id: str,
    payload: SavedAddressCreateRequest,
    service: UserApplicationService = Depends(get_user_service),
) -> SavedAddressResponse:
    """Add a saved address for a specific user_id."""
    return await service.add_saved_address(user_id=user_id, payload=payload)


@router.post("/drivers/register", response_model=DriverProfileResponse, status_code=status.HTTP_201_CREATED)
@router.post("/drivers", response_model=DriverProfileResponse, status_code=status.HTTP_201_CREATED)
async def register_driver_profile(
    payload: DriverRegisterRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> DriverProfileResponse:
    """Submit a driver onboarding profile in 'pending' status."""
    return await service.register_driver(user_id=current_user.uid, payload=payload)


@router.get("/drivers", response_model=List[DriverProfileResponse])
async def list_driver_profiles(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    vehicle_type: Optional[str] = Query(default=None),
    is_online: Optional[bool] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    service: UserApplicationService = Depends(get_user_service),
) -> List[DriverProfileResponse]:
    """List driver profiles with optional filtering by status, vehicle_type, or is_online."""
    return await service.list_drivers(
        status=status_filter,
        vehicle_type=vehicle_type,
        is_online=is_online,
        skip=skip,
        limit=limit,
    )


@router.get("/drivers/me", response_model=DriverProfileResponse)
async def get_my_driver_profile(
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> DriverProfileResponse:
    """Get the authenticated driver's onboarding & status profile."""
    return await service.get_driver_profile(identifier=current_user.uid)


@router.put("/drivers/me/online", response_model=DriverProfileResponse)
async def toggle_my_driver_online(
    payload: DriverOnlineToggleRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> DriverProfileResponse:
    """Set the authenticated driver's online status (requires 'approved' status)."""
    return await service.set_driver_online(identifier=current_user.uid, is_online=payload.is_online)


@router.get("/drivers/{driver_id}", response_model=DriverProfileResponse)
async def get_driver_by_id(
    driver_id: str,
    service: UserApplicationService = Depends(get_user_service),
) -> DriverProfileResponse:
    """Get a driver profile by driver ID or user_id."""
    return await service.get_driver_profile(identifier=driver_id)


@router.put("/drivers/{driver_id}/approve", response_model=DriverProfileResponse)
@router.post("/drivers/{driver_id}/approve", response_model=DriverProfileResponse)
async def approve_driver_profile(
    driver_id: str,
    _admin: CurrentUser = Depends(RequireRole(UserRole.ADMIN)),
    service: UserApplicationService = Depends(get_user_service),
) -> DriverProfileResponse:
    """Approve a pending driver application and publish 'driver.approved' Kafka event (Admin RBAC)."""
    return await service.approve_driver(identifier=driver_id)


@router.put("/drivers/{driver_id}/reject", response_model=DriverProfileResponse)
@router.post("/drivers/{driver_id}/reject", response_model=DriverProfileResponse)
async def reject_driver_profile(
    driver_id: str,
    payload: Optional[DriverRejectRequest] = Body(default=None),
    _admin: CurrentUser = Depends(RequireRole(UserRole.ADMIN)),
    service: UserApplicationService = Depends(get_user_service),
) -> DriverProfileResponse:
    """Reject a pending driver application (Admin RBAC)."""
    reason = payload.reason if payload else "Driver documents did not pass verification."
    return await service.reject_driver(identifier=driver_id, reason=reason)


@router.put("/drivers/{driver_id}/online", response_model=DriverProfileResponse)
async def set_driver_online_status(
    driver_id: str,
    payload: DriverOnlineToggleRequest,
    _user: CurrentUser = Depends(get_current_user),
    service: UserApplicationService = Depends(get_user_service),
) -> DriverProfileResponse:
    """Toggle a driver's online status (only allowed if driver is approved)."""
    return await service.set_driver_online(identifier=driver_id, is_online=payload.is_online)


@router.get("/drivers/{driver_id}/qr", response_model=QRVerificationResponse)
async def get_driver_verification_qr(
    driver_id: str,
    service: UserApplicationService = Depends(get_user_service),
) -> QRVerificationResponse:
    """Generate a signed SVG and Base64 QR verification badge for a driver."""
    return await service.generate_driver_qr(identifier=driver_id)
