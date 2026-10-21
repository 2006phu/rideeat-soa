"""FastAPI REST & WebSocket Routes for Notification Service."""

from typing import List
from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import NotificationRepository
from app.schemas import NotificationResponse, SendNotificationRequest
from app.service import NotificationApplicationService

router = APIRouter(tags=["Notifications"])


async def get_db_session(request: Request):
    db_manager = request.app.state.db_manager
    async for session in db_manager.get_session():
        yield session


def get_notification_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> NotificationApplicationService:
    repo = NotificationRepository(session)
    dispatcher = request.app.state.dispatcher
    kafka_bus = getattr(request.app.state, "kafka_bus", None)
    return NotificationApplicationService(
        repository=repo,
        dispatcher=dispatcher,
        event_publisher=kafka_bus,
    )


@router.post(
    "/api/notifications/send",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_notification(
    payload: SendNotificationRequest,
    service: NotificationApplicationService = Depends(get_notification_service),
) -> NotificationResponse:
    """Send a notification across FCM, WebSocket, and Email channels and persist it."""
    record = await service.send_notification(payload)
    return NotificationResponse.model_validate(record)


@router.get(
    "/api/notifications/user/{user_id}",
    response_model=List[NotificationResponse],
)
async def list_user_notifications(
    user_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    service: NotificationApplicationService = Depends(get_notification_service),
) -> List[NotificationResponse]:
    """Retrieve notification inbox for a specific user."""
    records = await service.list_user_notifications(
        user_id=user_id, skip=skip, limit=limit
    )
    return [NotificationResponse.model_validate(r) for r in records]


@router.patch(
    "/api/notifications/{notification_id}/read",
    response_model=NotificationResponse,
)
@router.post(
    "/api/notifications/{notification_id}/read",
    response_model=NotificationResponse,
)
async def mark_notification_as_read(
    notification_id: str,
    service: NotificationApplicationService = Depends(get_notification_service),
) -> NotificationResponse:
    """Mark a notification record as read."""
    record = await service.mark_notification_read(notification_id)
    return NotificationResponse.model_validate(record)


@router.websocket("/ws/notifications/{user_id}")
async def websocket_notifications_endpoint(websocket: WebSocket, user_id: str) -> None:
    """Real-time WebSocket stream pushing live notifications to connected client."""
    ws_channel = websocket.app.state.ws_channel
    await ws_channel.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_channel.disconnect(user_id, websocket)
    except Exception:
        ws_channel.disconnect(user_id, websocket)
