"""Apache Kafka Event Bus Implementation with Resilient Fallback."""

import asyncio
import json
import logging
from typing import Dict, List, Optional

from services.common.messaging.interfaces import DomainEvent, IEventHandler, IEventPublisher

logger = logging.getLogger(__name__)


class KafkaEventBus(IEventPublisher):
    """OOP implementation of Kafka Producer and Consumer Manager using aiokafka."""

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
        """Return in-memory history of published events (useful for diagnostics & testing)."""
        return list(self._published_history)

    def register_handler(self, handler: IEventHandler) -> None:
        """Register an OOP IEventHandler for its subscribed topic."""
        topic = handler.subscribed_topic
        if topic not in self._handlers:
            self._handlers[topic] = []
        self._handlers[topic].append(handler)
        logger.info(f"[{self._service_name}] Registered event handler {handler.__class__.__name__} for topic '{topic}'")

    async def start(self) -> None:
        """Initialize Kafka producer and start background consumer loop if handlers exist."""
        if not self._enabled:
            logger.info(f"[{self._service_name}] Kafka is disabled; operating in local memory event mode.")
            return

        try:
            from aiokafka import AIOKafkaProducer

            self._producer = AIOKafkaProducer(
                bootstrap_servers=self._bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            )
            await asyncio.wait_for(self._producer.start(), timeout=4.0)
            logger.info(f"[{self._service_name}] Connected Kafka Producer to {self._bootstrap_servers}")
        except Exception as exc:
            logger.warning(f"[{self._service_name}] Kafka Producer unavailable ({exc}); falling back to non-blocking log mode.")
            self._producer = None

        if self._handlers:
            self._consumer_task = asyncio.create_task(self._consume_loop())

    async def stop(self) -> None:
        """Gracefully stop Kafka producer and consumer."""
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
        """Publish a DomainEvent to Kafka or record in local log if broker is unreachable."""
        self._published_history.append(event)
        if len(self._published_history) > 200:
            self._published_history.pop(0)

        # Also dispatch to any in-process handlers registered on the same bus
        if event.topic in self._handlers and self._producer is None:
            for handler in self._handlers[event.topic]:
                try:
                    await handler.handle(event)
                except Exception as exc:
                    logger.error(f"Local handler error on topic {event.topic}: {exc}")

        if self._producer is None:
            logger.info(f"[{self._service_name}] (Local Event Bus) Published '{event.topic}': {event.model_dump()}")
            return True

        try:
            await self._producer.send_and_wait(event.topic, event.model_dump())
            logger.info(f"[{self._service_name}] Published Kafka event '{event.topic}' (id={event.event_id})")
            return True
        except Exception as exc:
            logger.warning(f"[{self._service_name}] Failed to publish Kafka event '{event.topic}': {exc}")
            return False

    async def _consume_loop(self) -> None:
        """Background task consuming subscribed Kafka topics and dispatching to IEventHandlers."""
        topics = list(self._handlers.keys())
        if not topics:
            return

        while True:
            try:
                from aiokafka import AIOKafkaConsumer

                self._consumer = AIOKafkaConsumer(
                    *topics,
                    bootstrap_servers=self._bootstrap_servers,
                    group_id=f"{self._service_name}-group",
                    value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                    auto_offset_reset="latest",
                )
                await asyncio.wait_for(self._consumer.start(), timeout=5.0)
                logger.info(f"[{self._service_name}] Kafka Consumer listening on topics: {topics}")

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
                        logger.error(f"[{self._service_name}] Error handling Kafka message on {msg.topic}: {handler_exc}")
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.debug(f"[{self._service_name}] Kafka consumer retry in 10s ({exc})")
                await asyncio.sleep(10)
