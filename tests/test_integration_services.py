"""Integration and Unit Test Suite for Step 4 Services: Payment, Promo, Notification & Rating.

Verifies:
1. Polymorphic Payment Gateway Strategies & Adapters (Cash, Wallet, MockGateway, VNPay, MoMo, CreditCard).
2. Encapsulated Wallet Ledger with Invariant Enforcement (deposit, debit, InsufficientBalanceException).
3. Payment Transaction Lifecycle & Strongly Typed Kafka Event Contract Serialization.
4. Promotional Discount Strategies (Percentage with max cap, Fixed VND discount) & Factory.
5. Voucher Domain Entity Validation (min_order_value, expired, inactive, usage quota).
6. Loyalty Account progression and automatic tier advancement (Bronze, Silver, Gold, Platinum).
7. Rating & Review domain invariants (1-5 star constraints, target type validation).
8. Composite Notification Dispatcher multi-channel broadcasting (WebSocket, FCM, Email).
"""

import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from services.common.contracts.enums import PaymentMethod, PaymentStatus
from services.common.contracts.events import PaymentCompletedEventPayload
from services.common.exceptions import (
    BusinessRuleViolationException,
    InsufficientBalanceException,
    InvalidStateTransitionException,
)

# Helper to load a microservice's modules cleanly
def load_service(service_name: str, module_names: list[str]):
    service_dir = os.path.join(ROOT_DIR, "services", service_name)
    # Purge any previously cached 'app' package so the new service resolves cleanly
    for k in list(sys.modules.keys()):
        if k == "app" or k.startswith("app."):
            sys.modules.pop(k, None)
    sys.path.insert(0, service_dir)
    modules = []
    for mod_name in module_names:
        mod = __import__(f"app.{mod_name}", fromlist=[mod_name])
        modules.append(mod)
    sys.path.remove(service_dir)
    for k in list(sys.modules.keys()):
        if k == "app" or k.startswith("app."):
            sys.modules.pop(k, None)
    return modules


payment_mods = load_service("payment-service", ["models", "payment_strategy"])
payment_models, payment_strategy = payment_mods[0], payment_mods[1]

promo_mods = load_service("promo-service", ["models", "discount_strategy"])
promo_models, promo_strategy = promo_mods[0], promo_mods[1]

rating_mods = load_service("rating-service", ["models"])
rating_models = rating_mods[0]

notification_mods = load_service("notification-service", ["channels"])
notification_channels = notification_mods[0]


