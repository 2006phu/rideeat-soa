"""Repository for NotificationRecord Persistence (Repository Pattern)."""

from typing import List
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.domain.base_repository import SqlAlchemyRepository
from app.models import NotificationRecord


class NotificationRepository(SqlAlchemyRepository[NotificationRecord]):
    """Concrete repository managing NotificationRecord inbox persistence."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, NotificationRecord)

    async def list_by_recipient(
        self, recipient_id: str, skip: int = 0, limit: int = 50
    ) -> List[NotificationRecord]:
        stmt = (
            select(NotificationRecord)
            .where(NotificationRecord.recipient_id == recipient_id)
            .order_by(desc(NotificationRecord.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
