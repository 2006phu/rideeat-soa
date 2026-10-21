"""Application Service for Map Service (Strategy, Adapter & Dependency Injection Patterns)."""

import logging
from typing import Dict, List, Optional

from services.common.cache.redis_client import GeoLocation, ICacheProvider, IGeoSpatialProvider
from app.interfaces import IGeocodingProvider, IRoutingProvider
from app.schemas import (
    DriverLocationResponse,
    GeocodeResponse,
    NearbyDriversResponse,
    RouteResponse,
)


class MapApplicationService:
    """Orchestrates geocoding, road routing, and Redis geospatial driver proximity search."""

    GEO_KEY_ALL = "rideeat:geo:drivers:all"
    GEO_KEY_PREFIX = "rideeat:geo:drivers"
    META_KEY_PREFIX = "rideeat:meta:driver"

    def __init__(
        self,
        geocoding_provider: IGeocodingProvider,
        routing_provider: IRoutingProvider,
        geo_provider: IGeoSpatialProvider,
        cache_provider: Optional[ICacheProvider] = None,
    ) -> None:
        self._geocoding_provider = geocoding_provider
        self._routing_provider = routing_provider
        self._geo_provider = geo_provider
        self._cache_provider = cache_provider if isinstance(geo_provider, ICacheProvider) and cache_provider is None else cache_provider
        if self._cache_provider is None and isinstance(geo_provider, ICacheProvider):
            self._cache_provider = geo_provider
        self._driver_vehicles: Dict[str, str] = {}
        self._logger = logging.getLogger(self.__class__.__name__)

    async def geocode(self, address: str) -> GeocodeResponse:
        """Forward geocode an address string via injected IGeocodingProvider."""
        return await self._geocoding_provider.geocode(address)

    async def reverse_geocode(self, lat: float, lng: float) -> GeocodeResponse:
        """Reverse geocode latitude and longitude via injected IGeocodingProvider."""
        return await self._geocoding_provider.reverse_geocode(lat, lng)

    async def calculate_route(
        self,
        pickup_lat: float,
        pickup_lng: float,
        dropoff_lat: float,
        dropoff_lng: float,
    ) -> RouteResponse:
        """Compute driving route distance, duration, and polyline via injected IRoutingProvider."""
        return await self._routing_provider.calculate_route(
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            dropoff_lat=dropoff_lat,
            dropoff_lng=dropoff_lng,
        )

    async def update_driver_location(
        self,
        driver_id: str,
        lat: float,
        lng: float,
        vehicle_type: str = "motorbike",
    ) -> DriverLocationResponse:
        """Index a driver's live coordinates into Redis Geo sets (global & per-vehicle-type)."""
        normalized_vehicle = (vehicle_type or "motorbike").strip().lower()
        await self._geo_provider.geo_add(self.GEO_KEY_ALL, driver_id, lat, lng)
        await self._geo_provider.geo_add(f"{self.GEO_KEY_PREFIX}:{normalized_vehicle}", driver_id, lat, lng)

        self._driver_vehicles[driver_id] = normalized_vehicle
        if self._cache_provider is not None:
            await self._cache_provider.set_json(
                f"{self.META_KEY_PREFIX}:{driver_id}",
                {
                    "driver_id": driver_id,
                    "latitude": lat,
                    "longitude": lng,
                    "vehicle_type": normalized_vehicle,
                },
                ttl_seconds=3600,
            )

        return DriverLocationResponse(
            driver_id=driver_id,
            latitude=round(lat, 6),
            longitude=round(lng, 6),
            vehicle_type=normalized_vehicle,
            distance_km=0.0,
            eta_minutes=1.0,
        )

    async def find_nearby_drivers(
        self,
        lat: float,
        lng: float,
        radius_km: float = 5.0,
        vehicle_type: Optional[str] = None,
        limit: int = 10,
    ) -> NearbyDriversResponse:
        """Find nearby drivers within radius_km using Redis Geo (or Haversine fallback)."""
        normalized_vehicle = vehicle_type.strip().lower() if vehicle_type else None
        geo_key = (
            f"{self.GEO_KEY_PREFIX}:{normalized_vehicle}"
            if normalized_vehicle
            else self.GEO_KEY_ALL
        )

        locations: List[GeoLocation] = await self._geo_provider.geo_search_nearby(
            key=geo_key,
            latitude=lat,
            longitude=lng,
            radius_km=radius_km,
            limit=limit,
        )

        drivers: List[DriverLocationResponse] = []
        for loc in locations:
            resolved_vehicle = normalized_vehicle or self._driver_vehicles.get(loc.member_id)
            if not resolved_vehicle and self._cache_provider is not None:
                meta = await self._cache_provider.get_json(f"{self.META_KEY_PREFIX}:{loc.member_id}")
                if isinstance(meta, dict):
                    resolved_vehicle = meta.get("vehicle_type")
            resolved_vehicle = resolved_vehicle or "motorbike"

            dist_km = round(float(loc.distance_km or 0.0), 3)
            eta_min = round(max((dist_km / 25.0) * 60.0, 1.5), 1)
            drivers.append(
                DriverLocationResponse(
                    driver_id=loc.member_id,
                    latitude=round(loc.latitude, 6),
                    longitude=round(loc.longitude, 6),
                    vehicle_type=resolved_vehicle,
                    distance_km=dist_km,
                    eta_minutes=eta_min,
                )
            )

        return NearbyDriversResponse(
            center_latitude=lat,
            center_longitude=lng,
            radius_km=radius_km,
            vehicle_type=normalized_vehicle,
            count=len(drivers),
            drivers=drivers,
        )

    async def seed_demo_drivers(self) -> List[DriverLocationResponse]:
        """Seed 3 nearby demo drivers in District 1, Ho Chi Minh City into Redis Geo on startup."""
        demo_drivers = [
            {
                "driver_id": "demo-driver-001",
                "lat": 10.7731,
                "lng": 106.6983,
                "vehicle_type": "motorbike",
            },
            {
                "driver_id": "demo-driver-002",
                "lat": 10.7745,
                "lng": 106.7035,
                "vehicle_type": "car4",
            },
            {
                "driver_id": "demo-driver-003",
                "lat": 10.7770,
                "lng": 106.6953,
                "vehicle_type": "car7",
            },
        ]
        seeded: List[DriverLocationResponse] = []
        for d in demo_drivers:
            res = await self.update_driver_location(
                driver_id=d["driver_id"],
                lat=d["lat"],
                lng=d["lng"],
                vehicle_type=d["vehicle_type"],
            )
            seeded.append(res)
        self._logger.info(f"Seeded {len(seeded)} demo drivers in Redis Geo.")
        return seeded
