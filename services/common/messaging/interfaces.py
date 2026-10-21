"""Interfaces and Value Objects for Event-Driven Messaging."""

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict

from pydantic import BaseModel, Field


class DomainEvent(BaseModel):
    """Immutable value object representing a domain event in the SOA event bus."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    source_service: str
    occurred_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: Dict[str, Any] = Field(default_factory=dict)


class IEventPublisher(ABC):
    """Abstract interface for publishing domain events."""

    @abstractmethod
    async def publish(self, event: DomainEvent) -> bool:
        """Publish a domain event to the message broker."""
        raise NotImplementedError


class IEventHandler(ABC):
    """Abstract interface for handling incoming domain events (Polymorphism / Observer)."""

    @property
    @abstractmethod
    def subscribed_topic(self) -> str:
        """Return the Kafka topic name this handler subscribes to."""
        raise NotImplementedError

    @abstractmethod
    async def handle(self, event: DomainEvent) -> None:
        """Process the received domain event."""
        raise NotImplementedError
