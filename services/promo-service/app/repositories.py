"""Repositories for Voucher and LoyaltyAccount Persistence (Repository Pattern)."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.domain.base_repository import SqlAlchemyRepository
from app.models import LoyaltyAccount, LoyaltyTier, Voucher


class VoucherRepository(SqlAlchemyRepository[Voucher]):
    """Concrete repository managing Voucher entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Voucher)

    async def get_by_code(self, code: str) -> Optional[Voucher]:
        normalized = code.upper().strip()
        stmt = select(Voucher).where(Voucher.code == normalized)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active_vouchers(self) -> List[Voucher]:
        stmt = select(Voucher).where(Voucher.is_active.is_(True)).order_by(Voucher.created_at)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class LoyaltyAccountRepository(SqlAlchemyRepository[LoyaltyAccount]):
    """Concrete repository managing customer LoyaltyAccount entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, LoyaltyAccount)

    async def get_by_user_id(self, user_id: str) -> Optional[LoyaltyAccount]:
        stmt = select(LoyaltyAccount).where(LoyaltyAccount.user_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create(self, user_id: str, initial_points: int = 25) -> LoyaltyAccount:
        account = await self.get_by_user_id(user_id)
        if account is None:
            account = LoyaltyAccount(
                user_id=user_id,
                points=initial_points,
                tier=LoyaltyTier.BRONZE.value,
            )
            account = await self.save(account)
        return account
