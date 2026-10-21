"""OOP Redis Cache and Geospatial Engine with In-Memory & Haversine Fallback."""

import json
import logging
import math
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class GeoLocation(BaseModel):
    """Value object representing a geospatial member and its coordinates."""

    member_id: str
    latitude: float
    longitude: float
    distance_km: Optional[float] = None


class ICacheProvider(ABC):
    """Abstract interface for key-value caching operations."""

    @abstractmethod
    async def get_json(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    @abstractmethod
    async def set_json(self, key: str, value: Any, ttl_seconds: int = 600) -> None:
        raise NotImplementedError

    @abstractmethod
    async def delete(self, key: str) -> None:
        raise NotImplementedError


class IGeoSpatialProvider(ABC):
    """Abstract interface for geospatial tracking and proximity queries."""

    @abstractmethod
    async def geo_add(self, key: str, member_id: str, latitude: float, longitude: float) -> None:
        raise NotImplementedError

    @abstractmethod
    async def geo_search_nearby(
        self,
        key: str,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        limit: int = 10,
    ) -> List[GeoLocation]:
        raise NotImplementedError

    @abstractmethod
    async def geo_get_position(self, key: str, member_id: str) -> Optional[GeoLocation]:
        raise NotImplementedError


class RedisManager(ICacheProvider, IGeoSpatialProvider):
    """Concrete Redis client implementing both ICacheProvider and IGeoSpatialProvider with memory fallback."""

    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._client = None
        self._memory_cache: Dict[str, Tuple[Any, Optional[float]]] = {}
        self._memory_geo: Dict[str, Dict[str, Tuple[float, float]]] = {}

    async def connect(self) -> None:
        try:
            import redis.asyncio as aioredis

            client = aioredis.from_url(self._redis_url, decode_responses=True)
            await client.ping()
            self._client = client
            logger.info(f"Connected to Redis at {self._redis_url}")
        except Exception as exc:
            logger.warning(f"Redis unavailable ({exc}); using resilient in-memory cache + Haversine geo engine.")
            self._client = None

    async def close(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                pass

    async def get_json(self, key: str) -> Optional[Any]:
        if self._client is not None:
            try:
                raw = await self._client.get(key)
                return json.loads(raw) if raw else None
            except Exception as exc:
                logger.warning(f"Redis get error on '{key}': {exc}")

        entry = self._memory_cache.get(key)
        if not entry:
            return None
        val, expires_at = entry
        if expires_at and time.time() > expires_at:
            self._memory_cache.pop(key, None)
            return None
        return val

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 600) -> None:
        if self._client is not None:
            try:
                await self._client.set(key, json.dumps(value), ex=ttl_seconds)
                return
            except Exception as exc:
                logger.warning(f"Redis set error on '{key}': {exc}")

        expires_at = time.time() + ttl_seconds if ttl_seconds > 0 else None
        self._memory_cache[key] = (value, expires_at)

    async def delete(self, key: str) -> None:
        if self._client is not None:
            try:
                await self._client.delete(key)
            except Exception:
                pass
        self._memory_cache.pop(key, None)

    async def geo_add(self, key: str, member_id: str, latitude: float, longitude: float) -> None:
        if self._client is not None:
            try:
                await self._client.geoadd(key, (longitude, latitude, member_id))
                return
            except Exception as exc:
                logger.warning(f"Redis geoadd error: {exc}")

        if key not in self._memory_geo:
            self._memory_geo[key] = {}
        self._memory_geo[key][member_id] = (latitude, longitude)

    async def geo_get_position(self, key: str, member_id: str) -> Optional[GeoLocation]:
        if self._client is not None:
            try:
                pos = await self._client.geopos(key, member_id)
                if pos and pos[0]:
                    lng, lat = pos[0]
                    return GeoLocation(member_id=member_id, latitude=float(lat), longitude=float(lng))
            except Exception:
                pass

        coords = self._memory_geo.get(key, {}).get(member_id)
        if not coords:
            return None
        return GeoLocation(member_id=member_id, latitude=coords[0], longitude=coords[1])

    async def geo_search_nearby(
        self,
        key: str,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        limit: int = 10,
    ) -> List[GeoLocation]:
        if self._client is not None:
            try:
                results = await self._client.geosearch(
                    name=key,
                    longitude=longitude,
                    latitude=latitude,
                    radius=radius_km,
                    unit="km",
                    withdist=True,
                    withcoord=True,
                    sort="ASC",
                    count=limit,
                )
                locations: List[GeoLocation] = []
                for item in results:
                    member = item[0]
                    dist = float(item[1])
                    lng, lat = item[2]
                    locations.append(
                        GeoLocation(
                            member_id=str(member),
                            latitude=float(lat),
                            longitude=float(lng),
                            distance_km=round(dist, 3),
                        )
                    )
                return locations
            except Exception as exc:
                logger.warning(f"Redis geosearch error: {exc}")

        # Fallback Haversine calculation in memory
        members = self._memory_geo.get(key, {})
        nearby: List[GeoLocation] = []
        for member_id, (m_lat, m_lng) in members.items():
            dist = self.haversine_km(latitude, longitude, m_lat, m_lng)
            if dist <= radius_km:
                nearby.append(
                    GeoLocation(
                        member_id=member_id,
                        latitude=m_lat,
                        longitude=m_lng,
                        distance_km=round(dist, 3),
                    )
                )
        nearby.sort(key=lambda loc: loc.distance_km or 0.0)
        return nearby[:limit]

    @staticmethod
    def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Compute great-circle distance in kilometers between two coordinates."""
        radius_earth_km = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return radius_earth_km * c
