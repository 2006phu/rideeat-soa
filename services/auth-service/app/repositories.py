"""Repository Layer for Auth Service (Inheritance from SqlAlchemyRepository)."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.domain.base_repository import SqlAlchemyRepository
from app.models import UserAccount


class UserAccountRepository(SqlAlchemyRepository[UserAccount]):
    """Concrete repository encapsulating persistence queries for UserAccount entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, UserAccount)

    async def get_by_email(self, email: str) -> Optional[UserAccount]:
        """Find a user account by normalized email address."""
        normalized_email = email.strip().lower()
        stmt = select(UserAccount).where(UserAccount.email == normalized_email)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> Optional[UserAccount]:
        """Find a user account by phone number."""
        normalized_phone = phone.strip()
        stmt = select(UserAccount).where(UserAccount.phone == normalized_phone)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_firebase_uid(self, firebase_uid: str) -> Optional[UserAccount]:
        """Find a user account by Firebase UID."""
        stmt = select(UserAccount).where(UserAccount.firebase_uid == firebase_uid)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_role(
        self,
        role: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[UserAccount]:
        """List user accounts filtered optionally by role."""
        stmt = select(UserAccount)
        if role:
            stmt = stmt.where(UserAccount.role == role.strip().lower())
        stmt = stmt.order_by(UserAccount.created_at.desc()).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
