"""Pydantic Request & Response Schemas for Food Service."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CreateRestaurantRequest(BaseModel):
    """Request payload to register a new partner restaurant."""

    name: str = Field(..., min_length=2, max_length=180)
    address: str = Field(..., min_length=3, max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    category: str = Field(..., min_length=2, max_length=64)
    open_time: str = Field(default="07:00")
    close_time: str = Field(default="22:30")
    banner_url: Optional[str] = Field(default=None)
    rating: float = Field(default=4.8, ge=1.0, le=5.0)


class ToggleRestaurantOpenRequest(BaseModel):
    """Request payload to open or close a restaurant."""

    is_open: bool


class RestaurantResponse(BaseModel):
    """Serialized representation of a Restaurant entity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    name: str
    address: str
    latitude: float
    longitude: float
    category: str
    open_time: str
    close_time: str
    is_open: bool
    banner_url: Optional[str] = None
    rating: float
    created_at: datetime
    updated_at: datetime


class CreateMenuItemRequest(BaseModel):
    """Request payload to add a dish/beverage to a restaurant's menu."""

    name: str = Field(..., min_length=2, max_length=180)
    description: str = Field(default="", max_length=1000)
    price: float = Field(..., gt=0)
    category: str = Field(default="Main", max_length=64)
    image_url: Optional[str] = Field(default=None)
    is_available: bool = Field(default=True)


class UpdateMenuItemRequest(BaseModel):
    """Request payload to update menu item price or availability."""

    price: Optional[float] = Field(default=None, gt=0)
    is_available: Optional[bool] = Field(default=None)


class MenuItemResponse(BaseModel):
    """Serialized representation of a MenuItem entity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    is_available: bool
    created_at: datetime
    updated_at: datetime


class CartAddItemRequest(BaseModel):
    """Request payload to add a menu item to the user's Redis shopping cart."""

    restaurant_id: str
    menu_item_id: str
    quantity: int = Field(default=1, ge=1, le=50)


class OrderItemInput(BaseModel):
    """Explicit line item when placing a food order directly."""

    menu_item_id: str
    quantity: int = Field(default=1, ge=1, le=50)


class CreateFoodOrderRequest(BaseModel):
    """Request payload to create a food delivery order (from cart or explicit items)."""

    restaurant_id: Optional[str] = Field(default=None)
    items: Optional[List[OrderItemInput]] = Field(default=None)
    delivery_address: str = Field(..., min_length=3, max_length=255)
    delivery_lat: float = Field(..., ge=-90.0, le=90.0)
    delivery_lng: float = Field(..., ge=-180.0, le=180.0)
    payment_method: str = Field(default="wallet")
    promo_code: Optional[str] = Field(default=None)


class AssignDriverRequest(BaseModel):
    """Request payload to assign a delivery driver to a food order."""

    driver_id: Optional[str] = Field(default=None)


class CancelFoodOrderRequest(BaseModel):
    """Request payload to cancel a food order."""

    reason: str = Field(default="Cancelled by customer", max_length=255)


class FoodAIRecommendRequest(BaseModel):
    """Request payload for AI culinary recommendations."""

    mood: str = Field(default="hungry", min_length=2, max_length=200)
    weather: str = Field(default="sunny", max_length=100)
    budget_vnd: float = Field(default=100000.0, gt=0)


class FoodOrderResponse(BaseModel):
    """Serialized representation of a FoodOrder domain entity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    customer_id: str
    restaurant_id: str
    driver_id: Optional[str] = None
    items: List[Dict[str, Any]]
    subtotal: float
    delivery_fee: float
    discount_amount: float
    total_amount: float
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    status: str
    payment_method: str
    cancel_reason: Optional[str] = None
    promo_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
