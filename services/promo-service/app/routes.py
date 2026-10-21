"""FastAPI REST Routes for Promo, Voucher & Loyalty Service."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import LoyaltyAccountRepository, VoucherRepository
from app.schemas import (
    ApplyVoucherRequest,
    ApplyVoucherResponse,
    CreateVoucherRequest,
    FlashSaleConfigRequest,
    LoyaltyAccountResponse,
    LoyaltyEarnRequest,
    LoyaltyRedeemRequest,
    VoucherResponse,
)
from app.service import PromoApplicationService

router = APIRouter(prefix="/api/promos", tags=["Promotions, Vouchers & Loyalty"])


async def get_db_session(request: Request):
    db_manager = request.app.state.db_manager
    async for session in db_manager.get_session():
        yield session


def get_promo_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> PromoApplicationService:
    voucher_repo = VoucherRepository(session)
    loyalty_repo = LoyaltyAccountRepository(session)
    redis_manager = getattr(request.app.state, "redis_manager", None)
    kafka_bus = getattr(request.app.state, "kafka_bus", None)
    return PromoApplicationService(
        voucher_repository=voucher_repo,
        loyalty_repository=loyalty_repo,
        cache_provider=redis_manager,
        event_publisher=kafka_bus,
    )


@router.get("/vouchers", response_model=List[VoucherResponse])
async def list_vouchers(
    service: PromoApplicationService = Depends(get_promo_service),
) -> List[VoucherResponse]:
    """List all active promotional vouchers."""
    vouchers = await service.list_vouchers()
    return [VoucherResponse.model_validate(v) for v in vouchers]


@router.post("/vouchers", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_voucher(
    payload: CreateVoucherRequest,
    service: PromoApplicationService = Depends(get_promo_service),
) -> VoucherResponse:
    """Create a new promotional voucher."""
    voucher = await service.create_voucher(payload)
    return VoucherResponse.model_validate(voucher)


@router.post("/apply", response_model=ApplyVoucherResponse)
async def apply_voucher(
    payload: ApplyVoucherRequest,
    service: PromoApplicationService = Depends(get_promo_service),
) -> ApplyVoucherResponse:
    """Validate and apply a voucher code to an order/ride amount using polymorphic discount strategies."""
    return await service.apply_voucher(payload)


@router.get("/flash-sale")
async def get_flash_sale(
    service: PromoApplicationService = Depends(get_promo_service),
) -> Dict[str, Any]:
    """Retrieve active Redis-cached Flash Sale campaign."""
    return await service.get_active_flash_sale()


@router.post("/flash-sale")
async def configure_flash_sale(
    payload: FlashSaleConfigRequest = FlashSaleConfigRequest(),
    service: PromoApplicationService = Depends(get_promo_service),
) -> Dict[str, Any]:
    """Start or update a Redis TTL-backed Flash Sale campaign."""
    return await service.activate_flash_sale(payload)


@router.get("/loyalty/{user_id}", response_model=LoyaltyAccountResponse)
async def get_loyalty_account(
    user_id: str,
    service: PromoApplicationService = Depends(get_promo_service),
) -> LoyaltyAccountResponse:
    """Get loyalty points and membership tier (bronze, silver, gold, platinum) for a user."""
    account = await service.get_loyalty_account(user_id)
    return LoyaltyAccountResponse.model_validate(account)


@router.post("/loyalty/earn")
async def earn_loyalty_points(
    payload: LoyaltyEarnRequest,
    service: PromoApplicationService = Depends(get_promo_service),
) -> Dict[str, Any]:
    """Award loyalty points (+1 point per 10,000 VND spent) and upgrade tier automatically."""
    return await service.earn_loyalty_points(payload)


@router.post("/loyalty/redeem", response_model=LoyaltyAccountResponse)
async def redeem_loyalty_points(
    payload: LoyaltyRedeemRequest,
    service: PromoApplicationService = Depends(get_promo_service),
) -> LoyaltyAccountResponse:
    """Redeem loyalty points from a customer's loyalty balance."""
    account = await service.redeem_loyalty_points(payload)
    return LoyaltyAccountResponse.model_validate(account)
