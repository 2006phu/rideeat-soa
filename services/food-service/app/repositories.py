"""Food Service Repositories inheriting from Generic SqlAlchemyRepository."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FoodOrder, MenuItem, Restaurant
from services.common.domain.base_repository import SqlAlchemyRepository


class RestaurantRepository(SqlAlchemyRepository[Restaurant]):
    """Concrete Repository encapsulating Restaurant persistence and filtering."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session=session, model_cls=Restaurant)

    async def list_restaurants(
        self,
        category: Optional[str] = None,
        only_open: bool = False,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Restaurant]:
        stmt = select(Restaurant)
        if category:
            stmt = stmt.where(Restaurant.category.ilike(f"%{category.strip()}%"))
        if only_open:
            stmt = stmt.where(Restaurant.is_open.is_(True))
        if search:
            stmt = stmt.where(Restaurant.name.ilike(f"%{search.strip()}%"))
        stmt = stmt.order_by(Restaurant.rating.desc()).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class MenuItemRepository(SqlAlchemyRepository[MenuItem]):
    """Concrete Repository encapsulating MenuItem persistence and restaurant menu queries."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session=session, model_cls=MenuItem)

    async def list_by_restaurant(
        self,
        restaurant_id: str,
        only_available: bool = False,
    ) -> List[MenuItem]:
        stmt = select(MenuItem).where(MenuItem.restaurant_id == restaurant_id)
        if only_available:
            stmt = stmt.where(MenuItem.is_available.is_(True))
        stmt = stmt.order_by(MenuItem.category.asc(), MenuItem.price.asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class FoodOrderRepository(SqlAlchemyRepository[FoodOrder]):
    """Concrete Repository encapsulating FoodOrder persistence and role-based queries."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session=session, model_cls=FoodOrder)

    async def list_by_customer(self, customer_id: str, skip: int = 0, limit: int = 50) -> List[FoodOrder]:
        stmt = (
            select(FoodOrder)
            .where(FoodOrder.customer_id == customer_id)
            .order_by(FoodOrder.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_restaurant(self, restaurant_id: str, skip: int = 0, limit: int = 50) -> List[FoodOrder]:
        stmt = (
            select(FoodOrder)
            .where(FoodOrder.restaurant_id == restaurant_id)
            .order_by(FoodOrder.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_driver(self, driver_id: str, skip: int = 0, limit: int = 50) -> List[FoodOrder]:
        stmt = (
            select(FoodOrder)
            .where(FoodOrder.driver_id == driver_id)
            .order_by(FoodOrder.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
