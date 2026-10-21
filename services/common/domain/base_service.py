"""Base Application Service encapsulating common business orchestration."""

import logging
from typing import Any, Dict, Generic, Optional, TypeVar

from services.common.domain.interfaces import IRepository
from services.common.messaging.interfaces import DomainEvent, IEventPublisher

RepoType = TypeVar("RepoType", bound=IRepository[Any, Any])


class BaseApplicationService(Generic[RepoType]):
    """Abstract base class for domain/application services (Inheritance & Encapsulation)."""

    def __init__(
        self,
        repository: RepoType,
        event_publisher: Optional[IEventPublisher] = None,
    ) -> None:
        self._repository = repository
        self._event_publisher = event_publisher
        self._logger = logging.getLogger(self.__class__.__name__)

    @property
    def repository(self) -> RepoType:
        return self._repository

    @property
    def logger(self) -> logging.Logger:
        return self._logger

    async def publish_domain_event(
        self,
        topic: str,
        payload: Dict[str, Any],
        source_service: str = "rideeat-service",
    ) -> None:
        """Publish an asynchronous domain event to Kafka if an event publisher is configured."""
        if self._event_publisher is None:
            self._logger.debug(f"No event publisher configured; skipping topic '{topic}'")
            return
        event = DomainEvent(
            topic=topic,
            source_service=source_service,
            payload=payload,
        )
        await self._event_publisher.publish(event)
