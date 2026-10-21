"""Generic SQLAlchemy Repository Implementation (Inheritance & Generics)."""

from typing import Any, Generic, List, Optional, Type, TypeVar
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.common.db.base import BaseORMModel
from services.common.domain.interfaces import IRepository
from services.common.exceptions import EntityNotFoundException

ModelType = TypeVar("ModelType", bound=BaseORMModel)


class SqlAlchemyRepository(IRepository[ModelType, str], Generic[ModelType]):
    """Concrete generic repository providing reusable CRUD operations for ORM entities."""

    def __init__(self, session: AsyncSession, model_cls: Type[ModelType]) -> None:
        self._session = session
        self._model_cls = model_cls

    @property
    def session(self) -> AsyncSession:
        return self._session

    async def get_by_id(self, entity_id: str) -> Optional[ModelType]:
        stmt = select(self._model_cls).where(self._model_cls.id == str(entity_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_or_raise(self, entity_id: str) -> ModelType:
        entity = await self.get_by_id(entity_id)
        if entity is None:
            raise EntityNotFoundException(self._model_cls.__name__, entity_id)
        return entity

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        stmt = select(self._model_cls).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_all(self) -> int:
        stmt = select(func.count()).select_from(self._model_cls)
        result = await self._session.execute(stmt)
        return int(result.scalar_one() or 0)

    async def save(self, entity: ModelType) -> ModelType:
        self._session.add(entity)
        await self._session.commit()
        await self._session.refresh(entity)
        return entity

    async def update_fields(self, entity: ModelType, **kwargs: Any) -> ModelType:
        for key, value in kwargs.items():
            if hasattr(entity, key) and value is not None:
                setattr(entity, key, value)
        return await self.save(entity)

    async def delete(self, entity: ModelType) -> None:
        await self._session.delete(entity)
        await self._session.commit()
