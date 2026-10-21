"""Entrypoint for RideEat Map Service (Port 8005)."""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure both service root and rideeat-soa monorepo root are on sys.path
_SERVICE_ROOT = Path(__file__).resolve().parents[1]
_MONOREPO_ROOT = Path(__file__).resolve().parents[3]
for _p in (str(_SERVICE_ROOT), str(_MONOREPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.common.cache.redis_client import RedisManager
from services.common.config import BaseServiceSettings
from services.common.exceptions import register_exception_handlers
from services.common.observability.telemetry import ObservabilityManager

from app.adapters import NominatimGeocodingAdapter, OSRMRoutingAdapter
from app.routes import router as map_router
from app.service import MapApplicationService


class MapServiceSettings(BaseServiceSettings):
    """Configuration specific to Map Service."""

    SERVICE_NAME: str = "map-service"
    PORT: int = 8005


settings = MapServiceSettings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle for Redis Geo, adapters, and seeded demo drivers."""
    redis_manager = RedisManager(settings.REDIS_URL)
    await redis_manager.connect()

    geocoding_adapter = NominatimGeocodingAdapter(base_url=settings.NOMINATIM_BASE_URL)
    routing_adapter = OSRMRoutingAdapter(base_url=settings.OSRM_BASE_URL)

    map_service = MapApplicationService(
        geocoding_provider=geocoding_adapter,
        routing_provider=routing_adapter,
        geo_provider=redis_manager,
        cache_provider=redis_manager,
    )

    # Seed 3 nearby demo drivers in Redis Geo on startup
    await map_service.seed_demo_drivers()

    app.state.redis_manager = redis_manager
    app.state.map_service = map_service

    yield

    await redis_manager.close()


def create_app() -> FastAPI:
    """Application factory creating and instrumenting the Map Service FastAPI app."""
    app = FastAPI(
        title="RideEat Map, Geocoding & Routing Service",
        description="OpenStreetMap Nominatim Geocoding, OSRM Routing & Redis Geo Driver Proximity Tracking",
        version=settings.SERVICE_VERSION,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    observability = ObservabilityManager(
        service_name=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
    )
    observability.instrument_app(app)
    app.include_router(map_router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