class TestIntegrationServices(unittest.IsolatedAsyncioTestCase):
    """Step 4 Test Gate: Payment, Promo, Rating and Notification services integration."""

    def test_01_payment_strategy_factory_and_adapters(self) -> None:
        """Verifies polymorphic strategy resolution and adapter instantiation."""
        factory = payment_strategy.PaymentStrategyFactory

        cash_strat = factory.get_strategy("cash")
        self.assertIsInstance(cash_strat, payment_strategy.CashPaymentStrategy)

        wallet_strat = factory.get_strategy("wallet")
        self.assertIsInstance(wallet_strat, payment_strategy.WalletPaymentStrategy)

        vnpay_strat = factory.get_strategy("vnpay")
        self.assertIsInstance(vnpay_strat, payment_strategy.VNPayPaymentAdapter)

        momo_strat = factory.get_strategy("momo")
        self.assertIsInstance(momo_strat, payment_strategy.MoMoPaymentAdapter)

        cc_strat = factory.get_strategy("credit_card")
        self.assertIsInstance(cc_strat, payment_strategy.CreditCardPaymentAdapter)

        with self.assertRaises(BusinessRuleViolationException):
            factory.get_strategy("unsupported_bitcoin_method")

    def test_02_wallet_deposit_debit_invariants(self) -> None:
        """Verifies encapsulated ledger invariants on Wallet domain entity."""
        wallet = payment_models.Wallet(
            id="wallet-test-01",
            user_id="user-ledger-1",
            balance=100_000.0,
            currency="VND",
        )

        # Deposit funds
        new_balance = wallet.deposit(50_000.0)
        self.assertEqual(new_balance, 150_000.0)
        self.assertEqual(wallet.balance, 150_000.0)

        # Debit funds
        new_balance = wallet.debit(70_000.0)
        self.assertEqual(new_balance, 80_000.0)

        # Invariant 1: Non-positive deposit is rejected
        with self.assertRaises(BusinessRuleViolationException):
            wallet.deposit(0)

        with self.assertRaises(BusinessRuleViolationException):
            wallet.deposit(-10_000)

        # Invariant 2: Non-positive debit is rejected
        with self.assertRaises(BusinessRuleViolationException):
            wallet.debit(-5000)

        # Invariant 3: Insufficient balance raises InsufficientBalanceException
        with self.assertRaises(InsufficientBalanceException) as ctx:
            wallet.debit(100_000.0)
        self.assertIn("Insufficient wallet balance", str(ctx.exception.message))

    def test_03_payment_transaction_lifecycle_and_contract_payload(self) -> None:
        """Verifies transaction state transitions and export to PaymentCompletedEventPayload."""
        tx = payment_models.PaymentTransaction(
            id="tx-lifecycle-99",
            user_id="user-42",
            reference_id="ride-777",
            reference_type=payment_models.ReferenceType.RIDE.value,
            transaction_type=payment_models.TransactionType.PAYMENT.value,
            payment_method=payment_models.PaymentMethod.WALLET.value,
            amount=85_000.0,
            status=payment_models.TransactionStatus.PENDING.value,
            description="Ride payment",
        )

        # Cannot refund a pending transaction
        with self.assertRaises(InvalidStateTransitionException):
            tx.mark_refunded()

        # Mark success
        tx.mark_success()
        self.assertEqual(tx.status, "success")

        # Export to strongly-typed Kafka event contract
        payload = tx.to_payment_completed_payload(invoice_number="INV-TX99")
        self.assertIsInstance(payload, PaymentCompletedEventPayload)
        self.assertEqual(payload.transaction_id, "tx-lifecycle-99")
        self.assertEqual(payload.invoice_number, "INV-TX99")
        self.assertEqual(payload.user_id, "user-42")
        self.assertEqual(payload.amount, 85_000.0)
        self.assertEqual(payload.status, PaymentStatus.SUCCESS)
        self.assertEqual(payload.payment_method, PaymentMethod.WALLET)

        # Transition to refunded
        tx.mark_refunded()
        self.assertEqual(tx.status, "refunded")

    def test_04_promo_discount_strategies_and_factory(self) -> None:
        """Verifies discount calculation with percentages, caps, and fixed amounts."""
        factory = promo_strategy.DiscountStrategyFactory

        pct_strat = factory.get_strategy("percentage")
        self.assertIsInstance(pct_strat, promo_strategy.PercentageDiscountStrategy)

        # 20% on 100,000 VND = 20,000 VND
        discount = pct_strat.compute_discount(order_amount=100_000.0, discount_value=20.0)
        self.assertEqual(discount, 20_000.0)

        # 20% on 500,000 VND with cap 50,000 VND = 50,000 VND (capped)
        discount_capped = pct_strat.compute_discount(
            order_amount=500_000.0, discount_value=20.0, max_discount=50_000.0
        )
        self.assertEqual(discount_capped, 50_000.0)

        # Fixed VND strategy
        fixed_strat = factory.get_strategy("fixed")
        self.assertIsInstance(fixed_strat, promo_strategy.FixedAmountDiscountStrategy)

        # Flat 30,000 VND on 100,000 VND order
        discount_fixed = fixed_strat.compute_discount(order_amount=100_000.0, discount_value=30_000.0)
        self.assertEqual(discount_fixed, 30_000.0)

        # Flat 150,000 VND on 80,000 VND order is capped at order amount
        discount_exceed = fixed_strat.compute_discount(order_amount=80_000.0, discount_value=150_000.0)
        self.assertEqual(discount_exceed, 80_000.0)

        with self.assertRaises(BusinessRuleViolationException):
            factory.get_strategy("invalid_discount_type")

    def test_05_voucher_applicability_and_consumption(self) -> None:
        """Verifies Voucher domain constraints (expiration, minimum spend, active status, usage limit)."""
        future_exp = datetime.now(timezone.utc) + timedelta(days=7)
        past_exp = datetime.now(timezone.utc) - timedelta(days=1)

        voucher = promo_models.Voucher(
            id="vouch-01",
            code="SUMMER20",
            title="Summer 20% off",
            discount_type="percentage",
            discount_value=20.0,
            min_order_value=100_000.0,
            max_discount=40_000.0,
            usage_limit=10,
            used_count=0,
            is_active=True,
            expires_at=future_exp,
        )

        # Spend 80,000 < min_order_value (100,000) raises exception
        with self.assertRaises(BusinessRuleViolationException):
            voucher.validate_applicable(order_amount=80_000.0)

        # Valid spend 150,000: discount is 20% * 150,000 = 30,000
        discount = voucher.calculate_discount(order_amount=150_000.0)
        self.assertEqual(discount, 30_000.0)

        # Valid consumption increments usage count
        voucher.consume(order_amount=150_000.0)
        self.assertEqual(voucher.used_count, 1)

        # Inactive voucher raises exception
        voucher.is_active = False
        with self.assertRaises(BusinessRuleViolationException):
            voucher.validate_applicable(order_amount=150_000.0)
        voucher.is_active = True

        # Expired voucher raises exception
        voucher.expires_at = past_exp
        with self.assertRaises(BusinessRuleViolationException):
            voucher.validate_applicable(order_amount=150_000.0)
        voucher.expires_at = future_exp

        # Quota exhausted raises exception
        voucher.used_count = 10
        with self.assertRaises(BusinessRuleViolationException):
            voucher.validate_applicable(order_amount=150_000.0)

    def test_06_loyalty_account_progression(self) -> None:
        """Verifies loyalty point accrual and automatic membership tier upgrading."""
        account = promo_models.LoyaltyAccount(
            id="loyalty-01",
            user_id="user-vip-1",
            points=0,
            tier=promo_models.LoyaltyTier.BRONZE.value,
        )
        self.assertEqual(account.tier, "bronze")

        # Earn 60 points from 600,000 VND spend -> silver (>= 50)
        earned = account.earn_points(600_000.0)
        self.assertEqual(earned, 60)
        self.assertEqual(account.points, 60)
        self.assertEqual(account.tier, "silver")

        # Earn 150 points from 1,500,000 VND spend -> total 210 -> gold (>= 200)
        account.earn_points(1_500_000.0)
        self.assertEqual(account.points, 210)
        self.assertEqual(account.tier, "gold")

        # Earn 300 points from 3,000,000 VND spend -> total 510 -> platinum (>= 500)
        account.earn_points(3_000_000.0)
        self.assertEqual(account.points, 510)
        self.assertEqual(account.tier, "platinum")

        # Redeem points
        with self.assertRaises(BusinessRuleViolationException):
            account.redeem_points(1000)  # Insufficient points

        account.redeem_points(350)
        self.assertEqual(account.points, 160)
        self.assertEqual(account.tier, "silver")

    def test_07_rating_service_invariants(self) -> None:
        """Verifies rating stars bounded between 1 and 5 and valid target type."""
        valid_review = rating_models.Review(
            id="rev-01",
            reviewer_id="user-01",
            target_id="driver-01",
            target_type="driver",
            reference_id="ride-123",
            stars=5,
            comment="Tuyệt vời!",
        )
        # Should not raise
        valid_review.validate_rating()

        # Invariant 1: Stars < 1 or > 5 rejected
        invalid_stars_zero = rating_models.Review(
            id="rev-02",
            reviewer_id="user-01",
            target_id="driver-01",
            target_type="driver",
            reference_id="ride-123",
            stars=0,
        )
        with self.assertRaises(BusinessRuleViolationException):
            invalid_stars_zero.validate_rating()

        invalid_stars_six = rating_models.Review(
            id="rev-03",
            reviewer_id="user-01",
            target_id="driver-01",
            target_type="driver",
            reference_id="ride-123",
            stars=6,
        )
        with self.assertRaises(BusinessRuleViolationException):
            invalid_stars_six.validate_rating()

        # Invariant 2: Invalid target_type rejected
        invalid_target = rating_models.Review(
            id="rev-04",
            reviewer_id="user-01",
            target_id="unknown-01",
            target_type="helicopter",
            reference_id="ride-123",
            stars=4,
        )
        with self.assertRaises(BusinessRuleViolationException):
            invalid_target.validate_rating()

    async def test_08_composite_notification_dispatcher(self) -> None:
        """Verifies polymorphic multi-channel dispatching via Composite Pattern."""
        dispatcher = notification_channels.CompositeNotificationDispatcher()

        class MockChannel(notification_channels.INotificationChannel):
            def __init__(self, name: str) -> None:
                self._name = name
                self.sent_messages = []

            @property
            def channel_name(self) -> str:
                return self._name

            async def send(self, recipient_id: str, title: str, body: str, metadata: dict) -> bool:
                self.sent_messages.append({"recipient": recipient_id, "title": title, "body": body})
                return True

        mock_email = MockChannel("email")
        mock_fcm = MockChannel("fcm")
        dispatcher.register_channel(mock_email)
        dispatcher.register_channel(mock_fcm)

        # Broadcast to all channels
        success = await dispatcher.send(
            recipient_id="user-push-1",
            title="Cuốc xe sắp tới",
            body="Tài xế đang cách bạn 200m.",
            metadata={"preferred_channel": "all"},
        )
        self.assertTrue(success)
        self.assertEqual(len(mock_email.sent_messages), 1)
        self.assertEqual(len(mock_fcm.sent_messages), 1)
        self.assertEqual(mock_email.sent_messages[0]["title"], "Cuốc xe sắp tới")


if __name__ == "__main__":
    unittest.main()
