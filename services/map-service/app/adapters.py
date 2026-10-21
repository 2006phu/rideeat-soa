"""Concrete Adapters for OpenStreetMap Nominatim & OSRM with Resilient Fallbacks."""

import logging
from typing import Dict, List, Tuple
import httpx

from services.common.cache.redis_client import RedisManager
from app.interfaces import IGeocodingProvider, IRoutingProvider
from app.schemas import CoordinatePoint, GeocodeResponse, RouteResponse

logger = logging.getLogger(__name__)

# Built-in Ho Chi Minh City & Hanoi landmarks dictionary for instant/offline fallback
VIETNAM_LANDMARKS: Dict[str, Tuple[float, float, str]] = {
    "ben thanh": (10.7725, 106.6980, "Cho Ben Thanh, Le Loi, Quan 1, TP. Ho Chi Minh"),
    "cho ben thanh": (10.7725, 106.6980, "Cho Ben Thanh, Le Loi, Quan 1, TP. Ho Chi Minh"),
    "nguyen hue": (10.7744, 106.7036, "Pho Di Bo Nguyen Hue, Quan 1, TP. Ho Chi Minh"),
    "dinh doc lap": (10.7769, 106.6953, "Dinh Doc Lap, 135 Nam Ky Khoi Nghia, Quan 1, TP. Ho Chi Minh"),
    "independence palace": (10.7769, 106.6953, "Dinh Doc Lap, Quan 1, TP. Ho Chi Minh"),
    "nha tho duc ba": (10.7798, 106.6990, "Nha Tho Duc Ba Sai Gon, Cong Xa Paris, Quan 1, TP. Ho Chi Minh"),
    "notre dame": (10.7798, 106.6990, "Nha Tho Duc Ba Sai Gon, Quan 1, TP. Ho Chi Minh"),
    "landmark 81": (10.7950, 106.7218, "Vinhomes Central Park Landmark 81, Binh Thanh, TP. Ho Chi Minh"),
    "bitexco": (10.7717, 106.7044, "Bitexco Financial Tower, 2 Hai Trieu, Quan 1, TP. Ho Chi Minh"),
    "tan son nhat": (10.8185, 106.6588, "San Bay Quoc Te Tan Son Nhat, Tan Binh, TP. Ho Chi Minh"),
    "airport": (10.8185, 106.6588, "San Bay Quoc Te Tan Son Nhat, Tan Binh, TP. Ho Chi Minh"),
    "thao dien": (10.8032, 106.7339, "Thao Dien, TP. Thu Duc, TP. Ho Chi Minh"),
    "thu duc": (10.8494, 106.7537, "Thanh Pho Thu Duc, TP. Ho Chi Minh"),
    "phu my hung": (10.7295, 106.7218, "Khu Do Thi Phu My Hung, Quan 7, TP. Ho Chi Minh"),
    "quan 1": (10.7756, 106.7004, "Trung Tam Quan 1, TP. Ho Chi Minh"),
    "quan 3": (10.7844, 106.6844, "Quan 3, TP. Ho Chi Minh"),
    "quan 5": (10.7540, 106.6634, "Cho Lon, Quan 5, TP. Ho Chi Minh"),
    "quan 7": (10.7340, 106.7216, "Quan 7, TP. Ho Chi Minh"),
    "binh thanh": (10.8106, 106.7091, "Quan Binh Thanh, TP. Ho Chi Minh"),
    "ho guom": (21.0285, 105.8542, "Ho Hoan Kiem, Quan Hoan Kiem, Ha Noi"),
    "hoan kiem": (21.0285, 105.8542, "Ho Hoan Kiem, Quan Hoan Kiem, Ha Noi"),
    "lang bac": (21.0368, 105.8347, "Lang Chu Tich Ho Chi Minh, Ba Dinh, Ha Noi"),
    "ba dinh": (21.0341, 105.8372, "Quan Ba Dinh, Ha Noi"),
    "west lake": (21.0583, 105.8232, "Ho Tay, Quan Tay Ho, Ha Noi"),
    "ho tay": (21.0583, 105.8232, "Ho Tay, Quan Tay Ho, Ha Noi"),
    "noi bai": (21.2187, 105.8042, "San Bay Quoc Te Noi Bai, Soc Son, Ha Noi"),
    "cau giay": (21.0362, 105.7906, "Quan Cau Giay, Ha Noi"),
}


