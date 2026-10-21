"""FastAPI REST & WebSocket Routes for Food Service (Port 8004)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import FoodOrderRepository, MenuItemRepository, RestaurantRepository
from app.schemas import (
    AssignDriverRequest,
    CancelFoodOrderRequest,
    CartAddItemRequest,
    CreateFoodOrderRequest,
    CreateMenuItemRequest,
    CreateRestaurantRequest,
    FoodAIRecommendRequest,
    FoodOrderResponse,
    MenuItemResponse,
    RestaurantResponse,
    ToggleRestaurantOpenRequest,
    UpdateMenuItemRequest,
)
from app.service import FoodApplicationService
from services.common.security.firebase_auth import CurrentUser, get_current_user

router = APIRouter(tags=["Food & Restaurants"])


async def get_db_session(request: Request):
    """Yield an AsyncSession from the app state's DatabaseManager."""
    db_manager = request.app.state.db_manager
    async for session in db_manager.get_session():
        yield session


def get_food_service(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> FoodApplicationService:
    """Constructor Dependency Injection factory for FoodApplicationService."""
    return FoodApplicationService(
        order_repository=FoodOrderRepository(session=session),
        restaurant_repository=RestaurantRepository(session=session),
        menu_repository=MenuItemRepository(session=session),
        cache_provider=request.app.state.redis_manager,
        cart_manager=request.app.state.cart_manager,
        event_publisher=request.app.state.event_bus,
        promo_client=request.app.state.promo_client,
        ws_manager=request.app.state.ws_manager,
        ai_recommender=request.app.state.ai_recommender,
    )


# --- Restaurant & Menu Endpoints ---


@router.get("/api/food/restaurants", response_model=List[RestaurantResponse])
async def list_restaurants(
    category: Optional[str] = Query(default=None),
    only_open: bool = Query(default=False),
    search: Optional[str] = Query(default=None),
    service: FoodApplicationService = Depends(get_food_service),
) -> List[RestaurantResponse]:
    """List partner restaurants with optional category, search, and open status filters."""
    restaurants = await service.list_restaurants(
        category=category,
        only_open=only_open,
        search=search,
    )
    return [RestaurantResponse.model_validate(r) for r in restaurants]


@router.post(
    "/api/food/restaurants",
    response_model=RestaurantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_restaurant(
    payload: CreateRestaurantRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> RestaurantResponse:
    """Register a new partner restaurant."""
    restaurant = await service.create_restaurant(owner_id=current_user.uid, req=payload)
    return RestaurantResponse.model_validate(restaurant)


@router.get("/api/food/restaurants/{restaurant_id}", response_model=RestaurantResponse)
async def get_restaurant(
    restaurant_id: str,
    service: FoodApplicationService = Depends(get_food_service),
) -> RestaurantResponse:
    """Retrieve details of a specific restaurant."""
    restaurant = await service.get_restaurant(restaurant_id)
    return RestaurantResponse.model_validate(restaurant)


@router.patch("/api/food/restaurants/{restaurant_id}/open", response_model=RestaurantResponse)
async def toggle_restaurant_open(
    restaurant_id: str,
    payload: ToggleRestaurantOpenRequest,
    service: FoodApplicationService = Depends(get_food_service),
) -> RestaurantResponse:
    """Toggle open/closed state of a restaurant."""
    restaurant = await service.toggle_restaurant_open(restaurant_id, payload.is_open)
    return RestaurantResponse.model_validate(restaurant)


@router.get("/api/food/restaurants/{restaurant_id}/menu")
async def get_restaurant_menu(
    restaurant_id: str,
    service: FoodApplicationService = Depends(get_food_service),
) -> List[Dict[str, Any]]:
    """Retrieve a restaurant's menu (cached in Redis for fast reads)."""
    return await service.get_restaurant_menu(restaurant_id)


@router.post(
    "/api/food/restaurants/{restaurant_id}/menu",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_menu_item(
    restaurant_id: str,
    payload: CreateMenuItemRequest,
    service: FoodApplicationService = Depends(get_food_service),
) -> MenuItemResponse:
    """Add a new dish/beverage to a restaurant's menu and invalidate Redis menu cache."""
    item = await service.add_menu_item(restaurant_id, payload)
    return MenuItemResponse.model_validate(item)


@router.patch(
    "/api/food/restaurants/{restaurant_id}/menu/{item_id}",
    response_model=MenuItemResponse,
)
async def update_menu_item(
    restaurant_id: str,
    item_id: str,
    payload: UpdateMenuItemRequest,
    service: FoodApplicationService = Depends(get_food_service),
) -> MenuItemResponse:
    """Update dish price or availability and invalidate Redis menu cache."""
    item = await service.update_menu_item(restaurant_id, item_id, payload)
    return MenuItemResponse.model_validate(item)


# --- Redis Shopping Cart Endpoints ---


@router.get("/api/food/cart")
async def get_cart(
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> Dict[str, Any]:
    """Retrieve the authenticated user's Redis shopping cart."""
    return await service.get_user_cart(current_user.uid)


@router.post("/api/food/cart")
async def add_item_to_cart(
    payload: CartAddItemRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> Dict[str, Any]:
    """Add or increment a menu item in the user's Redis shopping cart (30-min TTL)."""
    return await service.add_to_cart(current_user.uid, payload)


@router.delete("/api/food/cart/items/{menu_item_id}")
async def remove_item_from_cart(
    menu_item_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> Dict[str, Any]:
    """Remove a specific menu item from the user's cart."""
    return await service.remove_from_cart(current_user.uid, menu_item_id)


@router.delete("/api/food/cart")
async def clear_cart(
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> Dict[str, Any]:
    """Clear all items from the user's Redis shopping cart."""
    return await service.clear_user_cart(current_user.uid)


# --- Food Order Lifecycle Endpoints ---


@router.post(
    "/api/food/orders",
    response_model=FoodOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_food_order(
    payload: CreateFoodOrderRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> FoodOrderResponse:
    """Place a new food delivery order from cart or explicit items."""
    order = await service.create_order(customer_id=current_user.uid, req=payload)
    return FoodOrderResponse.model_validate(order)


@router.get("/api/food/orders", response_model=List[FoodOrderResponse])
async def list_food_orders(
    restaurant_id: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> List[FoodOrderResponse]:
    """List food orders filtered by user role or restaurant_id."""
    orders = await service.list_orders_for_user(
        user_id=current_user.uid,
        role=current_user.role.value,
        restaurant_id=restaurant_id,
        skip=skip,
        limit=limit,
    )
    return [FoodOrderResponse.model_validate(o) for o in orders]


@router.get("/api/food/orders/{order_id}", response_model=FoodOrderResponse)
async def get_food_order(
    order_id: str,
    service: FoodApplicationService = Depends(get_food_service),
) -> FoodOrderResponse:
    """Retrieve a specific food order by ID."""
    order = await service.get_order(order_id)
    return FoodOrderResponse.model_validate(order)


@router.post("/api/food/orders/{order_id}/confirm", response_model=FoodOrderResponse)
async def confirm_food_order(
    order_id: str,
    service: FoodApplicationService = Depends(get_food_service),
) -> FoodOrderResponse:
    """Restaurant confirms a pending food order and publishes 'order.confirmed'."""
    order = await service.confirm_order(order_id)
    return FoodOrderResponse.model_validate(order)


@router.post("/api/food/orders/{order_id}/assign-driver", response_model=FoodOrderResponse)
async def assign_driver_to_order(
    order_id: str,
    payload: Optional[AssignDriverRequest] = None,
    current_user: CurrentUser = Depends(get_current_user),
    service: FoodApplicationService = Depends(get_food_service),
) -> FoodOrderResponse:
    """Assign delivery driver and transition order to 'delivering'."""
    driver_id = (payload.driver_id if payload and payload.driver_id else None) or current_user.uid
    order = await service.assign_driver(order_id=order_id, driver_id=driver_id)
    return FoodOrderResponse.model_validate(order)


@router.post("/api/food/orders/{order_id}/complete", response_model=FoodOrderResponse)
async def complete_food_order(
    order_id: str,
    service: FoodApplicationService = Depends(get_food_service),
) -> FoodOrderResponse:
    """Complete food delivery and publish 'order.completed'."""
    order = await service.complete_order(order_id)
    return FoodOrderResponse.model_validate(order)


@router.post("/api/food/orders/{order_id}/cancel", response_model=FoodOrderResponse)
async def cancel_food_order(
    order_id: str,
    payload: Optional[CancelFoodOrderRequest] = None,
    service: FoodApplicationService = Depends(get_food_service),
) -> FoodOrderResponse:
    """Cancel a pending/confirmed/preparing food order and publish 'order.cancelled'."""
    reason = payload.reason if payload else "Cancelled by customer"
    order = await service.cancel_order(order_id=order_id, reason=reason)
    return FoodOrderResponse.model_validate(order)


# --- AI Culinary Recommendation & WebSocket Endpoints ---


@router.post("/api/food/ai-recommend")
async def recommend_food_ai(
    payload: FoodAIRecommendRequest,
    service: FoodApplicationService = Depends(get_food_service),
) -> Dict[str, Any]:
    """AI-powered dish & restaurant recommendation based on mood, weather, and budget."""
    return await service.get_ai_recommendation(
        mood=payload.mood,
        weather=payload.weather,
        budget_vnd=payload.budget_vnd,
    )


@router.websocket("/ws/orders/{order_id}")
async def order_tracking_websocket(websocket: WebSocket, order_id: str) -> None:
    """Real-time WebSocket stream for FoodOrder status transitions and delivery updates."""
    ws_manager = websocket.app.state.ws_manager
    await ws_manager.connect(order_id, websocket)
    try:
        await websocket.send_json({"event": "ws.connected", "order_id": order_id})
        while True:
            msg = await websocket.receive_json()
            if isinstance(msg, dict):
                await ws_manager.broadcast_to_order(
                    order_id=order_id,
                    payload={"event": "order.live_update", "order_id": order_id, "data": msg},
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(order_id, websocket)
    except Exception:
        ws_manager.disconnect(order_id, websocket)
