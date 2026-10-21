"""Base Configuration Class using Pydantic Settings (Inheritance)."""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    """Base configuration inherited by all RideEat microservices."""

    SERVICE_NAME: str = "rideeat-service"
    SERVICE_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./rideeat.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_ENABLED: bool = True

    # Firebase
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_STORAGE_BUCKET: str = "rideeat-soa.appspot.com"
    JWT_SECRET_KEY: str = "rideeat-soa-super-secret-jwt-key-2026"
    JWT_ALGORITHM: str = "HS256"

    # Inter-service URLs
    AUTH_SERVICE_URL: str = "http://auth-service:8001"
    USER_SERVICE_URL: str = "http://user-service:8002"
    RIDE_SERVICE_URL: str = "http://ride-service:8003"
    FOOD_SERVICE_URL: str = "http://food-service:8004"
    MAP_SERVICE_URL: str = "http://map-service:8005"
    PAYMENT_SERVICE_URL: str = "http://payment-service:8006"
    RATING_SERVICE_URL: str = "http://rating-service:8007"
    PROMO_SERVICE_URL: str = "http://promo-service:8008"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8009"

    # External APIs
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    OSRM_BASE_URL: str = "https://router.project-osrm.org"
    GEMINI_API_KEY: Optional[str] = None

    # OpenTelemetry
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
