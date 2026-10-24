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
            "name": "Phở Thìn Bờ Hồ - Chi Nhánh Quận 1",
            "address": "120 Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
            "latitude": 10.7798,
            "longitude": 106.6945,
            "category": "Món Việt Truyền Thống",
            "open_time": "06:00",
            "close_time": "22:30",
            "rating": 4.9,
            "banner_url": "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800",
            "dishes": [
                ("Phở Bò Tái Lăn Đặc Biệt", "Thịt bò thăn xào tỏi thơm nồng trên chảo gang, nước ninh xương 18 giờ", 65000.0, "soup", "BESTSELLER", 580),
                ("Phở Bò Chín Nạm Gầu Nước Trong", "Nạm gầu giòn sần sật, nước dùng thanh ngọt tự nhiên không mì chính", 62000.0, "soup", "TRUYỀN THỐNG", 520),
                ("Bún Thang Phố Cổ Hà Nội", "Trứng tráng chỉ, gà xé, giò lụa, nấm hương nước dùng thơm ngát", 68000.0, "cooking-pot", "CHEF_CHOICE", 490),
                ("Quẩy Giòn Hà Nội Nóng Hổi (Đĩa)", "Quẩy chiên vàng ruộm giòn tan, nhúng nước phở béo ngậy", 15000.0, "cookie", "ĂN KÈM", 180),
                ("Trà Đá Thảo Mộc Thanh Nhiệt", "Trà thảo mộc hoa cúc ủ lạnh giải nhiệt sảng khoái", 10000.0, "cup-soda", "THANH MÁT", 15),
            ],
        },
        {
            "id": "rest-com-tam-02",
            "owner_id": "merchant-02",
            "name": "Cơm Tấm Ba Ghiền - Sài Gòn 1985",
            "address": "84 Đặng Văn Ngữ, Phú Nhuận, TP.HCM",
            "latitude": 10.7932,
            "longitude": 106.6712,
            "category": "Cơm Tấm Sài Gòn",
            "open_time": "07:30",
            "close_time": "21:30",
            "rating": 4.85,
            "banner_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800",
            "dishes": [
                ("Cơm Tấm Sườn Bì Chả Trứng Đặc Biệt", "Miếng sườn cốt lết to bản ướp sả ớt nướng than hoa kèm chả trứng", 75000.0, "beef", "BESTSELLER", 760),
                ("Cơm Sườn Cây Nướng Mật Ong Rừng", "Sườn cây nướng mềm róc xương, sốt mật ong bóng bẩy thơm lừng", 65000.0, "beef", "HOT", 680),
                ("Cơm Đùi Gà Xối Mỡ Da Giòn", "Đùi gà góc tư chiên xối mỡ giòn rụm bên ngoài mọng nước bên trong", 58000.0, "drumstick", "GIÒN RỤM", 640),
                ("Canh Khổ Qua Nhồi Thịt Thác Lác", "Khổ qua nhồi thịt băm và cá thác lác dẻo dai hầm xương ngọt lịm", 25000.0, "soup", "THANH NHIỆT", 140),
                ("Trà Tắc Xí Muội Mát Lạnh", "Chua ngọt mặn mà đậm đà vị xí muội giải nhiệt sau bữa trưa", 18000.0, "cup-soda", "GIẢI KHÁT", 90),
            ],
        },
        {
            "id": "rest-bun-bo-03",
            "owner_id": "merchant-03",
            "name": "Bún Bò Huế Cố Đô Đông Ba",
            "address": "207 Nguyễn Văn Cừ, Quận 5, TP.HCM",
            "latitude": 10.7615,
            "longitude": 106.6822,
            "category": "Đặc Sản Miền Trung",
            "open_time": "06:30",
            "close_time": "22:00",
            "rating": 4.88,
            "banner_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
            "dishes": [
                ("Bún Bò Huế Đặc Biệt Thập Cẩm Giò Heo", "Nước dùng ruốc sả thơm nồng, bắp hoa, chả cua, móng giò heo mềm", 72000.0, "cooking-pot", "BESTSELLER", 620),
                ("Bún Bò Tái Bắp Hoa Chả Cua", "Bắp hoa bò giòn sần sật kết hợp chả cua nguyên chất giã tay xứ Huế", 62000.0, "soup", "ĐẶC BIỆT", 510),
                ("Bánh Bèo Chén Tôm Cháy Sa Tế (Khay 6 Chén)", "Bột gạo dẻo mịn rắc tôm cháy đỏ hồng, tóp mỡ da heo sốt mắm ớt", 38000.0, "utensils", "MÓN HUẾ", 320),
                ("Nem Lụi Nướng Than Bọc Sả (4 Cây)", "Nem giò sống quấn đầu sả nướng vàng, chấm sốt đậu phộng gan bùi béo", 45000.0, "flame", "THƠM LỨNG", 380),
                ("Nước Mơ Ngâm Chùa Hương Đá", "Mơ ngâm ủ đường phèn thanh chua kích thích vị giác", 22000.0, "cup-soda", "THANH MÁT", 110),
            ],
        },
        {
            "id": "rest-highlands-04",
            "owner_id": "merchant-04",
            "name": "Katinat & Cà Phê Thủ Công Sài Gòn",
            "address": "191 Hai Bà Trưng, Quận 3, TP.HCM",
            "latitude": 10.7856,
            "longitude": 106.6912,
            "category": "Trà Sữa & Cà Phê Thủ Công",
            "open_time": "07:00",
            "close_time": "23:00",
            "rating": 4.94,
            "banner_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
            "dishes": [
                ("Trà Sữa Chôm Chôm Nướng Kem Phô Mai", "Kem phô mai béo ngậy nướng cháy mặt trên nền trà sữa ô long đậm vị", 55000.0, "cup-soda", "BESTSELLER", 380),
                ("Cà Phê Sữa Đá Sài Gòn Pha Phin", "Robusta Buôn Ma Thuột rang mộc pha phin, sữa đặc ngọt dịu đậm đà", 35000.0, "coffee", "ĐẬM VỊ", 190),
                ("Trà Đào Hồng Đài Hạt Chia", "Hồng trà ủ lạnh thơm thanh, đào miếng giòn và hạt chia bổ dưỡng", 48000.0, "cup-soda", "HEALTHY", 160),
                ("Bánh Croissant Bơ Tỏi Phô Mai Nóng", "Bánh sừng bò ngàn lớp nướng nóng giòn quyện sốt bơ tỏi thơm lừng", 42000.0, "cake", "BÁNH TƯƠI", 310),
                ("Espresso Macchiato Đá Xay Caramel", "Cà phê đậm vị kết hợp sốt caramel muối bồng bềnh béo mịn", 52000.0, "coffee", "NGỌT NGÀO", 290),
            ],
        },
        {
            "id": "rest-crispy-burger-05",
            "owner_id": "merchant-05",
            "name": "Crispy Bro - Gà Rán Cay & Burger Mỹ",
            "address": "250 Nguyễn Tri Phương, Quận 10, TP.HCM",
            "latitude": 10.7672,
            "longitude": 106.6685,
            "category": "Burger & Gà Rán Mỹ",
            "open_time": "09:00",
            "close_time": "23:30",
            "rating": 4.82,
            "banner_url": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
            "dishes": [
                ("Burger Bò Phô Mai Khổng Lồ 2 Tầng", "2 lát bò Úc nướng lửa hồng, 2 lát phô mai Cheddar tan chảy, sốt BBQ khói", 79000.0, "sandwich", "BESTSELLER", 690),
                ("Gà Rán Cay Giòn Rụm Sốt Mật Ong Tỏi (2 Miếng)", "Gà tươi tẩm bột 11 gia vị chiên giòn tan rắc mè rang thơm nức", 68000.0, "drumstick", "SPICY & CRISP", 590),
                ("Burger Gà Giòn Cay Sốt Mayo Tỏi Ớt", "Ức gà phi lê chiên giòn kẹp rau xà lách tươi, dưa chuột muối giòn", 59000.0, "sandwich", "HOT", 530),
                ("Khoai Tây Chiên Lắc Phô Mai Rong Biển", "Khoai tây cọng Bỉ chiên vàng ươm lắc ngập bột phô mai mặn béo", 39000.0, "cookie", "ĂN VẶT", 340),
                ("Coca-Cola Tươi Ly Khổng Lồ Kèm Chanh Đá", "Nước ngọt có ga ướp lạnh đánh tan dầu mỡ sảng khoái", 20000.0, "cup-soda", "GIẢI KHÁT", 140),
            ],
        },
        {
            "id": "rest-green-healthy-06",
            "owner_id": "merchant-06",
            "name": "Green Bowl - Salad & Chay Dưỡng Sinh",
            "address": "45 Lê Thánh Tôn, Quận 1, TP.HCM",
            "latitude": 10.7781,
            "longitude": 106.7022,
            "category": "Healthy, Salad & Eat Clean",
            "open_time": "08:00",
            "close_time": "21:30",
            "rating": 4.91,
            "banner_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
            "dishes": [
                ("Salad Ức Gà Nướng Sốt Mè Rang Nhật Bản", "Ức gà thảo mộc xé sợi, xà lách xoăn, cà chua bi, trứng luộc và mè rang", 65000.0, "salad", "HIGH_PROTEIN", 340),
                ("Bún Gạo Lứt Trộn Nấm Đùi Gà & Đậu Hũ Non", "Bún lứt dai giòn sốt xì dầu tỏi ớt, nấm kho tiêu và đậu non chiên vàng", 55000.0, "leaf", "THUẦN CHAY", 310),
                ("Poke Bowl Cá Hồi Tươi Bơ Sáp & Trứng Tôm", "Cá hồi Na Uy sốt Ponzu mè, bơ sáp Đắk Lắk trên nền cơm gạo lứt", 89000.0, "fish", "CHEF_CHOICE", 450),
                ("Nước Ép Cần Tây Táo Xanh Detox Giữ Dáng", "Ép lạnh nguyên chất 100% không thêm đường thanh lọc cơ thể", 42000.0, "apple", "DETOX", 85),
                ("Sữa Hạt Hạnh Nhân Yến Mạch Dưỡng Nhan", "Sữa hạt organic nấu mới mỗi ngày giàu vitamin E và chất xơ hòa tan", 38000.0, "heart-pulse", "DINH DƯỠNG", 120),
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
        for idx, d_data in enumerate(r_data["dishes"], start=1):
            d_name, d_desc, d_price, d_cat = d_data[0], d_data[1], d_data[2], d_data[3]
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

    logger.info("Seeded 6 realistic Vietnamese restaurants and 30 authentic menu items.")
