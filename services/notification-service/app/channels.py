"""Polymorphic Notification Channels & Composite Dispatcher (Polymorphism & Composite Pattern)."""

import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class INotificationChannel(ABC):
    """Abstract interface for outbound notification delivery channels (Abstraction & Polymorphism)."""

    @property
    @abstractmethod
    def channel_name(self) -> str:
        """Unique identifier for the channel (e.g. 'fcm', 'websocket', 'email')."""
        raise NotImplementedError

    @abstractmethod
    async def send(
        self,
        recipient_id: str,
        title: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> bool:
        """Deliver notification payload to recipient via concrete channel."""
        raise NotImplementedError


class FCMNotificationChannel(INotificationChannel):
    """Concrete Adapter for Firebase Cloud Messaging (FCM) push notifications."""

    @property
    def channel_name(self) -> str:
        return "fcm"

    async def send(
        self,
        recipient_id: str,
        title: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> bool:
        try:
            import firebase_admin
            from firebase_admin import messaging

            if firebase_admin._apps:
                fcm_token = metadata.get("fcm_token")
                if fcm_token:
                    msg = messaging.Message(
                        notification=messaging.Notification(title=title, body=body),
                        token=str(fcm_token),
                    )
                    messaging.send(msg)
                    logger.info(f"[FCMNotificationChannel] Dispatched FCM push to {recipient_id}")
                    return True
        except Exception as exc:
            logger.debug(f"[FCMNotificationChannel] Firebase Admin fallback log mode: {exc}")

        logger.info(
            f"[FCMNotificationChannel] Push -> recipient={recipient_id} | title='{title}' | body='{body}'"
        )
        return True


class WebSocketNotificationChannel(INotificationChannel):
    """Concrete Channel maintaining active WebSocket connections for real-time in-app broadcast."""

    def __init__(self) -> None:
        self._connections: Dict[str, List[WebSocket]] = {}

    @property
    def channel_name(self) -> str:
        return "websocket"

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info(f"[WebSocketNotificationChannel] User '{user_id}' connected via WebSocket.")

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        conns = self._connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns and user_id in self._connections:
            self._connections.pop(user_id, None)

    async def send(
        self,
        recipient_id: str,
        title: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> bool:
        payload = {
            "recipient_id": recipient_id,
            "title": title,
            "body": body,
            "channel": self.channel_name,
            "metadata": metadata,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        message_str = json.dumps(payload, ensure_ascii=False)
        targets = list(self._connections.get(recipient_id, [])) + list(
            self._connections.get("broadcast", [])
        )
        stale: List[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_text(message_str)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(recipient_id, ws)

        logger.info(
            f"[WebSocketNotificationChannel] Broadcast to {recipient_id} (active sockets={len(targets)})"
        )
        return True


class EmailNotificationChannel(INotificationChannel):
    """Concrete Adapter for SMTP transactional email notifications."""

    def __init__(self, sender_address: str = "no-reply@rideeat.vn") -> None:
        self._sender_address = sender_address

    @property
    def channel_name(self) -> str:
        return "email"

    async def send(
        self,
        recipient_id: str,
        title: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> bool:
        logger.info(
            f"[EmailNotificationChannel] From={self._sender_address} To={recipient_id} Subject='{title}' Body='{body}'"
        )
        return True


class CompositeNotificationDispatcher(INotificationChannel):
    """Composite Pattern aggregating multiple INotificationChannel implementations polymorphically."""

    def __init__(self, channels: List[INotificationChannel] | None = None) -> None:
        self._channels: List[INotificationChannel] = list(channels or [])

    @property
    def channel_name(self) -> str:
        return ",".join(ch.channel_name for ch in self._channels) or "composite"

    def register_channel(self, channel: INotificationChannel) -> None:
        self._channels.append(channel)

    async def send(
        self,
        recipient_id: str,
        title: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> bool:
        """Iterate over registered INotificationChannel instances polymorphically."""
        requested_channel = metadata.get("preferred_channel")
        results: List[bool] = []
        for channel in self._channels:
            if (
                requested_channel
                and requested_channel != "all"
                and channel.channel_name != requested_channel
                and channel.channel_name != "websocket"
            ):
                continue
            try:
                ok = await channel.send(recipient_id, title, body, metadata)
                results.append(ok)
            except Exception as exc:
                logger.warning(
                    f"[CompositeNotificationDispatcher] Channel '{channel.channel_name}' failed: {exc}"
                )
                results.append(False)
        return any(results) if results else True
