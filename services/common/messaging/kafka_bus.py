"""Apache Kafka Event Bus Implementation (Strict Real Kafka Mode)."""

import asyncio
import json
import logging
from typing import Dict, List, Optional

from services.common.exceptions import ExternalServiceException
from services.common.messaging.interfaces import DomainEvent, IEventHandler, IEventPublisher

logger = logging.getLogger(__name__)


class KafkaEventBus(IEventPublisher):
    """Strict OOP implementation of Apache Kafka Producer and Consumer Manager using aiokafka.

    Requires a real running Kafka broker (localhost:9092 or kafka:9092). NO silent fallback.
    """

    def __init__(
        self,
        bootstrap_servers: str,
        service_name: str,
        enabled: bool = True,
    ) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._service_name = service_name
        self._enabled = enabled
        self._producer = None
        self._consumer = None
        self._handlers: Dict[str, List[IEventHandler]] = {}
        self._consumer_task: Optional[asyncio.Task] = None
        self._published_history: List[DomainEvent] = []

    @property
    def published_history(self) -> List[DomainEvent]:
        """Return history of published events."""
        return list(self._published_history)

    def register_handler(self, handler: IEventHandler) -> None:
        """Register an OOP IEventHandler for its subscribed topic."""
        topic = handler.subscribed_topic
        if topic not in self._handlers:
            self._handlers[topic] = []
        self._handlers[topic].append(handler)
        logger.info(f"[{self._service_name}] Registered event handler {handler.__class__.__name__} for topic '{topic}'")

    async def start(self) -> None:
        """Connect strictly to real Apache Kafka broker and start consumer loop."""
        if not self._enabled:
            logger.info(f"[{self._service_name}] Real Kafka disabled in settings.")
            return

        from aiokafka import AIOKafkaProducer

        self._producer = AIOKafkaProducer(
            bootstrap_servers=self._bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        try:
            await asyncio.wait_for(self._producer.start(), timeout=8.0)
            logger.info(f"[{self._service_name}] Connected real Kafka Producer to {self._bootstrap_servers}")
        except Exception as exc:
            self._producer = None
            raise ExternalServiceException(
                "kafka",
                f"Failed to connect to real Kafka broker at '{self._bootstrap_servers}': {exc}. Real Kafka container required!"
            ) from exc

        if self._handlers:
            self._consumer_task = asyncio.create_task(self._consume_loop())

    async def stop(self) -> None:
        """Gracefully stop real Kafka producer and consumer."""
        if self._consumer_task and not self._consumer_task.done():
            self._consumer_task.cancel()
        if self._consumer is not None:
            try:
                await self._consumer.stop()
            except Exception:
                pass
        if self._producer is not None:
            try:
                await self._producer.stop()
            except Exception:
                pass

    async def publish(self, event: DomainEvent) -> bool:
        """Publish a DomainEvent strictly to real Kafka topic. Fails if broker is unreachable."""
        if self._producer is None:
            raise ExternalServiceException(
                "kafka",
                f"Kafka producer is not connected. Real Kafka broker at '{self._bootstrap_servers}' is required."
            )

        self._published_history.append(event)
        if len(self._published_history) > 200:
            self._published_history.pop(0)

        try:
            await self._producer.send_and_wait(event.topic, event.model_dump())
            logger.info(f"[{self._service_name}] Published real Kafka event '{event.topic}' (id={event.event_id})")
            return True
        except Exception as exc:
            logger.error(f"[{self._service_name}] Failed to publish to real Kafka: {exc}")
            raise ExternalServiceException(
                "kafka",
                f"Failed to publish event to real Kafka topic '{event.topic}': {exc}"
            ) from exc

    async def _consume_loop(self) -> None:
        """Background task consuming subscribed Kafka topics and dispatching to IEventHandlers."""
        topics = list(self._handlers.keys())
        if not topics:
            return

        from aiokafka import AIOKafkaConsumer

        while True:
            try:
                self._consumer = AIOKafkaConsumer(
                    *topics,
                    bootstrap_servers=self._bootstrap_servers,
                    group_id=f"{self._service_name}-group",
                    value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                    auto_offset_reset="latest",
                )
                await asyncio.wait_for(self._consumer.start(), timeout=8.0)
                logger.info(f"[{self._service_name}] Real Kafka Consumer listening on topics: {topics}")

                async for msg in self._consumer:
                    try:
                        raw = msg.value
                        if isinstance(raw, dict):
                            event = DomainEvent(
                                event_id=raw.get("event_id", "unknown"),
                                topic=msg.topic,
                                source_service=raw.get("source_service", "unknown"),
                                occurred_at=raw.get("occurred_at", ""),
                                payload=raw.get("payload", raw),
                            )
                            for handler in self._handlers.get(msg.topic, []):
                                await handler.handle(event)
                    except Exception as handler_exc:
                        logger.error(f"[{self._service_name}] Error handling real Kafka message on {msg.topic}: {handler_exc}")
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"[{self._service_name}] Real Kafka consumer connection error ({exc}); retrying in 5s...")
                await asyncio.sleep(5)


class InMemoryEventBus(IEventPublisher):
    """Explicit in-memory event bus implementation for standalone unit testing without Kafka."""

    def __init__(self, service_name: str = "test-service") -> None:
        self._service_name = service_name
        self._handlers: Dict[str, List[IEventHandler]] = {}
        self._published_history: List[DomainEvent] = []

    @property
    def published_history(self) -> List[DomainEvent]:
        return list(self._published_history)

    def register_handler(self, handler: IEventHandler) -> None:
        topic = handler.subscribed_topic
        if topic not in self._handlers:
            self._handlers[topic] = []
        self._handlers[topic].append(handler)

    async def publish(self, event: DomainEvent) -> bool:
        self._published_history.append(event)
        for handler in self._handlers.get(event.topic, []):
            await handler.handle(event)
        return True
