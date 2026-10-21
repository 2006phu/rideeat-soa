"""FastAPI REST & WebSocket Routes for Ride Service."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import RideRepository
from app.schemas import (
    AcceptRideRequest,
    CancelRideRequest,
    CreateRideRequest,
    RideAISupportRequest,
    RideEstimateRequest,
    RideEstimateResponse,
    RideResponse,
    SharedRideTrackingResponse,
    StartRideRequest,
    UpdateRideLocationRequest,
)
from app.service import RideApplicationService
from services.common.security.firebase_auth import CurrentUser, get_current_user

router = APIRouter(tags=["Rides"])


async def get_db_session(request: Request):
    """Yield an AsyncSession from the app state's DatabaseManager."""
    db_manager = request.app.state.db_manager
    async for session in db_manager.get_session():
        yield session


def get_ride_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> RideApplicationService:
    """Constructor Dependency Injection factory for RideApplicationService."""
    repository = RideRepository(session=session)
    return RideApplicationService(
        repository=repository,
        event_publisher=request.app.state.event_bus,
        map_client=request.app.state.map_client,
        promo_client=request.app.state.promo_client,
        ws_manager=request.app.state.ws_manager,
        ai_assistant=request.app.state.ai_assistant,
    )


@router.post("/api/rides/estimate", response_model=RideEstimateResponse)
async def estimate_ride_fare(
    payload: RideEstimateRequest,
    service: RideApplicationService = Depends(get_ride_service),
) -> RideEstimateResponse:
    """Calculate polymorphic fare estimates across Motorbike, Car 4, and Car 7 strategies."""
    return await service.estimate_fare(payload)


