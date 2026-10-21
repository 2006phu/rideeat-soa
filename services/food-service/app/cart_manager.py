"""OOP Redis Shopping Cart Manager with 30-Minute TTL."""

from typing import Any, Dict, List, Optional

from services.common.cache.redis_client import ICacheProvider
from services.common.exceptions import BusinessRuleViolationException


class RedisCartManager:
    """Encapsulates per-user shopping cart state in Redis (ICacheProvider) with 30-minute TTL."""

    CART_TTL_SECONDS: int = 1800  # 30 minutes

    def __init__(self, cache_provider: ICacheProvider) -> None:
        self._cache = cache_provider

    @staticmethod
    def _cart_key(user_id: str) -> str:
        return f"food:cart:{user_id}"

    async def get_cart(self, user_id: str) -> Dict[str, Any]:
        """Retrieve user's shopping cart from Redis or return an empty cart structure."""
        raw = await self._cache.get_json(self._cart_key(user_id))
        if not raw or not isinstance(raw, dict):
            return {
                "user_id": user_id,
                "restaurant_id": None,
                "items": [],
                "subtotal": 0.0,
                "total_quantity": 0,
            }
        return raw

    async def add_item(
        self,
        user_id: str,
        restaurant_id: str,
        menu_item_id: str,
        name: str,
        price: float,
        quantity: int = 1,
        image_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Add or update an item in the user's cart, enforcing single-restaurant cart consistency."""
        if quantity <= 0:
            raise BusinessRuleViolationException("Item quantity must be at least 1.")

        cart = await self.get_cart(user_id)
        existing_rest_id = cart.get("restaurant_id")
        if existing_rest_id and existing_rest_id != restaurant_id and cart.get("items"):
            # Reset cart automatically or replace when switching restaurant? Let's reset cleanly to the new restaurant
            cart["items"] = []

        cart["restaurant_id"] = restaurant_id
        items: List[Dict[str, Any]] = list(cart.get("items", []))

        found = False
        for item in items:
            if item.get("menu_item_id") == menu_item_id:
                item["quantity"] = int(item.get("quantity", 0)) + int(quantity)
                item["price"] = float(price)
                item["line_total"] = round(item["price"] * item["quantity"], 0)
                found = True
                break

        if not found:
            items.append(
                {
                    "menu_item_id": menu_item_id,
                    "name": name,
                    "price": float(price),
                    "quantity": int(quantity),
                    "image_url": image_url,
                    "line_total": round(float(price) * int(quantity), 0),
                }
            )

        cart["items"] = items
        self._recalculate_totals(cart)
        await self._cache.set_json(self._cart_key(user_id), cart, ttl_seconds=self.CART_TTL_SECONDS)
        return cart

    async def remove_item(self, user_id: str, menu_item_id: str) -> Dict[str, Any]:
        """Remove a specific menu item from the user's cart."""
        cart = await self.get_cart(user_id)
        items = [i for i in cart.get("items", []) if i.get("menu_item_id") != menu_item_id]
        cart["items"] = items
        if not items:
            cart["restaurant_id"] = None
        self._recalculate_totals(cart)
        await self._cache.set_json(self._cart_key(user_id), cart, ttl_seconds=self.CART_TTL_SECONDS)
        return cart

    async def clear_cart(self, user_id: str) -> Dict[str, Any]:
        """Empty the user's shopping cart in Redis."""
        await self._cache.delete(self._cart_key(user_id))
        return {
            "user_id": user_id,
            "restaurant_id": None,
            "items": [],
            "subtotal": 0.0,
            "total_quantity": 0,
        }

    @staticmethod
    def _recalculate_totals(cart: Dict[str, Any]) -> None:
        items = cart.get("items", [])
        subtotal = sum(float(i.get("price", 0)) * int(i.get("quantity", 0)) for i in items)
        total_qty = sum(int(i.get("quantity", 0)) for i in items)
        cart["subtotal"] = round(subtotal, 0)
        cart["total_quantity"] = total_qty
