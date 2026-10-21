"""Abstract Interfaces for Geocoding and Routing Providers (Strategy & Adapter Patterns)."""

from abc import ABC, abstractmethod
from app.schemas import GeocodeResponse, RouteResponse


class IGeocodingProvider(ABC):
    """Abstract Strategy/Adapter interface for forward and reverse geocoding."""

    @abstractmethod
    async def geocode(self, address: str) -> GeocodeResponse:
        """Convert a human-readable address or landmark into geographic coordinates."""
        raise NotImplementedError

    @abstractmethod
    async def reverse_geocode(self, latitude: float, longitude: float) -> GeocodeResponse:
        """Convert geographic coordinates into a human-readable street address."""
        raise NotImplementedError


class IRoutingProvider(ABC):
    """Abstract Strategy/Adapter interface for road-network routing and ETA computation."""

    @abstractmethod
    async def calculate_route(
        self,
        pickup_lat: float,
        pickup_lng: float,
        dropoff_lat: float,
        dropoff_lng: float,
    ) -> RouteResponse:
        """Calculate driving distance (km), duration (minutes), and polyline geometry."""
        raise NotImplementedError
