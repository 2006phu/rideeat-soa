"""Domain Entity for Customer Reviews & Ratings (OOP Encapsulation & Inheritance)."""

from enum import Enum
from typing import Optional
from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from services.common.db.base import BaseORMModel, TimestampMixin
from services.common.exceptions import BusinessRuleViolationException


class TargetType(str, Enum):
    DRIVER = "driver"
    RESTAURANT = "restaurant"


class Review(BaseORMModel, TimestampMixin):
    """Domain entity representing a 1..5 star review for a driver or restaurant."""

    __tablename__ = "reviews"

    reviewer_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    target_type: Mapped[str] = mapped_column(
        String(32), default=TargetType.DRIVER.value, index=True, nullable=False
    )
    reference_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    def validate_rating(self) -> None:
        """Encapsulated domain invariant: stars must be between 1 and 5, target_type must be valid."""
        if not isinstance(self.stars, int) or self.stars < 1 or self.stars > 5:
            raise BusinessRuleViolationException(
                "Rating stars must be an integer between 1 and 5.",
                details={"stars": self.stars},
            )
        valid_targets = {t.value for t in TargetType}
        if self.target_type not in valid_targets:
            raise BusinessRuleViolationException(
                f"Invalid target_type '{self.target_type}'. Allowed values: {sorted(valid_targets)}",
                details={"target_type": self.target_type},
            )
        if not self.reviewer_id or not self.target_id or not self.reference_id:
            raise BusinessRuleViolationException(
                "reviewer_id, target_id, and reference_id are required for a review."
            )
