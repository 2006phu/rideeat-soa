"""Comprehensive Unit & Architectural Verification Suite for RideEat SOA (OOP & SOLID)."""

import ast
import importlib.util
import os
import sys
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

from services.common.cache.redis_client import (
    GeoLocation,
    ICacheProvider,
    IGeoSpatialProvider,
    RedisManager,
)
from services.common.exceptions import (
    BusinessRuleViolationException,
    DomainException,
    EntityNotFoundException,
    InsufficientBalanceException,
    InvalidStateTransitionException,
)
from services.common.messaging.interfaces import DomainEvent, IEventHandler, IEventPublisher
from services.common.messaging.kafka_bus import InMemoryEventBus, KafkaEventBus
from services.common.security.firebase_auth import (
    CurrentUser,
    FirebaseAuthVerifier,
    IAuthVerifier,
    UserRole,
)


def load_service_module(module_name: str, relative_path: str):
    full_path = os.path.join(ROOT_DIR, relative_path)
    spec = importlib.util.spec_from_file_location(module_name, full_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ride_pricing_mod = load_service_module(
    "ride_pricing_strategy",
    "services/ride-service/app/pricing_strategy.py",
)
promo_discount_mod = load_service_module(
    "promo_discount_strategy",
    "services/promo-service/app/discount_strategy.py",
)
user_qr_mod = load_service_module(
    "user_qr_generator",
    "services/user-service/app/qr_generator.py",
)
notif_channels_mod = load_service_module(
    "notif_channels",
    "services/notification-service/app/channels.py",
)


class SampleEventHandler(IEventHandler):
    """Concrete polymorphic event handler for testing Observer pattern."""

    def __init__(self) -> None:
        self.received_events: list[DomainEvent] = []

    @property
    def subscribed_topic(self) -> str:
        return "ride.created"

    async def handle(self, event: DomainEvent) -> None:
        self.received_events.append(event)


class TestRideEatOOPArchitecture(unittest.IsolatedAsyncioTestCase):
    """Verifies the 4 Pillars of OOP and Design Patterns across RideEat SOA."""

    @classmethod
    def setUpClass(cls) -> None:
        key_path = os.path.join(ROOT_DIR, "config", "firebase", "serviceAccountKey.json")
        if not os.path.exists(key_path):
            try:
                import json
                from cryptography.hazmat.primitives import serialization
                from cryptography.hazmat.primitives.asymmetric import rsa

                os.makedirs(os.path.dirname(key_path), exist_ok=True)
                priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
                pem = priv.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption(),
                ).decode("utf-8")
                dummy = {
                    "type": "service_account",
                    "project_id": "rideeat-ci-test",
                    "private_key_id": "ci-test-key",
                    "private_key": pem,
                    "client_email": "ci-test@rideeat-ci-test.iam.gserviceaccount.com",
                    "client_id": "1234567890",
                }
                with open(key_path, "w", encoding="utf-8") as f:
                    json.dump(dummy, f)
                cls._created_dummy_key = True
            except ImportError:
                cls._created_dummy_key = False
        else:
            cls._created_dummy_key = False

    def test_01_exception_inheritance_hierarchy(self) -> None:
        exc1 = EntityNotFoundException("Ride", "ride-123")
        exc2 = InvalidStateTransitionException("Ride", "completed", "accepted")
        exc3 = InsufficientBalanceException(50000, 120000)

        self.assertIsInstance(exc1, DomainException)
        self.assertIsInstance(exc2, DomainException)
        self.assertIsInstance(exc3, BusinessRuleViolationException)
        self.assertIsInstance(exc3, DomainException)
        self.assertEqual(exc1.status_code, 404)
        self.assertEqual(exc2.status_code, 409)
        self.assertEqual(exc3.status_code, 422)

    def test_02_auth_verifier_abstraction_and_encapsulation(self) -> None:
        verifier: IAuthVerifier = FirebaseAuthVerifier()
        token = verifier.create_signed_token(
            uid="user-001",
            email="customer@rideeat.vn",
            role="customer",
            name="Nguyen Van A",
        )
        principal: CurrentUser = verifier.verify_token(token)
        self.assertEqual(principal.uid, "user-001")
        self.assertEqual(principal.role, UserRole.CUSTOMER)
        self.assertTrue(principal.has_role(UserRole.CUSTOMER))
        self.assertFalse(principal.has_role(UserRole.DRIVER))

    async def test_03_redis_manager_polymorphic_interfaces(self) -> None:
        manager = RedisManager("redis://localhost:6399/0")
        self.assertIsInstance(manager, ICacheProvider)
        self.assertIsInstance(manager, IGeoSpatialProvider)

        await manager.set_json("menu:rest-1", {"items": ["Pho", "Bun Bo"]}, ttl_seconds=60)
        cached = await manager.get_json("menu:rest-1")
        self.assertEqual(cached["items"][0], "Pho")

        await manager.geo_add("drivers:motorbike", "driver-1", 10.7769, 106.7009)
        await manager.geo_add("drivers:motorbike", "driver-2", 10.7800, 106.6990)
        await manager.geo_add("drivers:motorbike", "driver-far", 10.9500, 106.8500)

        nearby: list[GeoLocation] = await manager.geo_search_nearby(
            "drivers:motorbike", 10.7769, 106.7009, radius_km=5.0
        )
        self.assertEqual(len(nearby), 2)
        self.assertEqual(nearby[0].member_id, "driver-1")

    async def test_04_kafka_event_bus_observer_polymorphism(self) -> None:
        bus: IEventPublisher = InMemoryEventBus("ride-service")
        handler = SampleEventHandler()
        bus.register_handler(handler)

        event = DomainEvent(
            topic="ride.created",
            source_service="ride-service",
            payload={"ride_id": "r-100", "customer_id": "c-01"},
        )
        published = await bus.publish(event)
        self.assertTrue(published)
        self.assertEqual(len(handler.received_events), 1)
        self.assertEqual(handler.received_events[0].payload["ride_id"], "r-100")

    def test_05_ride_pricing_strategy_decorator_and_factory(self) -> None:
        factory = ride_pricing_mod.RidePricingFactory
        iface = ride_pricing_mod.IRidePricingStrategy

        bike_strat = factory.create_strategy("motorbike", surge_multiplier=1.0)
        car4_strat = factory.create_strategy("car_4", surge_multiplier=1.0)
        car7_surge = factory.create_strategy("car_7", surge_multiplier=1.5)

        self.assertIsInstance(bike_strat, iface)
        self.assertIsInstance(car4_strat, iface)
        self.assertIsInstance(car7_surge, iface)

        # 5 km, 10 mins:
        # Motorbike: 12000 + 5*4500 + 10*300 = 37500
        self.assertEqual(bike_strat.calculate_fare(5.0, 10.0), 37500.0)
        # Car 4: 25000 + 5*11000 + 10*500 = 85000
        self.assertEqual(car4_strat.calculate_fare(5.0, 10.0), 85000.0)
        # Car 7 with 1.5x surge: (30000 + 5*14000 + 10*600) * 1.5 = 106000 * 1.5 = 159000
        self.assertEqual(car7_surge.calculate_fare(5.0, 10.0), 159000.0)

        with self.assertRaises(BusinessRuleViolationException):
            factory.create_strategy("helicopter")

    def test_06_promo_discount_strategy_and_factory(self) -> None:
        factory = promo_discount_mod.DiscountStrategyFactory
        pct_strat = factory.get_strategy("percentage")
        fix_strat = factory.get_strategy("fixed")

        # 20% of 200,000 capped at 30,000 -> 30,000
        self.assertEqual(pct_strat.compute_discount(200000.0, 20.0, max_discount=30000.0), 30000.0)
        # Fixed 15,000 on 50,000 -> 15,000
        self.assertEqual(fix_strat.compute_discount(50000.0, 15000.0), 15000.0)

    def test_07_qr_code_generator_encapsulation(self) -> None:
        qr_gen = user_qr_mod.QRCodeGenerator()
        result = qr_gen.generate_driver_qr(
            driver_id="drv-001",
            user_id="usr-driver-1",
            license_plate="59-X1 123.45",
            vehicle_type="motorbike",
            status="approved",
        )
        self.assertEqual(result["subject_id"], "drv-001")
        self.assertTrue(result["qr_svg"].startswith("<svg"))
        self.assertTrue(result["qr_data_uri"].startswith("data:image/svg+xml;base64,"))
        self.assertTrue(result["qr_payload"]["metadata"]["verified"])

    async def test_08_composite_notification_channels(self) -> None:
        dispatcher = notif_channels_mod.CompositeNotificationDispatcher(
            channels=[
                notif_channels_mod.FCMNotificationChannel(),
                notif_channels_mod.EmailNotificationChannel(),
            ]
        )
        self.assertIsInstance(dispatcher, notif_channels_mod.INotificationChannel)
        sent = await dispatcher.send(
            recipient_id="cust-001",
            title="Tài xế đang đến!",
            body="Bác tài Nguyễn Văn B sẽ đón bạn trong 3 phút.",
            metadata={"ride_id": "r-101"},
        )
        self.assertTrue(sent)

    def test_09_all_nine_microservices_oop_structure(self) -> None:
        expected_services = [
            "auth-service",
            "user-service",
            "ride-service",
            "food-service",
            "map-service",
            "payment-service",
            "rating-service",
            "promo-service",
            "notification-service",
        ]
        for svc in expected_services:
            svc_dir = os.path.join(ROOT_DIR, "services", svc, "app")
            self.assertTrue(os.path.isdir(svc_dir), f"Missing app dir for {svc}")
            for req_file in ["main.py", "routes.py", "schemas.py", "service.py"]:
                fpath = os.path.join(svc_dir, req_file)
                self.assertTrue(os.path.isfile(fpath), f"Missing {req_file} in {svc}")

            # Verify service.py defines an OOP ApplicationService class
            with open(os.path.join(svc_dir, "service.py"), "r", encoding="utf-8") as f:
                tree = ast.parse(f.read())
            class_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
            self.assertTrue(
                any("Service" in cname for cname in class_names),
                f"No OOP Service class found in {svc}/app/service.py",
            )


if __name__ == "__main__":
    unittest.main()
