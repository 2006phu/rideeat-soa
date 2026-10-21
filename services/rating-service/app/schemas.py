"""Pydantic Request & Response Schemas for Rating Service."""

from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel, Field


class CreateReviewRequest(BaseModel):
    reviewer_id: str = Field(..., description="Customer user ID submitting the review")
    target_id: str = Field(..., description="Driver ID or Restaurant ID being rated")
    target_type: str = Field(default="driver", description="driver | restaurant")
    reference_id: str = Field(..., description="Ride ID or Food Order ID")
    stars: int = Field(..., description="Star rating from 1 to 5")
    comment: Optional[str] = Field(default=None, description="Optional review text")
    image_url: Optional[str] = Field(default=None, description="Optional photo attachment URL")


class ReviewResponse(BaseModel):
    id: str
    reviewer_id: str
    target_id: str
    target_type: str
    reference_id: str
    stars: int
    comment: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RatingSummaryResponse(BaseModel):
    target_type: str
    target_id: str
    average_stars: float
    total_reviews: int
    star_breakdown: Dict[str, int]
    cached: bool = False
