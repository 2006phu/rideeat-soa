"""Pydantic Request & Response Schemas for Notification Service."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class SendNotificationRequest(BaseModel):
    recipient_id: str = Field(..., description="Target user ID")
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification message body")
    channel: str = Field(default="all", description="all | fcm | websocket | email")
    event_topic: Optional[str] = Field(default="manual.notification")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    title: str
    body: str
    channel: str
    event_topic: Optional[str] = None
    is_read: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
