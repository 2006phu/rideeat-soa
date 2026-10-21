"""Pydantic Schemas (DTOs & Value Objects) for Map Service."""

from typing import List, Optional
from pydantic import BaseModel, Field


class GeocodeRequest(BaseModel):
    """Payload for forward geocoding an address string."""

    address: str = Field(..., min_length=1)


class ReverseGeocodeRequest(BaseModel):
    """Payload for reverse geocoding latitude and longitude coordinates."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class GeocodeResponse(BaseModel):
    """Standardized geocoding / reverse-geocoding response."""

    query: str
    address: str
    display_name: str
    latitude: float
    longitude: float
    provider: str = "nominatim"


class RouteCalculateRequest(BaseModel):
    """Payload to calculate route distance, duration, and polyline between two coordinates."""

    pickup_lat: float = Field(..., ge=-90.0, le=90.0)
    pickup_lng: float = Field(..., ge=-180.0, le=180.0)
    dropoff_lat: float = Field(..., ge=-90.0, le=90.0)
    dropoff_lng: float = Field(..., ge=-180.0, le=180.0)


class CoordinatePoint(BaseModel):
    """Single latitude/longitude waypoint."""

    latitude: float
    longitude: float


class RouteResponse(BaseModel):
    """Route calculation result with distance, duration, and Leaflet-compatible polyline."""

    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float
    distance_km: float
    duration_minutes: float
    polyline: List[List[float]] = Field(
        default_factory=list,
        description="Array of [lat, lng] pairs for map polyline rendering",
    )
    waypoints: List[CoordinatePoint] = Field(default_factory=list)
    provider: str = "osrm"


class DriverLocationUpdateRequest(BaseModel):
    """Payload to update a driver's live geospatial coordinates."""

    driver_id: str = Field(..., min_length=1)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    vehicle_type: str = Field(default="motorbike", description="motorbike | car4 | car7")


class DriverLocationResponse(BaseModel):
    """Result of updating or querying a driver's geospatial position."""

    driver_id: str
    latitude: float
    longitude: float
    vehicle_type: str = "motorbike"
    distance_km: Optional[float] = None
    eta_minutes: Optional[float] = None


class NearbyDriversResponse(BaseModel):
    """Response listing nearby drivers sorted by proximity."""

    center_latitude: float
    center_longitude: float
    radius_km: float
    vehicle_type: Optional[str] = None
    count: int
    drivers: List[DriverLocationResponse]
