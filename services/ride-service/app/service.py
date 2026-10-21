"""Ride Application Service orchestrating Pricing Strategies, Inter-Service Calls, WebSockets & Kafka Events."""

from typing import Any, Dict, List, Optional, Tuple

from app.ai_assistant import RideAIAssistant
from app.models import Ride
from app.pricing_strategy import RidePricingFactory
from app.repositories import RideRepository
from app.schemas import (
    CreateRideRequest,
    RideEstimateRequest,
    RideEstimateResponse,
    VehicleFareOption,
)
from app.websocket_manager import RideTrackingWebSocketManager
from services.common.cache.redis_client import RedisManager
from services.common.domain.base_service import BaseApplicationService
from services.common.exceptions import EntityNotFoundException
from services.common.http_client import InterServiceHttpClient
from services.common.messaging.interfaces import IEventPublisher


class RideApplicationService(BaseApplicationService[RideRepository]):
    """OOP Application Service encapsulating Ride booking, lifecycle transitions, and real-time tracking."""

    def __init__(
        self,
        repository: RideRepository,
        event_publisher: Optional[IEventPublisher],
        map_client: InterServiceHttpClient,
        promo_client: InterServiceHttpClient,
        ws_manager: RideTrackingWebSocketManager,
        ai_assistant: RideAIAssistant,
    ) -> None:
        super().__init__(repository=repository, event_publisher=event_publisher)
        self._map_client = map_client
        self._promo_client = promo_client
        self._ws_manager = ws_manager
        self._ai_assistant = ai_assistant

    async def _resolve_route_metrics(
        self,
        pickup_lat: float,
        pickup_lng: float,
        dropoff_lat: float,
        dropoff_lng: float,
    ) -> Tuple[float, float]:
        """Query map-service for route distance/duration with resilient Haversine fallback."""
        map_resp = await self._map_client.request(
            method="GET",
            path="/api/maps/route",
            params={
                "origin_lat": pickup_lat,
                "origin_lng": pickup_lng,
                "dest_lat": dropoff_lat,
                "dest_lng": dropoff_lng,
            },
            raise_on_error=False,
        )
        if map_resp and isinstance(map_resp, dict):
            dist = map_resp.get("distance_km")
            dur = map_resp.get("duration_minutes")
            if dist is not None and dur is not None and float(dist) > 0:
                return round(float(dist), 2), round(float(dur), 1)

        # Fallback: Great-circle Haversine distance * 1.25 road winding factor
        straight_km = RedisManager.haversine_km(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
        road_km = max(0.8, round(straight_km * 1.25, 2))
        duration_min = max(3.0, round((road_km / 25.0) * 60.0, 1))
        return road_km, duration_min

    async def _resolve_promo_discount(
        self,
        promo_code: Optional[str],
        order_amount: float,
        customer_id: Optional[str] = None,
    ) -> float:
        """Validate promo code via promo-service with deterministic local fallback."""
        if not promo_code or not promo_code.strip():
            return 0.0
        code = promo_code.strip().upper()
        promo_resp = await self._promo_client.request(
            method="POST",
            path="/api/promos/validate",
            json_body={
                "code": code,
                "order_amount": order_amount,
                "service_type": "ride",
                "user_id": customer_id or "guest",
            },
            raise_on_error=False,
        )
        if promo_resp and isinstance(promo_resp, dict):
            if "discount_amount" in promo_resp:
                return min(order_amount, max(0.0, round(float(promo_resp["discount_amount"]), 0)))

        # Built-in fallback promo rules when promo-service is unreachable
        if code in ("RIDEEAT20", "PROMO20", "GIAM20"):
            return min(30000.0, round(order_amount * 0.20, 0))
        if code in ("WELCOME50", "RIDEEAT50"):
            return min(50000.0, round(order_amount * 0.50, 0))
        if code in ("FREERIDE", "GIAM15K"):
            return min(order_amount, 15000.0)
        return 0.0

    async def estimate_fare(
        self,
        req: RideEstimateRequest,
        customer_id: Optional[str] = None,
    ) -> RideEstimateResponse:
        """Compute route distance/duration and polymorphic vehicle fare options."""
        distance_km, duration_minutes = await self._resolve_route_metrics(
            req.pickup_lat,
            req.pickup_lng,
            req.dropoff_lat,
            req.dropoff_lng,
        )
        options: List[VehicleFareOption] = []
        selected_option: Optional[VehicleFareOption] = None
        requested_strategy = RidePricingFactory.create_strategy(
            req.vehicle_type,
            surge_multiplier=req.surge_multiplier,
        )

        for v_type in ("motorbike", "car_4", "car_7"):
            strategy = RidePricingFactory.create_strategy(
                v_type,
                surge_multiplier=req.surge_multiplier,
            )
            est_price = strategy.calculate_fare(distance_km, duration_minutes)
            discount = await self._resolve_promo_discount(req.promo_code, est_price, customer_id)
            final_price = max(0.0, round(est_price - discount, 0))
            opt = VehicleFareOption(
                vehicle_type=strategy.vehicle_type,
                base_fare=strategy.base_fare,
                per_km_rate=strategy.per_km_rate,
                per_minute_rate=strategy.per_minute_rate,
                surge_multiplier=req.surge_multiplier,
                estimated_price=est_price,
                discount_amount=discount,
                final_price=final_price,
            )
            options.append(opt)
            if strategy.vehicle_type == requested_strategy.vehicle_type:
                selected_option = opt

        return RideEstimateResponse(
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            surge_multiplier=req.surge_multiplier,
            selected_vehicle=selected_option or options[0],
            all_options=options,
        )

    async def create_ride(self, customer_id: str, req: CreateRideRequest) -> Ride:
        """Book a new ride, calculate price via Strategy/Decorator, persist, and emit 'ride.created'."""
        distance_km, duration_minutes = await self._resolve_route_metrics(
            req.pickup_lat,
            req.pickup_lng,
            req.dropoff_lat,
            req.dropoff_lng,
        )
        strategy = RidePricingFactory.create_strategy(
            req.vehicle_type,
            surge_multiplier=req.surge_multiplier,
        )
        estimated_price = strategy.calculate_fare(distance_km, duration_minutes)
        discount_amount = await self._resolve_promo_discount(
            req.promo_code,
            estimated_price,
            customer_id=customer_id,
        )
        final_price = max(0.0, round(estimated_price - discount_amount, 0))

        ride = Ride(
            customer_id=customer_id,
            pickup_address=req.pickup_address,
            pickup_lat=req.pickup_lat,
            pickup_lng=req.pickup_lng,
            dropoff_address=req.dropoff_address,
            dropoff_lat=req.dropoff_lat,
            dropoff_lng=req.dropoff_lng,
            vehicle_type=strategy.vehicle_type,
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            estimated_price=estimated_price,
            discount_amount=discount_amount,
            final_price=final_price,
            scheduled_at=req.scheduled_at,
            promo_code=req.promo_code.strip().upper() if req.promo_code else None,
            payment_method=req.payment_method,
            current_lat=req.pickup_lat,
            current_lng=req.pickup_lng,
        )
        saved = await self._repository.save(ride)

        await self.publish_domain_event(
            topic="ride.created",
            source_service="ride-service",
            payload={
                "ride_id": saved.id,
                "customer_id": saved.customer_id,
                "vehicle_type": saved.vehicle_type,
                "pickup_address": saved.pickup_address,
                "dropoff_address": saved.dropoff_address,
                "distance_km": saved.distance_km,
                "final_price": saved.final_price,
                "status": saved.status,
            },
        )
        return saved

    async def get_ride(self, ride_id: str) -> Ride:
        """Retrieve a ride by ID or raise EntityNotFoundException."""
        return await self._repository.get_by_id_or_raise(ride_id)

    async def list_rides_for_user(
        self,
        user_id: str,
        role: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Ride]:
        """Return rides filtered by role (customer, driver, or admin)."""
        if role == "driver":
            return await self._repository.list_by_driver(user_id, skip=skip, limit=limit)
        if role == "admin":
            return await self._repository.list_all(skip=skip, limit=limit)
        return await self._repository.list_by_customer(user_id, skip=skip, limit=limit)

    async def list_available_rides(self, vehicle_type: Optional[str] = None) -> List[Ride]:
        """List rides in 'searching' state available for drivers to accept."""
        return await self._repository.list_searching_rides(vehicle_type=vehicle_type)

    async def accept_ride(self, ride_id: str, driver_id: str) -> Ride:
        """Driver accepts a searching ride; broadcasts WebSocket update and publishes 'ride.accepted'."""
        ride = await self._repository.get_by_id_or_raise(ride_id)
        ride.accept(driver_id=driver_id)
        saved = await self._repository.save(ride)

        event_payload = {
            "ride_id": saved.id,
            "customer_id": saved.customer_id,
            "driver_id": saved.driver_id,
            "status": saved.status,
            "verification_otp": saved.verification_otp,
        }
        await self.publish_domain_event(
            topic="ride.accepted",
            source_service="ride-service",
            payload=event_payload,
        )
        await self._ws_manager.broadcast_to_ride(
            ride_id=saved.id,
            payload={"event": "ride.accepted", "ride": event_payload},
        )
        return saved

    async def start_ride(self, ride_id: str, otp_code: Optional[str] = None) -> Ride:
        """Transition ride to 'in_progress' after verifying OTP/QR and broadcast to WebSocket room."""
        ride = await self._repository.get_by_id_or_raise(ride_id)
        ride.start_ride(otp_code=otp_code)
        saved = await self._repository.save(ride)

        await self._ws_manager.broadcast_to_ride(
            ride_id=saved.id,
            payload={
                "event": "ride.started",
                "ride_id": saved.id,
                "status": saved.status,
                "driver_id": saved.driver_id,
            },
        )
        return saved

    async def update_ride_location(
        self,
        ride_id: str,
        latitude: float,
        longitude: float,
        heading: Optional[float] = None,
        speed_kmh: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Update driver live GPS coordinates and stream to connected WebSocket clients."""
        ride = await self._repository.get_by_id_or_raise(ride_id)
        ride.update_live_location(latitude=latitude, longitude=longitude)
        saved = await self._repository.save(ride)

        location_payload = {
            "event": "ride.location_updated",
            "ride_id": saved.id,
            "driver_id": saved.driver_id,
            "status": saved.status,
            "latitude": saved.current_lat,
            "longitude": saved.current_lng,
            "heading": heading,
            "speed_kmh": speed_kmh,
        }
        delivered = await self._ws_manager.broadcast_to_ride(saved.id, location_payload)
        location_payload["ws_clients_notified"] = delivered
        return location_payload

    async def complete_ride(self, ride_id: str) -> Ride:
        """Complete an in-progress ride, trigger payment/notification via 'ride.completed' Kafka event."""
        ride = await self._repository.get_by_id_or_raise(ride_id)
        ride.complete_ride()
        saved = await self._repository.save(ride)

        event_payload = {
            "ride_id": saved.id,
            "customer_id": saved.customer_id,
            "driver_id": saved.driver_id,
            "final_price": saved.final_price,
            "payment_method": saved.payment_method,
            "distance_km": saved.distance_km,
            "status": saved.status,
        }
        await self.publish_domain_event(
            topic="ride.completed",
            source_service="ride-service",
            payload=event_payload,
        )
        await self._ws_manager.broadcast_to_ride(
            ride_id=saved.id,
            payload={"event": "ride.completed", "ride": event_payload},
        )
        return saved

    async def cancel_ride(self, ride_id: str, reason: str) -> Ride:
        """Cancel a ride and publish 'ride.cancelled' event."""
        ride = await self._repository.get_by_id_or_raise(ride_id)
        ride.cancel_ride(reason=reason)
        saved = await self._repository.save(ride)

        event_payload = {
            "ride_id": saved.id,
            "customer_id": saved.customer_id,
            "driver_id": saved.driver_id,
            "reason": saved.cancel_reason,
            "status": saved.status,
        }
        await self.publish_domain_event(
            topic="ride.cancelled",
            source_service="ride-service",
            payload=event_payload,
        )
        await self._ws_manager.broadcast_to_ride(
            ride_id=saved.id,
            payload={"event": "ride.cancelled", "ride": event_payload},
        )
        return saved

    async def get_ride_by_share_token(self, share_token: str) -> Ride:
        """Retrieve a ride for public safety tracking via its unique share_token."""
        ride = await self._repository.get_by_share_token(share_token)
        if ride is None:
            raise EntityNotFoundException("RideShareToken", share_token)
        return ride

    async def ask_ai_support(
        self,
        question: str,
        distance_km: Optional[float] = None,
        duration_minutes: Optional[float] = None,
        surge_multiplier: float = 1.0,
    ) -> Dict[str, Any]:
        """Delegate customer support / fare inquiry to RideAIAssistant."""
        return await self._ai_assistant.answer_support_query(
            question=question,
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            surge_multiplier=surge_multiplier,
        )
