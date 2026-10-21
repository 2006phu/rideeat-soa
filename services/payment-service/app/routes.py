"""FastAPI REST Routes for Payment & Wallet Service."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import PaymentTransactionRepository, WalletRepository
from app.schemas import (
    PaymentTransactionResponse,
    ProcessPaymentRequest,
    RefundPaymentRequest,
    WalletResponse,
    WalletTopupRequest,
    WalletWithdrawRequest,
)
from app.service import PaymentApplicationService

router = APIRouter(prefix="/api/payments", tags=["Payments & Wallet"])


async def get_db_session(request: Request):
    db_manager = request.app.state.db_manager
    async for session in db_manager.get_session():
        yield session


def get_payment_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> PaymentApplicationService:
    tx_repo = PaymentTransactionRepository(session)
    wallet_repo = WalletRepository(session)
    kafka_bus = getattr(request.app.state, "kafka_bus", None)
    return PaymentApplicationService(
        tx_repository=tx_repo,
        wallet_repository=wallet_repo,
        event_publisher=kafka_bus,
    )


@router.get("/wallet/{user_id}", response_model=WalletResponse)
async def get_user_wallet(
    user_id: str,
    service: PaymentApplicationService = Depends(get_payment_service),
) -> WalletResponse:
    """Get wallet balance and metadata for a user (auto-creates with 500,000 VND if new)."""
    wallet = await service.get_wallet(user_id)
    return WalletResponse.model_validate(wallet)


@router.post("/wallet/topup", response_model=WalletResponse)
async def topup_wallet(
    payload: WalletTopupRequest,
    service: PaymentApplicationService = Depends(get_payment_service),
) -> WalletResponse:
    """Deposit funds into a user's wallet."""
    wallet = await service.topup_wallet(payload)
    return WalletResponse.model_validate(wallet)


@router.post("/wallet/withdraw", response_model=WalletResponse)
async def withdraw_wallet(
    payload: WalletWithdrawRequest,
    service: PaymentApplicationService = Depends(get_payment_service),
) -> WalletResponse:
    """Withdraw funds from a user's wallet."""
    wallet = await service.withdraw_wallet(payload)
    return WalletResponse.model_validate(wallet)


@router.post("/process", response_model=PaymentTransactionResponse)
async def process_payment(
    payload: ProcessPaymentRequest,
    service: PaymentApplicationService = Depends(get_payment_service),
) -> PaymentTransactionResponse:
    """Process a ride or food order payment using the selected strategy (cash, wallet, mock_gateway)."""
    tx = await service.process_payment(payload)
    return PaymentTransactionResponse.model_validate(tx)


@router.post("/{tx_id}/refund", response_model=PaymentTransactionResponse)
async def refund_payment(
    tx_id: str,
    payload: RefundPaymentRequest = RefundPaymentRequest(),
    service: PaymentApplicationService = Depends(get_payment_service),
) -> PaymentTransactionResponse:
    """Refund a settled payment transaction back to the customer's wallet."""
    tx = await service.refund_payment(tx_id, payload)
    return PaymentTransactionResponse.model_validate(tx)


@router.get("/transactions/{user_id}", response_model=List[PaymentTransactionResponse])
async def list_user_transactions(
    user_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    service: PaymentApplicationService = Depends(get_payment_service),
) -> List[PaymentTransactionResponse]:
    """List transaction history for a specific user."""
    txs = await service.list_user_transactions(user_id=user_id, skip=skip, limit=limit)
    return [PaymentTransactionResponse.model_validate(t) for t in txs]


@router.get("/{tx_id}/invoice")
async def get_transaction_invoice(
    tx_id: str,
    service: PaymentApplicationService = Depends(get_payment_service),
) -> Dict[str, Any]:
    """Generate and retrieve a structured electronic invoice with HTML receipt."""
    return await service.get_transaction_invoice(tx_id)
