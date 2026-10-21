"""FastAPI Routes for Auth Service."""

from typing import List, Optional
from fastapi import APIRouter, Body, Depends, Header, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.exceptions import UnauthorizedAccessException
from services.common.security.firebase_auth import CurrentUser, RequireRole, UserRole, get_current_user

from app.repositories import UserAccountRepository
from app.schemas import (
    AuthTokenResponse,
    FirebaseLoginRequest,
    LoginRequest,
    RegisterRequest,
    ToggleUserStatusRequest,
    TokenVerificationResponse,
    UserAccountResponse,
    VerifyTokenRequest,
)
from app.service import AuthApplicationService

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])


async def get_db_session(request: Request):
    """Yield an AsyncSession from the app state's DatabaseManager."""
    async for session in request.app.state.db_manager.get_session():
        yield session


def get_auth_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> AuthApplicationService:
    """Construct AuthApplicationService with injected Repository, AuthVerifier, and EventBus."""
    repository = UserAccountRepository(session=session)
    return AuthApplicationService(
        repository=repository,
        auth_verifier=request.app.state.auth_verifier,
        event_publisher=request.app.state.event_bus,
    )


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_account(
    payload: RegisterRequest,
    service: AuthApplicationService = Depends(get_auth_service),
) -> AuthTokenResponse:
    """Register a new customer, driver, restaurant, or admin account."""
    return await service.register(payload)


@router.post("/login", response_model=AuthTokenResponse)
async def login_account(
    payload: LoginRequest,
    service: AuthApplicationService = Depends(get_auth_service),
) -> AuthTokenResponse:
    """Authenticate with email and password and receive a JWT access token."""
    return await service.login(payload)


@router.post("/firebase-login", response_model=AuthTokenResponse)
async def firebase_oauth_login(
    payload: FirebaseLoginRequest,
    service: AuthApplicationService = Depends(get_auth_service),
) -> AuthTokenResponse:
    """Authenticate or auto-provision an account using Firebase OAuth ID token."""
    return await service.firebase_oauth_login(payload)


@router.get("/me", response_model=UserAccountResponse)
async def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthApplicationService = Depends(get_auth_service),
) -> UserAccountResponse:
    """Retrieve the authenticated user's account profile."""
    return await service.get_user_profile(current_user)


@router.post("/verify", response_model=TokenVerificationResponse)
async def verify_token(
    payload: Optional[VerifyTokenRequest] = Body(default=None),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
    service: AuthApplicationService = Depends(get_auth_service),
) -> TokenVerificationResponse:
    """Verify a JWT or Firebase token from request body or Authorization header."""
    raw_token: Optional[str] = payload.token if payload and payload.token else None
    if not raw_token and authorization:
        if authorization.lower().startswith("bearer "):
            raw_token = authorization[7:].strip()
        else:
            raw_token = authorization.strip()
    if not raw_token:
        raise UnauthorizedAccessException("Token must be provided in body or Authorization header.")
    return await service.verify_token(raw_token)


@router.put("/users/{user_id}/status", response_model=UserAccountResponse)
async def toggle_user_status(
    user_id: str,
    payload: ToggleUserStatusRequest,
    _admin: CurrentUser = Depends(RequireRole(UserRole.ADMIN)),
    service: AuthApplicationService = Depends(get_auth_service),
) -> UserAccountResponse:
    """Activate or deactivate a user account (Admin RBAC required)."""
    return await service.toggle_user_status(
        user_id=user_id,
        is_active=payload.is_active,
        new_role=payload.role,
    )


@router.get("/users", response_model=List[UserAccountResponse])
async def list_users(
    role: Optional[str] = Query(default=None, description="Filter by role"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    service: AuthApplicationService = Depends(get_auth_service),
) -> List[UserAccountResponse]:
    """List user accounts with optional role filtering."""
    return await service.list_users(role=role, skip=skip, limit=limit)