class NominatimGeocodingAdapter(IGeocodingProvider):
    """Adapter for OpenStreetMap Nominatim API with built-in HCMC & Hanoi landmark fallback."""

    def __init__(
        self,
        base_url: str = "https://nominatim.openstreetmap.org",
        timeout: float = 3.5,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._headers = {
            "User-Agent": "RideEat-SOA-MapService/1.0 (contact@rideeat.vn)",
            "Accept-Language": "vi,en",
        }

    async def geocode(self, address: str) -> GeocodeResponse:
        """Forward geocode an address using Nominatim /search or fallback to Vietnam landmarks."""
        cleaned = address.strip()
        lower_q = cleaned.lower()

        # Check exact/substring match in landmark dictionary first if offline or fast-path
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers) as client:
                resp = await client.get(
                    f"{self._base_url}/search",
                    params={"q": cleaned, "format": "json", "limit": 1, "countrycodes": "vn"},
                )
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    top = data[0]
                    display_name = str(top.get("display_name", cleaned))
                    return GeocodeResponse(
                        query=cleaned,
                        address=display_name,
                        display_name=display_name,
                        latitude=round(float(top["lat"]), 6),
                        longitude=round(float(top["lon"]), 6),
                        provider="nominatim",
                    )
        except Exception as exc:
            logger.debug(f"Nominatim /search unavailable or rate-limited ({exc}); using landmark fallback.")

        return self._fallback_geocode(cleaned, lower_q)

    async def reverse_geocode(self, latitude: float, longitude: float) -> GeocodeResponse:
        """Reverse geocode coordinates using Nominatim /reverse or nearest Vietnam landmark."""
        query_str = f"{latitude:.6f},{longitude:.6f}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers) as client:
                resp = await client.get(
                    f"{self._base_url}/reverse",
                    params={"lat": latitude, "lon": longitude, "format": "json"},
                )
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, dict) and data.get("display_name"):
                    display_name = str(data["display_name"])
                    return GeocodeResponse(
                        query=query_str,
                        address=display_name,
                        display_name=display_name,
                        latitude=round(latitude, 6),
                        longitude=round(longitude, 6),
                        provider="nominatim",
                    )
        except Exception as exc:
            logger.debug(f"Nominatim /reverse unavailable ({exc}); using nearest landmark fallback.")

        return self._fallback_reverse_geocode(latitude, longitude, query_str)

    def _fallback_geocode(self, original_query: str, lower_q: str) -> GeocodeResponse:
        for key, (lat, lng, full_addr) in VIETNAM_LANDMARKS.items():
            if key in lower_q or lower_q in key:
                return GeocodeResponse(
                    query=original_query,
                    address=full_addr,
                    display_name=full_addr,
                    latitude=lat,
                    longitude=lng,
                    provider="landmark_fallback",
                )

        # Deterministic coordinate offset around District 1, HCMC if unknown query
        offset_seed = sum(ord(ch) for ch in lower_q) % 100
        lat = round(10.7725 + (offset_seed - 50) * 0.0004, 6)
        lng = round(106.6980 + ((offset_seed * 7) % 100 - 50) * 0.0004, 6)
        display = f"{original_query}, Quan 1, TP. Ho Chi Minh"
        return GeocodeResponse(
            query=original_query,
            address=display,
            display_name=display,
            latitude=lat,
            longitude=lng,
            provider="landmark_fallback",
        )

    def _fallback_reverse_geocode(self, latitude: float, longitude: float, query_str: str) -> GeocodeResponse:
        nearest_addr = "Trung Tam Quan 1, TP. Ho Chi Minh"
        min_dist = float("inf")
        for _key, (lat, lng, full_addr) in VIETNAM_LANDMARKS.items():
            dist = RedisManager.haversine_km(latitude, longitude, lat, lng)
            if dist < min_dist:
                min_dist = dist
                nearest_addr = full_addr

        resolved = (
            nearest_addr
            if min_dist <= 3.0
            else f"Near {nearest_addr} ({latitude:.4f}, {longitude:.4f})"
        )
        return GeocodeResponse(
            query=query_str,
            address=resolved,
            display_name=resolved,
            latitude=round(latitude, 6),
            longitude=round(longitude, 6),
            provider="landmark_fallback",
        )


