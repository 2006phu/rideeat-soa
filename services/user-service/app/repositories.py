"""Repositories for User Service (UserProfile, SavedAddress, DriverProfile)."""

from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.domain.base_repository import SqlAlchemyRepository
from app.models import DriverProfile, SavedAddress, UserProfile


class UserProfileRepository(SqlAlchemyRepository[UserProfile]):
    """Concrete repository for UserProfile entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, UserProfile)

    async def get_by_user_id(self, user_id: str) -> Optional[UserProfile]:
        """Retrieve a UserProfile by its linked Auth user_id."""
        stmt = select(UserProfile).where(UserProfile.user_id == str(user_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class AddressRepository(SqlAlchemyRepository[SavedAddress]):
    """Concrete repository for SavedAddress entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SavedAddress)

    async def list_by_user_id(self, user_id: str) -> List[SavedAddress]:
        """List all saved addresses belonging to a user_id."""
        stmt = (
            select(SavedAddress)
            .where(SavedAddress.user_id == str(user_id))
            .order_by(SavedAddress.is_default.desc(), SavedAddress.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def clear_default_for_user(self, user_id: str) -> None:
        """Unset is_default on existing saved addresses for a user."""
        stmt = (
            update(SavedAddress)
            .where(SavedAddress.user_id == str(user_id))
            .values(is_default=False)
        )
        await self._session.execute(stmt)
        await self._session.commit()


class DriverProfileRepository(SqlAlchemyRepository[DriverProfile]):
    """Concrete repository for DriverProfile entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DriverProfile)

    async def get_by_user_id(self, user_id: str) -> Optional[DriverProfile]:
        """Retrieve a DriverProfile by its linked Auth user_id."""
        stmt = select(DriverProfile).where(DriverProfile.user_id == str(user_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_or_user_id(self, identifier: str) -> Optional[DriverProfile]:
        """Retrieve a DriverProfile by either its primary key id or its user_id."""
        driver = await self.get_by_id(identifier)
        if driver is None:
            driver = await self.get_by_user_id(identifier)
        return driver

    async def list_drivers(
        self,
        status: Optional[str] = None,
        vehicle_type: Optional[str] = None,
        is_online: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[DriverProfile]:
        """Query driver profiles with optional filters."""
        stmt = select(DriverProfile)
        if status:
            stmt = stmt.where(DriverProfile.status == status.strip().lower())
        if vehicle_type:
            stmt = stmt.where(DriverProfile.vehicle_type == vehicle_type.strip().lower())
        if is_online is not None:
            stmt = stmt.where(DriverProfile.is_online == is_online)
        stmt = stmt.order_by(DriverProfile.created_at.desc()).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
