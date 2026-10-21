"""Repositories for Wallet and PaymentTransaction Persistence (Repository Pattern & Inheritance)."""

from typing import List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.domain.base_repository import SqlAlchemyRepository
from app.models import PaymentTransaction, Wallet


class WalletRepository(SqlAlchemyRepository[Wallet]):
    """Concrete repository managing Wallet persistence."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Wallet)

    async def get_by_user_id(self, user_id: str) -> Optional[Wallet]:
        stmt = select(Wallet).where(Wallet.user_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create_wallet(
        self, user_id: str, initial_balance: float = 500_000.0
    ) -> Wallet:
        """Fetch user's wallet or provision a new wallet with initial balance."""
        wallet = await self.get_by_user_id(user_id)
        if wallet is None:
            wallet = Wallet(
                user_id=user_id,
                balance=initial_balance,
                currency="VND",
            )
            wallet = await self.save(wallet)
        return wallet


class PaymentTransactionRepository(SqlAlchemyRepository[PaymentTransaction]):
    """Concrete repository managing PaymentTransaction ledger records."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PaymentTransaction)

    async def list_by_user(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[PaymentTransaction]:
        stmt = (
            select(PaymentTransaction)
            .where(PaymentTransaction.user_id == user_id)
            .order_by(desc(PaymentTransaction.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_reference(
        self, reference_id: str, reference_type: Optional[str] = None
    ) -> Optional[PaymentTransaction]:
        stmt = select(PaymentTransaction).where(
            PaymentTransaction.reference_id == reference_id
        )
        if reference_type:
            stmt = stmt.where(PaymentTransaction.reference_type == reference_type)
        stmt = stmt.order_by(desc(PaymentTransaction.created_at))
        result = await self._session.execute(stmt)
        return result.scalars().first()
