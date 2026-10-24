"""Enterprise Domain Enums for RideEat SOA Platform.

Establishes universal state machines, roles, vehicle classes and payment methods
shared across all 9 microservices.
"""

from enum import Enum


class UserRole(str, Enum):
    """Universal user role categorization."""
    CUSTOMER = "customer"
    DRIVER = "driver"
    RESTAURANT = "restaurant"
    ADMIN = "admin"


class VehicleType(str, Enum):
    """Vehicle categories supported by ride & map services."""
    MOTORBIKE = "motorbike"
    CAR_4 = "car_4"
    CAR_7 = "car_7"


class RideStatus(str, Enum):
    """Finite State Machine for Ride Hailing lifecycle."""
    REQUESTED = "requested"
    MATCHED = "matched"
    PICKING_UP = "picking_up"
    IN_TRANSIT = "in_transit"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderStatus(str, Enum):
    """Finite State Machine for Food Ordering lifecycle."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    DELIVERING = "delivering"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    """Payment transaction states."""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    """Supported payment channels."""
    WALLET = "wallet"
    VNPAY = "vnpay"
    MOMO = "momo"
    CASH = "cash"


class TransactionType(str, Enum):
    """Ledger balance delta classification."""
    CREDIT = "credit"
    DEBIT = "debit"


class DiscountType(str, Enum):
    """Promotion calculation strategy types."""
    PERCENTAGE = "percentage"
    FIXED = "fixed"
