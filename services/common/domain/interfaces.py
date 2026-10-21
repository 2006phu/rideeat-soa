"""Abstract Base Classes (Interfaces) for Domain & Persistence Layers."""

from abc import ABC, abstractmethod
from typing import Generic, List, Optional, TypeVar

T = TypeVar("T")
ID = TypeVar("ID")


class IRepository(ABC, Generic[T, ID]):
    """Generic Repository Interface (Abstraction & Polymorphism)."""

    @abstractmethod
    async def get_by_id(self, entity_id: ID) -> Optional[T]:
        """Retrieve an entity by its unique identifier."""
        raise NotImplementedError

    @abstractmethod
    async def list_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Retrieve a paginated list of entities."""
        raise NotImplementedError

    @abstractmethod
    async def save(self, entity: T) -> T:
        """Persist a new or updated entity."""
        raise NotImplementedError

    @abstractmethod
    async def delete(self, entity: T) -> None:
        """Remove an entity from persistence."""
        raise NotImplementedError
