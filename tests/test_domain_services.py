"""Unit Test Suite for Core Domain Services: Ride, Food & Map (Step 3 Test Gate)."""

import os
import sys
import unittest
from datetime import datetime, timezone
import importlib.util

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

from services.common.cache.redis_client import RedisManager
from services.common.contracts.dtos import FoodOrderSummaryDTO, RideEstimateDTO
from services.common.contracts.enums import OrderStatus, RideStatus, VehicleType
from services.common.exceptions import (
    BusinessRuleViolationException,
    InvalidStateTransitionException,
)

# Load modules using absolute paths to avoid hyphen-in-package issues
def load_module(mod_name: str, rel_path: str):
    full_path = os.path.join(ROOT_DIR, rel_path)
    service_root = os.path.dirname(os.path.dirname(full_path))
    # Purge cached 'app' package so the new service's 'app' is cleanly resolved
    for key in list(sys.modules.keys()):
        if key == "app" or key.startswith("app."):
            sys.modules.pop(key, None)
    if service_root in sys.path:
        sys.path.remove(service_root)
    sys.path.insert(0, service_root)
    spec = importlib.util.spec_from_file_location(mod_name, full_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ride_models = load_module("ride_models", "services/ride-service/app/models.py")
ride_pricing = load_module("ride_pricing", "services/ride-service/app/pricing_strategy.py")
food_models = load_module("food_models", "services/food-service/app/models.py")
map_adapters = load_module("map_adapters", "services/map-service/app/adapters.py")


class TestCoreDomainServices(unittest.IsolatedAsyncioTestCase):
    """Step 3 Test Gate: Verifies Ride State Machine, Food State Machine, Pricing Strategy & Map Geometry."""

    def test_01_ride_state_machine_happy_path(self) -> None:
        """Verifies full lifecycle: searching -> accepted -> in_progress -> completed."""
        ride = ride_models.Ride(
            id="ride-lifecycle-1",
            customer_id="cust-01",
            pickup_address="Cho Ben Thanh, Q1",
            pickup_lat=10.7725,
            pickup_lng=106.6980,
            dropoff_address="Landmark 81, Binh Thanh",
            dropoff_lat=10.7950,
            dropoff_lng=106.7218,
            vehicle_type="motorbike",
            distance_km=4.2,
            duration_minutes=12.0,
            estimated_price=35000.0,
            final_price=35000.0,
            status=ride_models.RideStatus.SEARCHING.value,
            verification_otp="1234",
            share_token="token-abc",
        )
        self.assertEqual(ride.status, "searching")

        # 1. Accept ride
        ride.accept(driver_id="driver-88")
        self.assertEqual(ride.status, "accepted")
        self.assertEqual(ride.driver_id, "driver-88")
        self.assertEqual(ride.current_lat, 10.7725)

        # 2. Update GPS coordinates during accepted state
        ride.update_live_location(10.7730, 106.6985)
        self.assertEqual(ride.current_lat, 10.7730)

        # 3. Start ride with verified OTP
        ride.start_ride(otp_code="1234")
        self.assertEqual(ride.status, "in_progress")

        # 4. Complete ride
        ride.complete_ride()
        self.assertEqual(ride.status, "completed")
        self.assertEqual(ride.current_lat, 10.7950)
        self.assertEqual(ride.current_lng, 106.7218)

    def test_02_ride_state_machine_invalid_transitions(self) -> None:
        """Verifies domain rules prevent invalid state transitions and invalid OTP."""
        ride = ride_models.Ride(
            id="ride-invalid-1",
            customer_id="cust-01",
            pickup_address="A",
            pickup_lat=10.7,
            pickup_lng=106.7,
            dropoff_address="B",
            dropoff_lat=10.8,
            dropoff_lng=106.8,
            status=ride_models.RideStatus.SEARCHING.value,
            verification_otp="9999",
        )

        # Cannot complete a ride that is still searching
        with self.assertRaises(InvalidStateTransitionException):
            ride.complete_ride()

        # Cannot accept without driver_id
        with self.assertRaises(BusinessRuleViolationException):
            ride.accept(driver_id="")

        ride.accept(driver_id="driver-01")

        # Wrong OTP rejected
        with self.assertRaises(BusinessRuleViolationException):
            ride.start_ride(otp_code="0000")

        # Cancel from accepted state
        ride.cancel_ride(reason="Customer changed mind")
        self.assertEqual(ride.status, "cancelled")

        # Cannot restart or accept a cancelled ride
        with self.assertRaises(InvalidStateTransitionException):
            ride.accept(driver_id="driver-02")

    def test_03_ride_to_estimate_dto_contract(self) -> None:
        """Verifies Ride entity exports a valid strongly-typed RideEstimateDTO."""
        ride = ride_models.Ride(
            id="ride-dto-1",
            customer_id="cust-01",
            pickup_address="Chợ Bến Thành",
            pickup_lat=10.7725,
            pickup_lng=106.6980,
            dropoff_address="Landmark 81",
            dropoff_lat=10.7950,
            dropoff_lng=106.7218,
            vehicle_type="car_4",
            distance_km=4.5,
            duration_minutes=12.0,
            estimated_price=85000.0,
            final_price=85000.0,
        )
        dto: RideEstimateDTO = ride.to_estimate_dto()
        self.assertEqual(dto.vehicle_type, VehicleType.CAR_4)
        self.assertEqual(dto.distance_km, 4.5)
        self.assertEqual(dto.total_fare, 85000.0)
        self.assertEqual(dto.origin.address, "Chợ Bến Thành")

    def test_04_food_order_state_machine_lifecycle(self) -> None:
        """Verifies food order state machine: pending -> confirmed -> preparing -> delivering -> completed."""
        order = food_models.FoodOrder(
            id="ord-lifecycle-1",
            customer_id="cust-02",
            restaurant_id="rest-01",
            items_json='[{"item_id": "dish-1", "name": "Pho Bo", "price": 55000, "qty": 2}]',
            subtotal=110000.0,
            delivery_fee=15000.0,
            total_amount=125000.0,
            delivery_address="123 Nguyen Trai, Q5",
            delivery_lat=10.7550,
            delivery_lng=106.6750,
            status=food_models.FoodOrderStatus.PENDING.value,
        )
        self.assertEqual(order.status, "pending")
        self.assertEqual(len(order.items), 1)

        # 1. Restaurant confirms
        order.confirm_by_restaurant()
        self.assertEqual(order.status, "confirmed")

        # 2. Kitchen prepares
        order.mark_preparing()
        self.assertEqual(order.status, "preparing")

        # 3. Assign driver
        order.assign_driver(driver_id="driver-food-1")
        self.assertEqual(order.status, "delivering")
        self.assertEqual(order.driver_id, "driver-food-1")

        # 4. Delivery completed
        order.complete_delivery()
        self.assertEqual(order.status, "completed")

        # 5. Export summary DTO
        dto: FoodOrderSummaryDTO = order.to_summary_dto("Pho 24")
        self.assertEqual(dto.order_id, "ord-lifecycle-1")
        self.assertEqual(dto.restaurant_name, "Pho 24")
        self.assertEqual(dto.total_amount, 125000.0)

    def test_05_food_order_invalid_transitions(self) -> None:
        """Verifies invalid transitions on FoodOrder entity."""
        order = food_models.FoodOrder(
            id="ord-inv-1",
            customer_id="cust-02",
            restaurant_id="rest-01",
            status=food_models.FoodOrderStatus.PENDING.value,
        )
        # Cannot complete order directly from pending
        with self.assertRaises(InvalidStateTransitionException):
            order.complete_delivery()

        # Cannot assign driver with empty ID
        order.confirm_by_restaurant()
        with self.assertRaises(BusinessRuleViolationException):
            order.assign_driver(driver_id="")

    def test_06_pricing_strategy_calculation_and_surge(self) -> None:
        """Verifies base fare formulas and surge decorator boundaries."""
        factory = ride_pricing.RidePricingFactory

        # Bike: 12,000 + (3.0 * 4,500) + (10.0 * 300) = 12,000 + 13,500 + 3,000 = 28,500
        bike = factory.create_strategy("motorbike", surge_multiplier=1.0)
        self.assertEqual(bike.calculate_fare(3.0, 10.0), 28500.0)

        # Car 4: 25,000 + (3.0 * 11,000) + (10.0 * 500) = 25,000 + 33,000 + 5,000 = 63,000
        car4 = factory.create_strategy("car_4", surge_multiplier=1.0)
        self.assertEqual(car4.calculate_fare(3.0, 10.0), 63000.0)

        # Car 4 with 2.0x surge = 126,000
        car4_surge = factory.create_strategy("car_4", surge_multiplier=2.0)
        self.assertEqual(car4_surge.calculate_fare(3.0, 10.0), 126000.0)

        # Surge out of bounds (< 1.0 or > 5.0) raises error
        with self.assertRaises(BusinessRuleViolationException):
            factory.create_strategy("motorbike", surge_multiplier=0.8)
        with self.assertRaises(BusinessRuleViolationException):
            factory.create_strategy("motorbike", surge_multiplier=6.0)

    async def test_07_map_haversine_and_landmark_fallback(self) -> None:
        """Verifies great-circle Haversine distance and Nominatim/OSRM landmark routing."""
        # Distance between Ben Thanh (10.7725, 106.6980) and Landmark 81 (10.7950, 106.7218)
        dist = RedisManager.haversine_km(10.7725, 106.6980, 10.7950, 106.7218)
        self.assertGreater(dist, 2.5)
        self.assertLess(dist, 4.5)

        # Symmetric
        dist_rev = RedisManager.haversine_km(10.7950, 106.7218, 10.7725, 106.6980)
        self.assertAlmostEqual(dist, dist_rev, places=4)

        # Distance to same point is 0
        self.assertEqual(RedisManager.haversine_km(10.7725, 106.6980, 10.7725, 106.6980), 0.0)

        # OSRM Route Adapter returns valid road distance and waypoints polyline
        router = map_adapters.OSRMRoutingAdapter()
        route = await router.calculate_route(10.7725, 106.6980, 10.7950, 106.7218)
        self.assertGreater(route.distance_km, 2.0)
        self.assertGreater(route.duration_minutes, 1.0)
        self.assertTrue(len(route.polyline) >= 2)
        self.assertTrue(len(route.waypoints) >= 2)

        # Nominatim Geocoder resolves landmarks
        geocoder = map_adapters.NominatimGeocodingAdapter()
        geo_res = await geocoder.geocode("Cho Ben Thanh")
        self.assertAlmostEqual(geo_res.latitude, 10.7725, places=2)
        self.assertAlmostEqual(geo_res.longitude, 106.6980, places=2)


if __name__ == "__main__":
    unittest.main()