@router.post(
    "/api/rides",
    response_model=RideResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_ride(
    payload: CreateRideRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: RideApplicationService = Depends(get_ride_service),
) -> RideResponse:
    """Create a new ride booking for the authenticated customer."""
    ride = await service.create_ride(customer_id=current_user.uid, req=payload)
    return RideResponse.model_validate(ride)


@router.get("/api/rides", response_model=List[RideResponse])
async def list_my_rides(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: RideApplicationService = Depends(get_ride_service),
) -> List[RideResponse]:
    """List rides for the authenticated user (customer, driver, or admin)."""
    rides = await service.list_rides_for_user(
        user_id=current_user.uid,
        role=current_user.role.value,
        skip=skip,
        limit=limit,
    )
    return [RideResponse.model_validate(r) for r in rides]


@router.get("/api/rides/available", response_model=List[RideResponse])
async def list_available_rides(
    vehicle_type: Optional[str] = Query(default=None),
    service: RideApplicationService = Depends(get_ride_service),
) -> List[RideResponse]:
    """List rides currently in 'searching' state awaiting driver acceptance."""
    rides = await service.list_available_rides(vehicle_type=vehicle_type)
    return [RideResponse.model_validate(r) for r in rides]


@router.get("/api/rides/share/{token}", response_model=SharedRideTrackingResponse)
async def get_shared_ride_status(
    token: str,
    service: RideApplicationService = Depends(get_ride_service),
) -> SharedRideTrackingResponse:
    """Public endpoint allowing friends/family to view live ride progress via share_token."""
    ride = await service.get_ride_by_share_token(token)
    return SharedRideTrackingResponse(
        ride_id=ride.id,
        status=ride.status,
        vehicle_type=ride.vehicle_type,
        driver_id=ride.driver_id,
        pickup_address=ride.pickup_address,
        pickup_lat=ride.pickup_lat,
        pickup_lng=ride.pickup_lng,
        dropoff_address=ride.dropoff_address,
        dropoff_lat=ride.dropoff_lat,
        dropoff_lng=ride.dropoff_lng,
        current_lat=ride.current_lat,
        current_lng=ride.current_lng,
        distance_km=ride.distance_km,
        duration_minutes=ride.duration_minutes,
        updated_at=ride.updated_at,
    )


@router.post("/api/rides/ai-support")
async def ask_ride_ai_support(
    payload: RideAISupportRequest,
    service: RideApplicationService = Depends(get_ride_service),
) -> Dict[str, Any]:
    """AI-powered ride support and fare advisory endpoint."""
    return await service.ask_ai_support(
        question=payload.question,
        distance_km=payload.distance_km,
        duration_minutes=payload.duration_minutes,
        surge_multiplier=payload.surge_multiplier,
    )


@router.get("/api/rides/{ride_id}", response_model=RideResponse)
async def get_ride_by_id(
    ride_id: str,
    service: RideApplicationService = Depends(get_ride_service),
) -> RideResponse:
    """Retrieve details of a specific ride by ID."""
    ride = await service.get_ride(ride_id)
    return RideResponse.model_validate(ride)


@router.post("/api/rides/{ride_id}/accept", response_model=RideResponse)
async def accept_ride(
    ride_id: str,
    payload: Optional[AcceptRideRequest] = None,
    current_user: CurrentUser = Depends(get_current_user),
    service: RideApplicationService = Depends(get_ride_service),
) -> RideResponse:
    """Driver accepts an available ride."""
    driver_id = (payload.driver_id if payload and payload.driver_id else None) or current_user.uid
    ride = await service.accept_ride(ride_id=ride_id, driver_id=driver_id)
    return RideResponse.model_validate(ride)


@router.post("/api/rides/{ride_id}/start", response_model=RideResponse)
async def start_ride(
    ride_id: str,
    payload: Optional[StartRideRequest] = None,
    service: RideApplicationService = Depends(get_ride_service),
) -> RideResponse:
    """Start an accepted ride after verifying OTP or QR code."""
    otp_code = payload.otp_code if payload else None
    ride = await service.start_ride(ride_id=ride_id, otp_code=otp_code)
    return RideResponse.model_validate(ride)


@router.post("/api/rides/{ride_id}/location")
async def update_ride_location(
    ride_id: str,
    payload: UpdateRideLocationRequest,
    service: RideApplicationService = Depends(get_ride_service),
) -> Dict[str, Any]:
    """Update live GPS location of a ride and broadcast over WebSocket."""
    return await service.update_ride_location(
        ride_id=ride_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        heading=payload.heading,
        speed_kmh=payload.speed_kmh,
    )


@router.post("/api/rides/{ride_id}/complete", response_model=RideResponse)
async def complete_ride(
    ride_id: str,
    service: RideApplicationService = Depends(get_ride_service),
) -> RideResponse:
    """Mark an in-progress ride as completed and emit Kafka 'ride.completed' event."""
    ride = await service.complete_ride(ride_id=ride_id)
    return RideResponse.model_validate(ride)


@router.post("/api/rides/{ride_id}/cancel", response_model=RideResponse)
async def cancel_ride(
    ride_id: str,
    payload: Optional[CancelRideRequest] = None,
    service: RideApplicationService = Depends(get_ride_service),
) -> RideResponse:
    """Cancel a searching or accepted ride."""
    reason = payload.reason if payload else "Cancelled by user"
    ride = await service.cancel_ride(ride_id=ride_id, reason=reason)
    return RideResponse.model_validate(ride)


@router.websocket("/ws/rides/{ride_id}")
async def ride_tracking_websocket(websocket: WebSocket, ride_id: str) -> None:
    """Real-time WebSocket endpoint for streaming GPS updates and ride status events."""
    ws_manager = websocket.app.state.ws_manager
    await ws_manager.connect(ride_id, websocket)
    try:
        await websocket.send_json(
            {
                "event": "ws.connected",
                "ride_id": ride_id,
                "active_subscribers": ws_manager.get_room_size(ride_id),
            }
        )
        while True:
            data = await websocket.receive_json()
            if isinstance(data, dict) and "latitude" in data and "longitude" in data:
                await ws_manager.broadcast_to_ride(
                    ride_id=ride_id,
                    payload={
                        "event": "ride.location_updated",
                        "ride_id": ride_id,
                        "latitude": data["latitude"],
                        "longitude": data["longitude"],
                        "heading": data.get("heading"),
                        "speed_kmh": data.get("speed_kmh"),
                    },
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(ride_id, websocket)
    except Exception:
        ws_manager.disconnect(ride_id, websocket)
