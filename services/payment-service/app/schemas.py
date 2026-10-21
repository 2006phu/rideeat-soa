"""Pydantic Request & Response Schemas for Payment & Wallet Service."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WalletTopupRequest(BaseModel):
    user_id: str = Field(..., description="Target user ID")
    amount: float = Field(..., gt=0, description="Amount in VND to deposit")
    description: Optional[str] = Field(default="Wallet top-up")


class WalletWithdrawRequest(BaseModel):
    user_id: str = Field(..., description="Target user ID")
    amount: float = Field(..., gt=0, description="Amount in VND to withdraw")
    description: Optional[str] = Field(default="Wallet withdrawal")


class ProcessPaymentRequest(BaseModel):
    user_id: str = Field(..., description="Payer user ID")
    reference_id: str = Field(..., description="Ride ID or Food Order ID")
    reference_type: str = Field(default="ride", description="ride | food_order | wallet")
    payment_method: str = Field(default="wallet", description="cash | wallet | mock_gateway")
    amount: float = Field(..., gt=0, description="Payment amount in VND")
    description: Optional[str] = Field(default=None)


class RefundPaymentRequest(BaseModel):
    reason: Optional[str] = Field(default="Customer requested refund")


class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    currency: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentTransactionResponse(BaseModel):
    id: str
    user_id: str
    reference_id: str
    reference_type: str
    transaction_type: str
    payment_method: str
    amount: float
    status: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
