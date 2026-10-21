"""Application Service for Promotions, Vouchers, Flash Sales & Loyalty Points."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from services.common.cache.redis_client import ICacheProvider
from services.common.domain.base_service import BaseApplicationService
from services.common.exceptions import BusinessRuleViolationException, EntityNotFoundException
from services.common.messaging.interfaces import IEventPublisher
from app.discount_strategy import DiscountStrategyFactory
from app.models import LoyaltyAccount, Voucher
from app.repositories import LoyaltyAccountRepository, VoucherRepository
from app.schemas import (
    ApplyVoucherRequest,
    ApplyVoucherResponse,
    CreateVoucherRequest,
    FlashSaleConfigRequest,
    LoyaltyEarnRequest,
    LoyaltyRedeemRequest,
)


class PromoApplicationService(BaseApplicationService[VoucherRepository]):
    """Encapsulates voucher validation, polymorphic discount computation, flash-sale cache, and loyalty tiers."""

    FLASH_SALE_CACHE_KEY = "promo:flash_sale:active"

    def __init__(
        self,
        voucher_repository: VoucherRepository,
        loyalty_repository: LoyaltyAccountRepository,
        cache_provider: Optional[ICacheProvider] = None,
        event_publisher: Optional[IEventPublisher] = None,
    ) -> None:
        super().__init__(repository=voucher_repository, event_publisher=event_publisher)
        self._loyalty_repo = loyalty_repository
        self._cache = cache_provider

    async def list_vouchers(self) -> List[Voucher]:
        """Return all active promotional vouchers."""
        return await self.repository.list_active_vouchers()

    async def create_voucher(self, payload: CreateVoucherRequest) -> Voucher:
        """Create a new promotional voucher."""
        code = payload.code.upper().strip()
        existing = await self.repository.get_by_code(code)
        if existing is not None:
            raise BusinessRuleViolationException(
                f"Voucher code '{code}' already exists.",
                details={"code": code},
            )
        # Validate strategy type via Factory
        DiscountStrategyFactory.get_strategy(payload.discount_type)

        voucher = Voucher(
            code=code,
            title=payload.title,
            discount_type=payload.discount_type.lower().strip(),
            discount_value=payload.discount_value,
            min_order_value=payload.min_order_value,
            max_discount=payload.max_discount,
            usage_limit=payload.usage_limit,
            used_count=0,
            is_active=True,
            expires_at=payload.expires_at
            or (datetime.now(timezone.utc) + timedelta(days=30)),
        )
        return await self.repository.save(voucher)

    async def apply_voucher(self, payload: ApplyVoucherRequest) -> ApplyVoucherResponse:
        """Validate voucher eligibility, compute discount via Strategy Pattern, and optionally consume usage."""
        code = payload.code.upper().strip()
        voucher = await self.repository.get_by_code(code)
        if voucher is None:
            raise EntityNotFoundException("Voucher", code)

        voucher.validate_applicable(payload.order_amount)
        strategy = DiscountStrategyFactory.get_strategy(voucher.discount_type)
        discount_amount = strategy.compute_discount(
            order_amount=payload.order_amount,
            discount_value=voucher.discount_value,
            max_discount=voucher.max_discount,
        )
        final_amount = round(max(0.0, payload.order_amount - discount_amount), 2)

        if payload.consume_voucher:
            voucher.consume(payload.order_amount)
            voucher = await self.repository.save(voucher)

        await self.publish_domain_event(
            topic="promo.voucher_applied",
            payload={
                "code": voucher.code,
                "user_id": payload.user_id,
                "order_amount": payload.order_amount,
                "discount_amount": discount_amount,
                "final_amount": final_amount,
            },
            source_service="promo-service",
        )

        return ApplyVoucherResponse(
            code=voucher.code,
            title=voucher.title,
            discount_type=voucher.discount_type,
            order_amount=payload.order_amount,
            discount_amount=discount_amount,
            final_amount=final_amount,
            remaining_uses=max(0, voucher.usage_limit - voucher.used_count),
        )

    async def get_active_flash_sale(self) -> Dict[str, Any]:
        """Get active flash-sale campaign stored in Redis with TTL."""
        if self._cache is not None:
            cached = await self._cache.get_json(self.FLASH_SALE_CACHE_KEY)
            if cached is not None:
                return cached

        default_campaign = {
            "active": True,
            "campaign_name": "Siêu Sale Giờ Vàng RideEat",
            "voucher_code": "GRAB50",
            "bonus_discount_percent": 50.0,
            "featured_vouchers": ["GIAM20", "FREESHIP15K", "GRAB50"],
            "ends_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
        }
        if self._cache is not None:
            await self._cache.set_json(
                self.FLASH_SALE_CACHE_KEY, default_campaign, ttl_seconds=1800
            )
        return default_campaign

    async def activate_flash_sale(self, payload: FlashSaleConfigRequest) -> Dict[str, Any]:
        """Configure and cache a Redis TTL-backed flash-sale campaign."""
        campaign = {
            "active": True,
            "campaign_name": payload.campaign_name,
            "voucher_code": payload.voucher_code.upper().strip(),
            "bonus_discount_percent": payload.bonus_discount_percent,
            "featured_vouchers": ["GIAM20", "FREESHIP15K", payload.voucher_code.upper().strip()],
            "ends_at": (
                datetime.now(timezone.utc) + timedelta(seconds=payload.ttl_seconds)
            ).isoformat(),
        }
        if self._cache is not None:
            await self._cache.set_json(
                self.FLASH_SALE_CACHE_KEY, campaign, ttl_seconds=payload.ttl_seconds
            )
        return campaign

    async def get_loyalty_account(self, user_id: str) -> LoyaltyAccount:
        """Retrieve or initialize a user's loyalty account."""
        return await self._loyalty_repo.get_or_create(user_id)

    async def earn_loyalty_points(self, payload: LoyaltyEarnRequest) -> Dict[str, Any]:
        """Credit loyalty points (+1 pt per 10,000 VND) and recalculate tier."""
        account = await self._loyalty_repo.get_or_create(payload.user_id)
        earned = account.earn_points(payload.spend_amount)
        account = await self._loyalty_repo.save(account)

        await self.publish_domain_event(
            topic="promo.loyalty_earned",
            payload={
                "user_id": account.user_id,
                "points_earned": earned,
                "total_points": account.points,
                "tier": account.tier,
                "reference_id": payload.reference_id,
            },
            source_service="promo-service",
        )
        return {
            "user_id": account.user_id,
            "points_earned": earned,
            "total_points": account.points,
            "tier": account.tier,
        }

    async def redeem_loyalty_points(self, payload: LoyaltyRedeemRequest) -> LoyaltyAccount:
        """Redeem loyalty points from a customer's account."""
        account = await self._loyalty_repo.get_or_create(payload.user_id)
        account.redeem_points(payload.points)
        return await self._loyalty_repo.save(account)
