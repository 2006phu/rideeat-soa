"""Polymorphic Ride Pricing Strategies, Surge Decorator, and Strategy Factory."""

from abc import ABC, abstractmethod
from typing import Dict, Type

from services.common.exceptions import BusinessRuleViolationException


class IRidePricingStrategy(ABC):
    """Abstract Strategy interface for calculating ride fares (Abstraction & Polymorphism)."""

    @property
    @abstractmethod
    def vehicle_type(self) -> str:
        """Return canonical vehicle type identifier."""
        raise NotImplementedError

    @property
    @abstractmethod
    def base_fare(self) -> float:
        """Return base flag-fall fare in VND."""
        raise NotImplementedError

    @property
    @abstractmethod
    def per_km_rate(self) -> float:
        """Return rate per kilometer in VND."""
        raise NotImplementedError

    @property
    @abstractmethod
    def per_minute_rate(self) -> float:
        """Return rate per minute in VND."""
        raise NotImplementedError

    @abstractmethod
    def calculate_fare(self, distance_km: float, duration_minutes: float) -> float:
        """Calculate total fare in VND given distance (km) and duration (minutes)."""
        raise NotImplementedError


class BaseVehiclePricingStrategy(IRidePricingStrategy):
    """Template base class encapsulating common distance + duration linear fare computation."""

    def __init__(
        self,
        vehicle_type: str,
        base_fare: float,
        per_km_rate: float,
        per_minute_rate: float,
    ) -> None:
        self._vehicle_type = vehicle_type
        self._base_fare = base_fare
        self._per_km_rate = per_km_rate
        self._per_minute_rate = per_minute_rate

    @property
    def vehicle_type(self) -> str:
        return self._vehicle_type

    @property
    def base_fare(self) -> float:
        return self._base_fare

    @property
    def per_km_rate(self) -> float:
        return self._per_km_rate

    @property
    def per_minute_rate(self) -> float:
        return self._per_minute_rate

    def calculate_fare(self, distance_km: float, duration_minutes: float) -> float:
        safe_dist = max(0.0, float(distance_km))
        safe_dur = max(0.0, float(duration_minutes))
        raw_total = (
            self._base_fare
            + (safe_dist * self._per_km_rate)
            + (safe_dur * self._per_minute_rate)
        )
        return round(raw_total, 0)


class MotorbikePricingStrategy(BaseVehiclePricingStrategy):
    """Concrete Strategy for Motorbike (Xe máy): base 12,000 VND + 4,500/km + 300/min."""

    def __init__(self) -> None:
        super().__init__(
            vehicle_type="motorbike",
            base_fare=12000.0,
            per_km_rate=4500.0,
            per_minute_rate=300.0,
        )


class Car4PricingStrategy(BaseVehiclePricingStrategy):
    """Concrete Strategy for 4-seat Car (Ô tô 4 chỗ): base 25,000 VND + 11,000/km + 500/min."""

    def __init__(self) -> None:
        super().__init__(
            vehicle_type="car_4",
            base_fare=25000.0,
            per_km_rate=11000.0,
            per_minute_rate=500.0,
        )


class Car7PricingStrategy(BaseVehiclePricingStrategy):
    """Concrete Strategy for 7-seat SUV/MPV (Ô tô 7 chỗ): base 30,000 VND + 14,000/km + 600/min."""

    def __init__(self) -> None:
        super().__init__(
            vehicle_type="car_7",
            base_fare=30000.0,
            per_km_rate=14000.0,
            per_minute_rate=600.0,
        )


class SurgePricingDecorator(IRidePricingStrategy):
    """Decorator Pattern wrapping any IRidePricingStrategy to apply peak/rain surge multipliers."""

    def __init__(self, wrapped_strategy: IRidePricingStrategy, surge_multiplier: float = 1.0) -> None:
        if surge_multiplier < 1.0 or surge_multiplier > 5.0:
            raise BusinessRuleViolationException(
                "Surge multiplier must be between 1.0 and 5.0.",
                details={"surge_multiplier": surge_multiplier},
            )
        self._wrapped = wrapped_strategy
        self._surge_multiplier = float(surge_multiplier)

    @property
    def surge_multiplier(self) -> float:
        return self._surge_multiplier

    @property
    def vehicle_type(self) -> str:
        return self._wrapped.vehicle_type

    @property
    def base_fare(self) -> float:
        return self._wrapped.base_fare

    @property
    def per_km_rate(self) -> float:
        return self._wrapped.per_km_rate

    @property
    def per_minute_rate(self) -> float:
        return self._wrapped.per_minute_rate

    def calculate_fare(self, distance_km: float, duration_minutes: float) -> float:
        base_calculated = self._wrapped.calculate_fare(distance_km, duration_minutes)
        return round(base_calculated * self._surge_multiplier, 0)


class RidePricingFactory:
    """Factory Pattern instantiating the appropriate IRidePricingStrategy and optional SurgePricingDecorator."""

    _STRATEGY_REGISTRY: Dict[str, Type[IRidePricingStrategy]] = {
        "motorbike": MotorbikePricingStrategy,
        "bike": MotorbikePricingStrategy,
        "car_4": Car4PricingStrategy,
        "car4": Car4PricingStrategy,
        "car": Car4PricingStrategy,
        "car_7": Car7PricingStrategy,
        "car7": Car7PricingStrategy,
        "suv": Car7PricingStrategy,
    }

    @classmethod
    def create_strategy(
        cls,
        vehicle_type: str,
        surge_multiplier: float = 1.0,
    ) -> IRidePricingStrategy:
        normalized = (vehicle_type or "motorbike").strip().lower()
        strategy_cls = cls._STRATEGY_REGISTRY.get(normalized)
        if strategy_cls is None:
            raise BusinessRuleViolationException(
                f"Unsupported vehicle_type '{vehicle_type}'. Supported types: motorbike, car_4, car_7.",
                details={"vehicle_type": vehicle_type},
            )
        base_strategy = strategy_cls()
        return SurgePricingDecorator(base_strategy, surge_multiplier=surge_multiplier)
