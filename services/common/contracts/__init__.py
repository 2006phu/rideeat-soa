"""RideEat SOA - Common Enterprise Contracts Module."""

from services.common.contracts.enums import (
    DiscountType,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    RideStatus,
    TransactionType,
    UserRole,
    VehicleType,
)
from services.common.contracts.api_envelope import (
    ApiErrorEnvelope,
    ApiPaginationMeta,
    ApiResponse,
)
from services.common.contracts.dtos import (
    CartItemDTO,
    FoodOrderSummaryDTO,
    GeoCoordinateDTO,
    MoneyDTO,
    RideEstimateDTO,
    UserPrincipalDTO,
)
from services.common.contracts.events import (
    BaseEventEnvelope,
    DriverLocationUpdateEventPayload,
    FoodOrderPlacedEventPayload,
    PaymentCompletedEventPayload,
    RideMatchedEventPayload,
    RideRequestedEventPayload,
    RideStatusChangedEventPayload,
)

__all__ = [
    # Enums
    "UserRole",
    "VehicleType",
    "RideStatus",
    "OrderStatus",
    "PaymentStatus",
    "PaymentMethod",
    "TransactionType",
    "DiscountType",
    # API Envelopes
    "ApiResponse",
    "ApiPaginationMeta",
    "ApiErrorEnvelope",
    # DTOs
    "GeoCoordinateDTO",
    "MoneyDTO",
    "UserPrincipalDTO",
    "RideEstimateDTO",
    "CartItemDTO",
    "FoodOrderSummaryDTO",
    # Events
    "BaseEventEnvelope",
    "RideRequestedEventPayload",
    "RideMatchedEventPayload",
    "RideStatusChangedEventPayload",
    "FoodOrderPlacedEventPayload",
    "PaymentCompletedEventPayload",
    "DriverLocationUpdateEventPayload",
]
