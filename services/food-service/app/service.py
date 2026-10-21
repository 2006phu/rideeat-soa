"""Food Application Service orchestrating Restaurants, Redis Menu Cache, Carts, Orders, WebSockets & Seed Data."""

import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import WebSocket

from app.ai_recommender import FoodAIRecommender
from app.cart_manager import RedisCartManager
from app.models import FoodOrder, MenuItem, Restaurant
from app.repositories import FoodOrderRepository, MenuItemRepository, RestaurantRepository
from app.schemas import (
    CartAddItemRequest,
    CreateFoodOrderRequest,
    CreateMenuItemRequest,
    CreateRestaurantRequest,
    UpdateMenuItemRequest,
)
from services.common.cache.redis_client import ICacheProvider, RedisManager
from services.common.domain.base_service import BaseApplicationService
from services.common.exceptions import BusinessRuleViolationException, EntityNotFoundException
from services.common.http_client import InterServiceHttpClient
from services.common.messaging.interfaces import IEventPublisher

logger = logging.getLogger(__name__)


class OrderTrackingWebSocketManager:
    """OOP WebSocket Manager for real-time FoodOrder status streaming per order_id."""

    def __init__(self) -> None:
        self._rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, order_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if order_id not in self._rooms:
            self._rooms[order_id] = []
        self._rooms[order_id].append(websocket)

    def disconnect(self, order_id: str, websocket: WebSocket) -> None:
        if order_id in self._rooms:
            if websocket in self._rooms[order_id]:
                self._rooms[order_id].remove(websocket)
            if not self._rooms[order_id]:
                self._rooms.pop(order_id, None)

    async def broadcast_to_order(self, order_id: str, payload: Dict[str, Any]) -> int:
        connections = list(self._rooms.get(order_id, []))
        delivered = 0
        stale: List[WebSocket] = []
        for ws in connections:
            try:
                await ws.send_json(payload)
                delivered += 1
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(order_id, ws)
        return delivered


