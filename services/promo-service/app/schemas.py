"""Pydantic Request & Response Schemas for Promo, Voucher & Loyalty Service."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CreateVoucherRequest(BaseModel):
    code: str = Field(..., description="Unique voucher code (e.g. GIAM20)")
    title: str = Field(..., description="Display title")
    discount_type: str = Field(default="percentage", description="percentage | fixed")
    discount_value: float = Field(..., gt=0, description="Percentage (1..100) or VND amount")
    min_order_value: float = Field(default=0.0, ge=0.0)
    max_discount: Optional[float] = Field(default=None)
    usage_limit: int = Field(default=500, gt=0)
    expires_at: Optional[datetime] = Field(default=None)


class ApplyVoucherRequest(BaseModel):
    code: str = Field(..., description="Voucher code to apply")
    order_amount: float = Field(..., gt=0, description="Original order/ride amount in VND")
    user_id: Optional[str] = Field(default=None, description="Customer applying the voucher")
    consume_voucher: bool = Field(
        default=True, description="Whether to increment used_count immediately"
    )


class ApplyVoucherResponse(BaseModel):
    code: str
    title: str
    discount_type: str
    order_amount: float
    discount_amount: float
    final_amount: float
    remaining_uses: int


class VoucherResponse(BaseModel):
    id: str
    code: str
    title: str
    discount_type: str
    discount_value: float
    min_order_value: float
    max_discount: Optional[float] = None
    usage_limit: int
    used_count: int
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FlashSaleConfigRequest(BaseModel):
    campaign_name: str = Field(default="Siêu Sale Giờ Vàng RideEat")
    voucher_code: str = Field(default="GRAB50")
    bonus_discount_percent: float = Field(default=50.0, gt=0, le=90)
    ttl_seconds: int = Field(default=1800, gt=0, le=86400)


class LoyaltyEarnRequest(BaseModel):
    user_id: str = Field(..., description="Customer user ID")
    spend_amount: float = Field(..., gt=0, description="Amount spent in VND")
    reference_id: Optional[str] = Field(default=None)


class LoyaltyRedeemRequest(BaseModel):
    user_id: str = Field(..., description="Customer user ID")
    points: int = Field(..., gt=0, description="Points to redeem")


class LoyaltyAccountResponse(BaseModel):
    id: str
    user_id: str
    points: int
    tier: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
