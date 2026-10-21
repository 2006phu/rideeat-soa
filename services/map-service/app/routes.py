"""FastAPI Routes for Map Service (/api/map/...)."""

from typing import Optional
from fastapi import APIRouter, Body, Depends, Query, Request

from services.common.exceptions import BusinessRuleViolationException
from app.schemas import (
    DriverLocationResponse,
    DriverLocationUpdateRequest,
    GeocodeRequest,
    GeocodeResponse,
    NearbyDriversResponse,
    ReverseGeocodeRequest,
    RouteCalculateRequest,
    RouteResponse,
)
from app.service import MapApplicationService

router = APIRouter(prefix="/api/map", tags=["Map, Geocoding, Routing & Geo Tracking"])


def get_map_service(request: Request) -> MapApplicationService:
    """Retrieve the singleton MapApplicationService instance from app state."""
    return request.app.state.map_service


@router.get("/geocode", response_model=GeocodeResponse)
async def geocode_get(
    address: Optional[str] = Query(default=None, description="Address or landmark query"),
    q: Optional[str] = Query(default=None, description="Alias for address query"),
    service: MapApplicationService = Depends(get_map_service),
) -> GeocodeResponse:
    """Forward geocode an address or landmark name via GET query parameter."""
    resolved = address or q
    if not resolved:
        raise BusinessRuleViolationException("Query parameter 'address' (or 'q') is required.")
    return await service.geocode(resolved)


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_post(
    payload: GeocodeRequest,
    service: MapApplicationService = Depends(get_map_service),
) -> GeocodeResponse:
    """Forward geocode an address or landmark name via POST JSON payload."""
    return await service.geocode(payload.address)


@router.get("/reverse", response_model=GeocodeResponse)
async def reverse_geocode_get(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    service: MapApplicationService = Depends(get_map_service),
) -> GeocodeResponse:
    """Reverse geocode coordinates into a street address via GET query parameters."""
    return await service.reverse_geocode(lat=lat, lng=lng)


@router.post("/reverse", response_model=GeocodeResponse)
async def reverse_geocode_post(
    payload: ReverseGeocodeRequest,
    service: MapApplicationService = Depends(get_map_service),
) -> GeocodeResponse:
    """Reverse geocode coordinates into a street address via POST JSON payload."""
    return await service.reverse_geocode(lat=payload.latitude, lng=payload.longitude)


@router.get("/route", response_model=RouteResponse)
async def calculate_route_get(
    pickup_lat: float = Query(..., ge=-90.0, le=90.0),
    pickup_lng: float = Query(..., ge=-180.0, le=180.0),
    dropoff_lat: float = Query(..., ge=-90.0, le=90.0),
    dropoff_lng: float = Query(..., ge=-180.0, le=180.0),
    service: MapApplicationService = Depends(get_map_service),
) -> RouteResponse:
    """Calculate driving route distance, duration, and polyline via GET query parameters."""
    return await service.calculate_route(
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
        dropoff_lat=dropoff_lat,
        dropoff_lng=dropoff_lng,
    )


@router.post("/route", response_model=RouteResponse)
async def calculate_route_post(
    payload: RouteCalculateRequest,
    service: MapApplicationService = Depends(get_map_service),
) -> RouteResponse:
    """Calculate driving route distance, duration, and polyline via POST JSON payload."""
    return await service.calculate_route(
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        dropoff_lat=payload.dropoff_lat,
        dropoff_lng=payload.dropoff_lng,
    )


@router.post("/drivers/location", response_model=DriverLocationResponse)
@router.put("/drivers/location", response_model=DriverLocationResponse)
async def update_driver_location(
    payload: DriverLocationUpdateRequest = Body(...),
    service: MapApplicationService = Depends(get_map_service),
) -> DriverLocationResponse:
    """Update a driver's live geospatial coordinates in Redis Geo."""
    return await service.update_driver_location(
        driver_id=payload.driver_id,
        lat=payload.latitude,
        lng=payload.longitude,
        vehicle_type=payload.vehicle_type,
    )


@router.get("/drivers/nearby", response_model=NearbyDriversResponse)
async def find_nearby_drivers(
    lat: float = Query(default=10.7725, ge=-90.0, le=90.0),
    lng: float = Query(default=106.6980, ge=-180.0, le=180.0),
    radius_km: float = Query(default=5.0, gt=0.0, le=50.0),
    vehicle_type: Optional[str] = Query(default=None, description="motorbike | car4 | car7"),
    limit: int = Query(default=10, ge=1, le=50),
    service: MapApplicationService = Depends(get_map_service),
) -> NearbyDriversResponse:
    """Search for nearby drivers within radius_km sorted by proximity."""
    return await service.find_nearby_drivers(
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        vehicle_type=vehicle_type,
        limit=limit,
    )