class FoodApplicationService(BaseApplicationService[FoodOrderRepository]):
    """OOP Application Service orchestrating Restaurants, Redis-Cached Menus, Carts, Orders & Kafka Events."""

    MENU_CACHE_TTL_SECONDS: int = 600

    def __init__(
        self,
        order_repository: FoodOrderRepository,
        restaurant_repository: RestaurantRepository,
        menu_repository: MenuItemRepository,
        cache_provider: ICacheProvider,
        cart_manager: RedisCartManager,
        event_publisher: Optional[IEventPublisher],
        promo_client: InterServiceHttpClient,
        ws_manager: OrderTrackingWebSocketManager,
        ai_recommender: FoodAIRecommender,
    ) -> None:
        super().__init__(repository=order_repository, event_publisher=event_publisher)
        self._restaurant_repo = restaurant_repository
        self._menu_repo = menu_repository
        self._cache = cache_provider
        self._cart_manager = cart_manager
        self._promo_client = promo_client
        self._ws_manager = ws_manager
        self._ai_recommender = ai_recommender

    @staticmethod
    def _menu_cache_key(restaurant_id: str) -> str:
        return f"food:menu:{restaurant_id}"

    # --- Restaurant & Redis-Cached Menu Operations ---

    async def list_restaurants(
        self,
        category: Optional[str] = None,
        only_open: bool = False,
        search: Optional[str] = None,
    ) -> List[Restaurant]:
        return await self._restaurant_repo.list_restaurants(
            category=category,
            only_open=only_open,
            search=search,
        )

    async def get_restaurant(self, restaurant_id: str) -> Restaurant:
        return await self._restaurant_repo.get_by_id_or_raise(restaurant_id)

    async def create_restaurant(self, owner_id: str, req: CreateRestaurantRequest) -> Restaurant:
        restaurant = Restaurant(
            owner_id=owner_id,
            name=req.name,
            address=req.address,
            latitude=req.latitude,
            longitude=req.longitude,
            category=req.category,
            open_time=req.open_time,
            close_time=req.close_time,
            banner_url=req.banner_url,
            rating=req.rating,
            is_open=True,
        )
        return await self._restaurant_repo.save(restaurant)

    async def toggle_restaurant_open(self, restaurant_id: str, is_open: bool) -> Restaurant:
        restaurant = await self._restaurant_repo.get_by_id_or_raise(restaurant_id)
        restaurant.toggle_open(is_open)
        return await self._restaurant_repo.save(restaurant)

    async def get_restaurant_menu(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """Retrieve restaurant menu from Redis cache if available, otherwise load from DB and populate cache."""
        await self._restaurant_repo.get_by_id_or_raise(restaurant_id)
        cache_key = self._menu_cache_key(restaurant_id)
        cached = await self._cache.get_json(cache_key)
        if cached and isinstance(cached, list):
            return cached

        items = await self._menu_repo.list_by_restaurant(restaurant_id)
        serialized = [
            {
                "id": item.id,
                "restaurant_id": item.restaurant_id,
                "name": item.name,
                "description": item.description,
                "price": item.price,
                "category": item.category,
                "image_url": item.image_url,
                "is_available": item.is_available,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
            }
            for item in items
        ]
        await self._cache.set_json(cache_key, serialized, ttl_seconds=self.MENU_CACHE_TTL_SECONDS)
        return serialized

    async def add_menu_item(self, restaurant_id: str, req: CreateMenuItemRequest) -> MenuItem:
        await self._restaurant_repo.get_by_id_or_raise(restaurant_id)
        item = MenuItem(
            restaurant_id=restaurant_id,
            name=req.name,
            description=req.description,
            price=req.price,
            category=req.category,
            image_url=req.image_url,
            is_available=req.is_available,
        )
        saved = await self._menu_repo.save(item)
        await self._cache.delete(self._menu_cache_key(restaurant_id))
        return saved

    async def update_menu_item(
        self,
        restaurant_id: str,
        item_id: str,
        req: UpdateMenuItemRequest,
    ) -> MenuItem:
        item = await self._menu_repo.get_by_id_or_raise(item_id)
        if item.restaurant_id != restaurant_id:
            raise EntityNotFoundException("MenuItem", item_id)
        if req.price is not None:
            item.update_price(req.price)
        if req.is_available is not None:
            item.set_availability(req.is_available)
        saved = await self._menu_repo.save(item)
        await self._cache.delete(self._menu_cache_key(restaurant_id))
        return saved

    # --- Shopping Cart Operations ---

    async def get_user_cart(self, user_id: str) -> Dict[str, Any]:
        return await self._cart_manager.get_cart(user_id)

    async def add_to_cart(self, user_id: str, req: CartAddItemRequest) -> Dict[str, Any]:
        restaurant = await self._restaurant_repo.get_by_id_or_raise(req.restaurant_id)
        if not restaurant.is_open:
            raise BusinessRuleViolationException(f"Restaurant '{restaurant.name}' is currently closed.")
        menu_item = await self._menu_repo.get_by_id_or_raise(req.menu_item_id)
        if menu_item.restaurant_id != restaurant.id:
            raise BusinessRuleViolationException("Selected menu item does not belong to the specified restaurant.")
        if not menu_item.is_available:
            raise BusinessRuleViolationException(f"Menu item '{menu_item.name}' is currently sold out.")

        return await self._cart_manager.add_item(
            user_id=user_id,
            restaurant_id=restaurant.id,
            menu_item_id=menu_item.id,
            name=menu_item.name,
            price=menu_item.price,
            quantity=req.quantity,
            image_url=menu_item.image_url,
        )

    async def remove_from_cart(self, user_id: str, menu_item_id: str) -> Dict[str, Any]:
        return await self._cart_manager.remove_item(user_id=user_id, menu_item_id=menu_item_id)

    async def clear_user_cart(self, user_id: str) -> Dict[str, Any]:
        return await self._cart_manager.clear_cart(user_id)

    # --- Food Order Lifecycle & State Machine ---

    async def _resolve_promo_discount(
        self,
        promo_code: Optional[str],
        subtotal: float,
        delivery_fee: float,
        customer_id: str,
    ) -> float:
        if not promo_code or not promo_code.strip():
            return 0.0
        code = promo_code.strip().upper()
        promo_resp = await self._promo_client.request(
            method="POST",
            path="/api/promos/validate",
            json_body={
                "code": code,
                "order_amount": subtotal,
                "service_type": "food",
                "user_id": customer_id,
            },
            raise_on_error=False,
        )
        if promo_resp and isinstance(promo_resp, dict) and "discount_amount" in promo_resp:
            return min(subtotal + delivery_fee, max(0.0, round(float(promo_resp["discount_amount"]), 0)))

        if code in ("FREESHIP", "FREE_SHIP"):
            return delivery_fee
        if code in ("RIDEEAT20", "FOOD20"):
            return min(35000.0, round(subtotal * 0.20, 0))
        if code in ("WELCOME50", "RIDEEAT50"):
            return min(50000.0, round(subtotal * 0.50, 0))
        return 0.0

    async def create_order(self, customer_id: str, req: CreateFoodOrderRequest) -> FoodOrder:
        """Create a FoodOrder from either explicit items or the customer's Redis cart, then emit 'order.created'."""
        order_items: List[Dict[str, Any]] = []
        restaurant_id = req.restaurant_id

        if req.items:
            for item_in in req.items:
                menu_item = await self._menu_repo.get_by_id_or_raise(item_in.menu_item_id)
                if not menu_item.is_available:
                    raise BusinessRuleViolationException(f"Dish '{menu_item.name}' is currently unavailable.")
                if restaurant_id is None:
                    restaurant_id = menu_item.restaurant_id
                elif restaurant_id != menu_item.restaurant_id:
                    raise BusinessRuleViolationException("All items in a food order must belong to the same restaurant.")
                order_items.append(
                    {
                        "menu_item_id": menu_item.id,
                        "name": menu_item.name,
                        "price": menu_item.price,
                        "quantity": item_in.quantity,
                        "line_total": round(menu_item.price * item_in.quantity, 0),
                    }
                )
        else:
            cart = await self._cart_manager.get_cart(customer_id)
            order_items = list(cart.get("items", []))
            if not restaurant_id:
                restaurant_id = cart.get("restaurant_id")

        if not restaurant_id or not order_items:
            raise BusinessRuleViolationException(
                "Cannot create an empty food order. Add items to cart or specify items in the request."
            )

        restaurant = await self._restaurant_repo.get_by_id_or_raise(restaurant_id)
        if not restaurant.is_open:
            raise BusinessRuleViolationException(f"Restaurant '{restaurant.name}' is currently closed.")

        subtotal = round(sum(float(i["price"]) * int(i["quantity"]) for i in order_items), 0)
        dist_km = RedisManager.haversine_km(
            restaurant.latitude,
            restaurant.longitude,
            req.delivery_lat,
            req.delivery_lng,
        )
        delivery_fee = round(max(15000.0, 12000.0 + (dist_km * 4000.0)), 0)
        discount_amount = await self._resolve_promo_discount(
            req.promo_code,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            customer_id=customer_id,
        )
        total_amount = max(0.0, round(subtotal + delivery_fee - discount_amount, 0))

        order = FoodOrder(
            customer_id=customer_id,
            restaurant_id=restaurant.id,
            items_json=json.dumps(order_items, ensure_ascii=False),
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            discount_amount=discount_amount,
            total_amount=total_amount,
            delivery_address=req.delivery_address,
            delivery_lat=req.delivery_lat,
            delivery_lng=req.delivery_lng,
            payment_method=req.payment_method,
            promo_code=req.promo_code.strip().upper() if req.promo_code else None,
        )
        saved = await self._repository.save(order)
        await self._cart_manager.clear_cart(customer_id)

        await self.publish_domain_event(
            topic="order.created",
            source_service="food-service",
            payload={
                "order_id": saved.id,
                "customer_id": saved.customer_id,
                "restaurant_id": saved.restaurant_id,
                "restaurant_name": restaurant.name,
                "total_amount": saved.total_amount,
                "payment_method": saved.payment_method,
                "status": saved.status,
            },
        )
        return saved

    async def get_order(self, order_id: str) -> FoodOrder:
        return await self._repository.get_by_id_or_raise(order_id)

    async def list_orders_for_user(
        self,
        user_id: str,
        role: str,
        restaurant_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[FoodOrder]:
        if restaurant_id:
            return await self._repository.list_by_restaurant(restaurant_id, skip=skip, limit=limit)
        if role == "driver":
            return await self._repository.list_by_driver(user_id, skip=skip, limit=limit)
        if role in ("admin", "restaurant"):
            return await self._repository.list_all(skip=skip, limit=limit)
        return await self._repository.list_by_customer(user_id, skip=skip, limit=limit)

    async def confirm_order(self, order_id: str) -> FoodOrder:
        """Restaurant confirms a pending food order; transitions to 'confirmed' and emits 'order.confirmed'."""
        order = await self._repository.get_by_id_or_raise(order_id)
        order.confirm_by_restaurant()
        saved = await self._repository.save(order)

        event_payload = {
            "order_id": saved.id,
            "customer_id": saved.customer_id,
            "restaurant_id": saved.restaurant_id,
            "status": saved.status,
            "total_amount": saved.total_amount,
        }
        await self.publish_domain_event(
            topic="order.confirmed",
            source_service="food-service",
            payload=event_payload,
        )
        await self._ws_manager.broadcast_to_order(
            order_id=saved.id,
            payload={"event": "order.confirmed", "order": event_payload},
        )
        return saved

    async def assign_driver(self, order_id: str, driver_id: str) -> FoodOrder:
        """Assign a delivery driver and transition order to 'delivering'."""
        order = await self._repository.get_by_id_or_raise(order_id)
        order.assign_driver(driver_id=driver_id)
        saved = await self._repository.save(order)

        await self._ws_manager.broadcast_to_order(
            order_id=saved.id,
            payload={
                "event": "order.driver_assigned",
                "order_id": saved.id,
                "driver_id": saved.driver_id,
                "status": saved.status,
            },
        )
        return saved

    async def complete_order(self, order_id: str) -> FoodOrder:
        """Mark food delivery as completed and emit 'order.completed'."""
        order = await self._repository.get_by_id_or_raise(order_id)
        order.complete_delivery()
        saved = await self._repository.save(order)

        event_payload = {
            "order_id": saved.id,
            "customer_id": saved.customer_id,
            "restaurant_id": saved.restaurant_id,
            "driver_id": saved.driver_id,
            "total_amount": saved.total_amount,
            "payment_method": saved.payment_method,
            "status": saved.status,
        }
        await self.publish_domain_event(
            topic="order.completed",
            source_service="food-service",
            payload=event_payload,
        )
        await self._ws_manager.broadcast_to_order(
            order_id=saved.id,
            payload={"event": "order.completed", "order": event_payload},
        )
        return saved

    async def cancel_order(self, order_id: str, reason: str) -> FoodOrder:
        """Cancel a food order and emit 'order.cancelled'."""
        order = await self._repository.get_by_id_or_raise(order_id)
        order.cancel_order(reason=reason)
        saved = await self._repository.save(order)

        event_payload = {
            "order_id": saved.id,
            "customer_id": saved.customer_id,
            "restaurant_id": saved.restaurant_id,
            "reason": saved.cancel_reason,
            "status": saved.status,
        }
        await self.publish_domain_event(
            topic="order.cancelled",
            source_service="food-service",
            payload=event_payload,
        )
        await self._ws_manager.broadcast_to_order(
            order_id=saved.id,
            payload={"event": "order.cancelled", "order": event_payload},
        )
        return saved

    async def get_ai_recommendation(
        self,
        mood: str,
        weather: str,
        budget_vnd: float,
    ) -> Dict[str, Any]:
        """Gather available dishes across restaurants and ask FoodAIRecommender for tailored picks."""
        restaurants = await self._restaurant_repo.list_restaurants(only_open=True, limit=20)
        catalog_dishes: List[Dict[str, Any]] = []
        for rest in restaurants:
            menu = await self.get_restaurant_menu(rest.id)
            for item in menu:
                if item.get("is_available", True):
                    catalog_dishes.append(
                        {
                            "menu_item_id": item["id"],
                            "name": item["name"],
                            "description": item["description"],
                            "price": item["price"],
                            "category": item["category"],
                            "restaurant_id": rest.id,
                            "restaurant_name": rest.name,
                        }
                    )
        return await self._ai_recommender.recommend(
            mood=mood,
            weather=weather,
            budget_vnd=budget_vnd,
            catalog_dishes=catalog_dishes,
        )


async def seed_initial_vietnamese_restaurants(session) -> None:
    """Seed 4 realistic Vietnamese restaurants and rich menus if database is empty."""
    rest_repo = RestaurantRepository(session=session)
    if await rest_repo.count_all() > 0:
        return

    menu_repo = MenuItemRepository(session=session)
    seeds = [
        {
            "id": "rest-pho-thin-01",
            "owner_id": "merchant-01",
            "name": "Phở Thìn Bờ Hồ - Nguyễn Thị Minh Khai",
            "address": "120 Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
            "latitude": 10.7798,
            "longitude": 106.6945,
            "category": "Noodles & Pho",
            "open_time": "06:00",
            "close_time": "22:30",
            "rating": 4.9,
            "banner_url": "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800",
            "dishes": [
                ("Phở Bò Tái Lăn Đặc Biệt", "Thịt bò thăn xào tỏi thơm lừng, nước dùng ninh xương 18 giờ", 65000.0, "Pho"),
                ("Phở Bò Chín Nạm Gầu", "Thịt nạm gầu giòn mềm, bánh phở tươi truyền thống", 60000.0, "Pho"),
                ("Quẩy Giòn Hà Nội (Đĩa)", "Quẩy nóng giòn ăn kèm nước phở béo ngậy", 15000.0, "Side"),
                ("Trà Đá Thảo Mộc", "Trà thảo mộc thanh mát nhà nấu", 12000.0, "Drink"),
            ],
        },
        {
            "id": "rest-com-tam-02",
            "owner_id": "merchant-02",
            "name": "Cơm Tấm Ba Ghiền Sài Gòn",
            "address": "84 Đặng Văn Ngữ, Phú Nhuận, TP.HCM",
            "latitude": 10.7932,
            "longitude": 106.6712,
            "category": "Vietnamese Rice",
            "open_time": "07:30",
            "close_time": "21:30",
            "rating": 4.8,
            "banner_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800",
            "dishes": [
                ("Cơm Tấm Sườn Bì Chả Đặc Biệt", "Sườn cốt lết nướng than hoa khổng lồ kèm bì thính và chả trứng", 75000.0, "Rice"),
                ("Cơm Tấm Sườn Nướng Mật Ong", "Sườn nướng ướp mật ong mềm mọng, mỡ hành tóp mỡ", 58000.0, "Rice"),
                ("Canh Khổ Qua Nhồi Thịt", "Canh khổ qua thanh nhiệt hầm xương ngọt dịu", 20000.0, "Soup"),
                ("Nước Sâm Bí Đao Hạt Chia", "Giải nhiệt sảng khoái sau bữa trưa", 18000.0, "Drink"),
            ],
        },
        {
            "id": "rest-bun-bo-03",
            "owner_id": "merchant-03",
            "name": "Bún Bò Huế Đông Ba Gia Truyền",
            "address": "207 Nguyễn Văn Cừ, Quận 5, TP.HCM",
            "latitude": 10.7615,
            "longitude": 106.6822,
            "category": "Central Specialties",
            "open_time": "06:30",
            "close_time": "22:00",
            "rating": 4.7,
            "banner_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
            "dishes": [
                ("Bún Bò Huế Đặc Biệt Giò Heo", "Nước dùng mắm ruốc sả thơm nồng, bắp bò, chả cua, giò heo", 68000.0, "Noodles"),
                ("Bún Bò Tái Chả Cua Huế", "Chả cua nguyên chất 100% từ cố đô Huế", 58000.0, "Noodles"),
                ("Bánh Bèo Chén Nhân Tôm Cháy", "Bánh bèo mềm mịn rắc tôm cháy và tóp mỡ giòn", 35000.0, "Side"),
                ("Nước Mơ Ngâm Đá", "Chua ngọt dịu nhẹ kích thích vị giác", 22000.0, "Drink"),
            ],
        },
        {
            "id": "rest-highlands-04",
            "owner_id": "merchant-04",
            "name": "La Việt Coffee & Bánh Mì Artisan",
            "address": "191 Hai Bà Trưng, Quận 3, TP.HCM",
            "latitude": 10.7856,
            "longitude": 106.6912,
            "category": "Coffee & Bakery",
            "open_time": "07:00",
            "close_time": "23:00",
            "rating": 4.9,
            "banner_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
            "dishes": [
                ("Cà Phê Sữa Đá Arabica Cầu Đất", "Hạt Arabica Đà Lạt rang mộc pha phin đậm đà", 42000.0, "Coffee"),
                ("Trà Đào Cam Sả Tươi", "Trà đen ủ lạnh kết hợp đào miếng giòn và cam vàng", 49000.0, "Tea"),
                ("Bánh Mì Chảo Bò Sốt Tiêu Đen", "Bánh mì giòn rụm kèm bò lúc lắc, pate gan ngỗng, trứng ốp la", 55000.0, "Bakery"),
                ("Bánh Croissant Bơ Pháp Trứng Muối", "Vỏ bánh ngàn lớp nướng mới mỗi sáng, sốt kim sa béo mịn", 45000.0, "Bakery"),
            ],
        },
    ]

    for r_data in seeds:
        restaurant = Restaurant(
            id=r_data["id"],
            owner_id=r_data["owner_id"],
            name=r_data["name"],
            address=r_data["address"],
            latitude=r_data["latitude"],
            longitude=r_data["longitude"],
            category=r_data["category"],
            open_time=r_data["open_time"],
            close_time=r_data["close_time"],
            rating=r_data["rating"],
            banner_url=r_data["banner_url"],
            is_open=True,
        )
        await rest_repo.save(restaurant)
        for idx, (d_name, d_desc, d_price, d_cat) in enumerate(r_data["dishes"], start=1):
            menu_item = MenuItem(
                id=f"{r_data['id']}-item-{idx:02d}",
                restaurant_id=restaurant.id,
                name=d_name,
                description=d_desc,
                price=d_price,
                category=d_cat,
                is_available=True,
            )
            await menu_repo.save(menu_item)

    logger.info("Seeded 4 realistic Vietnamese restaurants and 16 authentic menu items.")
