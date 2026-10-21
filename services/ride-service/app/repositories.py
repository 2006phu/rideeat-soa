"""Ride Repository Implementation inheriting from Generic SqlAlchemyRepository."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ride, RideStatus
from services.common.domain.base_repository import SqlAlchemyRepository


class RideRepository(SqlAlchemyRepository[Ride]):
    """Concrete Repository encapsulating Ride persistence and specialized queries."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session=session, model_cls=Ride)

    async def list_by_customer(self, customer_id: str, skip: int = 0, limit: int = 50) -> List[Ride]:
        """List rides booked by a specific customer ordered by newest first."""
        stmt = (
            select(Ride)
            .where(Ride.customer_id == customer_id)
            .order_by(Ride.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_driver(self, driver_id: str, skip: int = 0, limit: int = 50) -> List[Ride]:
        """List rides assigned to a specific driver ordered by newest first."""
        stmt = (
            select(Ride)
            .where(Ride.driver_id == driver_id)
            .order_by(Ride.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_searching_rides(
        self,
        vehicle_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Ride]:
        """List available rides currently in 'searching' state awaiting a driver."""
        stmt = select(Ride).where(Ride.status == RideStatus.SEARCHING.value)
        if vehicle_type:
            stmt = stmt.where(Ride.vehicle_type == vehicle_type.strip().lower())
        stmt = stmt.order_by(Ride.created_at.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_share_token(self, share_token: str) -> Optional[Ride]:
        """Retrieve a ride by its public safety share token."""
        stmt = select(Ride).where(Ride.share_token == share_token)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
