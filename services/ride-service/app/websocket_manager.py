"""OOP WebSocket Room Manager for Real-Time Ride GPS Streaming & Status Broadcasts."""

import logging
from typing import Any, Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class RideTrackingWebSocketManager:
    """Encapsulates active WebSocket connections grouped by ride_id room."""

    def __init__(self) -> None:
        self._rooms: Dict[str, List[WebSocket]] = {}

    def get_room_size(self, ride_id: str) -> int:
        """Return number of connected clients in a ride tracking room."""
        return len(self._rooms.get(ride_id, []))

    async def connect(self, ride_id: str, websocket: WebSocket) -> None:
        """Accept incoming WebSocket connection and register in the ride room."""
        await websocket.accept()
        if ride_id not in self._rooms:
            self._rooms[ride_id] = []
        self._rooms[ride_id].append(websocket)
        logger.info(f"Client connected to ride WebSocket room '{ride_id}' (total={len(self._rooms[ride_id])})")

    def disconnect(self, ride_id: str, websocket: WebSocket) -> None:
        """Remove a closed WebSocket connection from the ride room."""
        if ride_id in self._rooms:
            if websocket in self._rooms[ride_id]:
                self._rooms[ride_id].remove(websocket)
            if not self._rooms[ride_id]:
                self._rooms.pop(ride_id, None)
        logger.info(f"Client disconnected from ride WebSocket room '{ride_id}'")

    async def broadcast_to_ride(self, ride_id: str, payload: Dict[str, Any]) -> int:
        """Broadcast a JSON message to all clients subscribed to a ride_id."""
        connections = list(self._rooms.get(ride_id, []))
        delivered = 0
        stale: List[WebSocket] = []
        for ws in connections:
            try:
                await ws.send_json(payload)
                delivered += 1
            except Exception as exc:
                logger.debug(f"WebSocket send failed for ride '{ride_id}': {exc}")
                stale.append(ws)

        for ws in stale:
            self.disconnect(ride_id, ws)
        return delivered