class OSRMRoutingAdapter(IRoutingProvider):
    """Adapter for OSRM Driving Route API with Haversine + Interpolated Polyline Fallback."""

    def __init__(
        self,
        base_url: str = "https://router.project-osrm.org",
        timeout: float = 3.5,
        average_speed_kmh: float = 28.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._average_speed_kmh = average_speed_kmh

    async def calculate_route(
        self,
        pickup_lat: float,
        pickup_lng: float,
        dropoff_lat: float,
        dropoff_lng: float,
    ) -> RouteResponse:
        """Compute road distance, duration, and polyline via OSRM or Haversine fallback."""
        coords_segment = f"{pickup_lng},{pickup_lat};{dropoff_lng},{dropoff_lat}"
        url = f"{self._base_url}/route/v1/driving/{coords_segment}"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    url,
                    params={"overview": "full", "geometries": "geojson"},
                )
                resp.raise_for_status()
                data = resp.json()
                routes = data.get("routes", [])
                if routes:
                    best = routes[0]
                    dist_km = round(max(float(best.get("distance", 0.0)) / 1000.0, 0.1), 2)
                    dur_min = round(max(float(best.get("duration", 0.0)) / 60.0, 1.0), 1)
                    raw_coords = best.get("geometry", {}).get("coordinates", [])
                    polyline: List[List[float]] = [
                        [round(float(pt[1]), 6), round(float(pt[0]), 6)]
                        for pt in raw_coords
                        if isinstance(pt, (list, tuple)) and len(pt) >= 2
                    ]
                    if not polyline:
                        polyline = self._interpolate_polyline(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
                    waypoints = [CoordinatePoint(latitude=pt[0], longitude=pt[1]) for pt in polyline]
                    return RouteResponse(
                        pickup_lat=pickup_lat,
                        pickup_lng=pickup_lng,
                        dropoff_lat=dropoff_lat,
                        dropoff_lng=dropoff_lng,
                        distance_km=dist_km,
                        duration_minutes=dur_min,
                        polyline=polyline,
                        waypoints=waypoints,
                        provider="osrm",
                    )
        except Exception as exc:
            logger.debug(f"OSRM routing unavailable ({exc}); falling back to Haversine road-factor calculation.")

        # Resilient Fallback: Haversine great-circle distance * 1.25 urban road factor
        straight_km = RedisManager.haversine_km(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
        road_distance_km = round(max(straight_km * 1.25, 0.5), 2)
        duration_minutes = round(max((road_distance_km / self._average_speed_kmh) * 60.0, 2.0), 1)
        polyline = self._interpolate_polyline(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, steps=8)
        waypoints = [CoordinatePoint(latitude=pt[0], longitude=pt[1]) for pt in polyline]

        return RouteResponse(
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            dropoff_lat=dropoff_lat,
            dropoff_lng=dropoff_lng,
            distance_km=road_distance_km,
            duration_minutes=duration_minutes,
            polyline=polyline,
            waypoints=waypoints,
            provider="haversine_fallback",
        )

    @staticmethod
    def _interpolate_polyline(
        lat1: float,
        lng1: float,
        lat2: float,
        lng2: float,
        steps: int = 8,
    ) -> List[List[float]]:
        """Generate smooth interpolated route coordinates between pickup and dropoff."""
        points: List[List[float]] = []
        for i in range(steps + 1):
            t = i / steps
            # Slight urban curve offset in middle segments for realistic map visualization
            curve_offset = 0.0006 * (4 * t * (1 - t))
            lat = round(lat1 + (lat2 - lat1) * t + curve_offset, 6)
            lng = round(lng1 + (lng2 - lng1) * t - curve_offset * 0.5, 6)
            points.append([lat, lng])
        return points
