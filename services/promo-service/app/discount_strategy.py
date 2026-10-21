"""Polymorphic Discount Calculation Strategies & Factory Pattern."""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Type

from services.common.exceptions import BusinessRuleViolationException


class IDiscountStrategy(ABC):
    """Abstract Strategy interface for computing promotional discounts."""

    @abstractmethod
    def compute_discount(
        self,
        order_amount: float,
        discount_value: float,
        max_discount: Optional[float] = None,
    ) -> float:
        """Compute the discount amount polymorphically, capped at order_amount and max_discount."""
        raise NotImplementedError


class PercentageDiscountStrategy(IDiscountStrategy):
    """Concrete Strategy calculating percentage-based discount with optional cap."""

    def compute_discount(
        self,
        order_amount: float,
        discount_value: float,
        max_discount: Optional[float] = None,
    ) -> float:
        if order_amount <= 0 or discount_value <= 0:
            return 0.0
        raw_discount = order_amount * (discount_value / 100.0)
        if max_discount is not None and max_discount > 0:
            raw_discount = min(raw_discount, max_discount)
        return round(min(raw_discount, order_amount), 2)


class FixedAmountDiscountStrategy(IDiscountStrategy):
    """Concrete Strategy calculating flat VND discount capped by order_amount."""

    def compute_discount(
        self,
        order_amount: float,
        discount_value: float,
        max_discount: Optional[float] = None,
    ) -> float:
        if order_amount <= 0 or discount_value <= 0:
            return 0.0
        raw_discount = discount_value
        if max_discount is not None and max_discount > 0:
            raw_discount = min(raw_discount, max_discount)
        return round(min(raw_discount, order_amount), 2)


class DiscountStrategyFactory:
    """Factory Pattern resolving concrete IDiscountStrategy implementations by discount_type."""

    _registry: Dict[str, Type[IDiscountStrategy]] = {
        "percentage": PercentageDiscountStrategy,
        "fixed": FixedAmountDiscountStrategy,
    }

    @classmethod
    def get_strategy(cls, discount_type: str) -> IDiscountStrategy:
        normalized = (discount_type or "percentage").lower().strip()
        strategy_cls = cls._registry.get(normalized)
        if strategy_cls is None:
            raise BusinessRuleViolationException(
                f"Unsupported discount_type '{discount_type}'. Allowed: {list(cls._registry.keys())}",
                details={"discount_type": discount_type},
            )
        return strategy_cls()
