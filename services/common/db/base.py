"""OOP Database Manager and Base ORM Entity Classes."""

import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict

from sqlalchemy import DateTime, String
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BaseORMModel(DeclarativeBase):
    """Abstract base declarative model for all SQLAlchemy entities."""

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize ORM entity attributes to dictionary."""
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}


class TimestampMixin:
    """Mixin encapsulating creation and modification timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )


class DatabaseManager:
    """Encapsulates async SQLAlchemy engine and session lifecycle management."""

    def __init__(self, database_url: str, echo: bool = False) -> None:
        self._database_url = database_url
        connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
        self._engine: AsyncEngine = create_async_engine(
            database_url,
            echo=echo,
            future=True,
            connect_args=connect_args,
        )
        self._session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

    @property
    def engine(self) -> AsyncEngine:
        return self._engine

    async def create_tables(self) -> None:
        """Create all registered ORM tables if they do not exist."""
        async with self._engine.begin() as conn:
            await conn.run_sync(BaseORMModel.metadata.create_all)

    async def dispose(self) -> None:
        """Dispose database engine connection pool."""
        await self._engine.dispose()

    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """FastAPI dependency generator yielding an AsyncSession."""
        async with self._session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
