import React, { useState, useEffect, useRef } from 'react';
import { apiRegistry, soaEventBus } from './services/ApiClient.js';

const HCMC_LOCATIONS = [
  { id: 'ben-thanh', name: 'Chợ Bến Thành, Quận 1', lat: 10.7726, lng: 106.6980 },
  { id: 'landmark-81', name: 'Vinhomes Landmark 81, Bình Thạnh', lat: 10.7950, lng: 106.7218 },
  { id: 'nguyen-hue', name: 'Phố Đi Bộ Nguyễn Huệ, Quận 1', lat: 10.7744, lng: 106.7035 },
  { id: 'tan-son-nhat', name: 'Sân Bay Quốc Tế Tân Sơn Nhất', lat: 10.8185, lng: 106.6588 },
  { id: 'dh-khtn', name: 'ĐH Khoa Học Tự Nhiên / ĐHQG (Quận 5)', lat: 10.7629, lng: 106.6822 },
  { id: 'sala-thu-thiem', name: 'Khu Đô Thị Sala Thủ Thiêm, TP. Thủ Đức', lat: 10.7719, lng: 106.7224 }
];

const RIDE_STATES = ['REQUESTED', 'DRIVER_ASSIGNED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED'];
const FOOD_STATES = ['PENDING', 'CONFIRMED', 'PREPARING', 'PICKING_UP', 'DELIVERING', 'DELIVERED'];

export default function App() {
  const [activeTab, setActiveTab] = useState('RIDE');

  // --- Shared User & Wallet State (Encapsulated Domain State) ---
  const [walletBalance, setWalletBalance] = useState(850000);
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState('RIDEEAT50');
  const [transactions, setTransactions] = useState([
    {
      transaction_id: 'TXN-882104',
      invoice_number: 'INV-2026-4910',
      amount: 500000,
      type: 'CREDIT',
      method: 'VNPAY',
      strategy_class: 'VNPayGatewayAdapterStrategy',
      description: 'Nạp tiền vào Ví RideEat qua VNPay QR',
      timestamp: 'Hôm nay, 08:15:00'
    },
    {
      transaction_id: 'TXN-882199',
      invoice_number: 'INV-2026-5102',
      amount: 42000,
      type: 'DEBIT',
      method: 'WALLET',
      strategy_class: 'RideEatWalletPaymentStrategy',
      description: 'Thanh toán chuyến xe RIDE-771209 (Bến Thành -> Nguyễn Huệ)',
      timestamp: 'Hôm nay, 09:30:12'
    }
  ]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // --- Tab 1: Ride Booking State ---
  const [pickupId, setPickupId] = useState('ben-thanh');
  const [dropoffId, setDropoffId] = useState('landmark-81');
  const [weather, setWeather] = useState('CLEAR');
  const [isPeakHour, setIsPeakHour] = useState(false);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [priorityDispatch, setPriorityDispatch] = useState(false);
  const [selectedVehicleCode, setSelectedVehicleCode] = useState('BIKE');
  const [routeInfo, setRouteInfo] = useState({ distance_km: 3.9, duration_minutes: 10, polyline: [] });
  const [fareEstimates, setFareEstimates] = useState([]);
  const [strategySummary, setStrategySummary] = useState('NormalPricingStrategy');
  const [activeRide, setActiveRide] = useState(null);
  const [driverStepIndex, setDriverStepIndex] = useState(0);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletLayerGroupRef = useRef(null);

  // --- Tab 2: Food Delivery State ---
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([
    { id: 'f-01', name: 'Phở Bò Tái Lăn Đặc Biệt', price: 65000, quantity: 2, image: '🍜' }
  ]);
  const [activeFoodOrder, setActiveFoodOrder] = useState(null);
  const [aiWeatherFilter, setAiWeatherFilter] = useState('RAIN');
  const [aiTimeFilter, setAiTimeFilter] = useState('DINNER');
  const [aiBudget, setAiBudget] = useState(80000);

  // --- Tab 4: Driver & Merchant Partner Portal State ---
  const [driverKycApproved, setDriverKycApproved] = useState(true);
  const [driverOnline, setDriverOnline] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifyMessage, setOtpVerifyMessage] = useState('');
  const [driverRating, setDriverRating] = useState({ score: 4.96, totalReviews: 148 });

  // --- Tab 5: SOA & Kafka Event Stream State ---
  const [eventLogs, setEventLogs] = useState([
    {
      id: 'evt-init-1',
      timestamp: new Date().toISOString(),
      type: 'KAFKA_EVENT',
      topic: 'system.bootstrap',
      service: 'api-gateway:8080',
      eventName: 'SOAClusterInitializedEvent',
      payload: { servicesCount: 9, broker: 'kafka:9092', cache: 'redis:6379' }
    }
  ]);

  // Subscribe to ClientEventBus (Observer Pattern)
  useEffect(() => {
    const unsub = soaEventBus.subscribe('*', (evt) => {
      setEventLogs((prev) => [evt, ...prev.slice(0, 39)]);
    });
    return unsub;
  }, []);

  // Load Initial Catalogs (Vouchers + Restaurants)
  useEffect(() => {
    apiRegistry.promo.getVouchers().then((res) => {
      if (res.vouchers) setVouchers(res.vouchers);
    });
    apiRegistry.food.getRestaurants().then((res) => {
      if (res.restaurants && res.restaurants.length > 0) {
        setRestaurants(res.restaurants);
        setSelectedRestaurant(res.restaurants[0]);
      }
    });
  }, []);

  // Recalculate Route & Polymorphic Fare whenever inputs change
  useEffect(() => {
    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId) || HCMC_LOCATIONS[1];

    apiRegistry.map.calculateRoute(pickup, dropoff, selectedVehicleCode).then((routeRes) => {
      setRouteInfo(routeRes);
      setDriverStepIndex(0);

      const voucherObj = vouchers.find((v) => v.code === selectedVoucherCode);
      const rawDiscount = voucherObj ? voucherObj.maxDiscount : 0;

      apiRegistry.ride
        .estimatePolymorphicFare({
          pickup,
          dropoff,
          distanceKm: routeRes.distance_km,
          durationMinutes: routeRes.duration_minutes,
          weather,
          isPeakHour,
          includeInsurance,
          priorityDispatch,
          voucherDiscount: selectedVoucherCode ? Math.min(25000, rawDiscount) : 0
        })
        .then((estRes) => {
          setFareEstimates(estRes.estimates || []);
          setStrategySummary(estRes.strategyName || 'NormalPricingStrategy');
        });
    });
  }, [
    pickupId,
    dropoffId,
    weather,
    isPeakHour,
    includeInsurance,
    priorityDispatch,
    selectedVoucherCode,
    selectedVehicleCode,
    vouchers
  ]);

  // Render & Update Interactive Leaflet Map
  useEffect(() => {
    if (activeTab !== 'RIDE' || !mapContainerRef.current || !window.L) return;

    if (!leafletMapRef.current) {
      const map = window.L.map(mapContainerRef.current).setView([10.778, 106.705], 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | RideEat Geo-Spatial Service (:8005)'
      }).addTo(map);
      leafletMapRef.current = map;
      leafletLayerGroupRef.current = window.L.layerGroup().addTo(map);
    }

    const map = leafletMapRef.current;
    const layerGroup = leafletLayerGroupRef.current;
    layerGroup.clearLayers();

    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId) || HCMC_LOCATIONS[1];

    // Pickup Marker
    window.L.circleMarker([pickup.lat, pickup.lng], {
      radius: 9,
      fillColor: '#10b981',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    })
      .addTo(layerGroup)
      .bindPopup(`<b>📍 Điểm đón:</b><br/>${pickup.name}`);

    // Dropoff Marker
    window.L.circleMarker([dropoff.lat, dropoff.lng], {
      radius: 9,
      fillColor: '#f43f5e',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    })
      .addTo(layerGroup)
      .bindPopup(`<b>🏁 Điểm đến:</b><br/>${dropoff.name}`);

    // Route Polyline
    if (routeInfo.polyline && routeInfo.polyline.length > 1) {
      const poly = window.L.polyline(routeInfo.polyline, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.85,
        dashArray: activeRide ? null : '8, 8'
      }).addTo(layerGroup);

      // Driver Live GPS Marker along the polyline
      const idx = Math.min(driverStepIndex, routeInfo.polyline.length - 1);
      const driverCoord = routeInfo.polyline[idx];
      if (driverCoord) {
        window.L.circleMarker(driverCoord, {
          radius: 10,
          fillColor: '#f59e0b',
          color: '#0b1020',
          weight: 3,
          fillOpacity: 1
        })
          .addTo(layerGroup)
          .bindPopup(
            `<b>🛵 Tài xế Trần Minh Tài (59-X3 888.99)</b><br/>Trạng thái: ${
              activeRide ? activeRide.state : 'Sẵn sàng gần điểm đón'
            }`
          )
          .openPopup();
      }

      map.fitBounds(poly.getBounds(), { padding: [36, 36] });
    }
  }, [activeTab, pickupId, dropoffId, routeInfo, activeRide, driverStepIndex]);

  // Clean up map reference when leaving RIDE tab so it mounts cleanly on return
  useEffect(() => {
    if (activeTab !== 'RIDE' && leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      leafletLayerGroupRef.current = null;
    }
  }, [activeTab]);

  const currentVehicleEstimate =
    fareEstimates.find((e) => e.vehicleCode === selectedVehicleCode) || fareEstimates[0];

  // --- Handlers for Ride Booking ---
  const handleBookRide = async () => {
    if (!currentVehicleEstimate) return;
    if (paymentMethod === 'WALLET' && walletBalance < currentVehicleEstimate.finalFare) {
      alert('Số dư Ví RideEat không đủ! Vui lòng nạp thêm hoặc chọn phương thức khác.');
      return;
    }

    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId);
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId);

    const res = await apiRegistry.ride.bookRide({
      pickup,
      dropoff,
      vehicleCode: currentVehicleEstimate.vehicleCode,
      fare: currentVehicleEstimate.finalFare,
      paymentMethod
    });

    // Process payment via PaymentApiService
    const payRes = await apiRegistry.payment.processTransaction({
      userId: 'usr-customer-001',
      amount: currentVehicleEstimate.finalFare,
      method: paymentMethod,
      referenceId: res.ride_id,
      referenceType: 'RIDE',
      description: `Đặt xe ${currentVehicleEstimate.vehicleName} (${pickup.name} -> ${dropoff.name})`
    });

    if (paymentMethod === 'WALLET') {
      setWalletBalance((prev) => prev - currentVehicleEstimate.finalFare);
    }

    setTransactions((prev) => [
      { ...payRes, type: 'DEBIT' },
      ...prev
    ]);
    setSelectedInvoice(payRes);
    setActiveRide({
      ...res,
      fare: currentVehicleEstimate.finalFare,
      vehicleName: currentVehicleEstimate.vehicleName,
      pickupName: pickup.name,
      dropoffName: dropoff.name
    });
    setOtpInput(res.otp_code);
    setDriverStepIndex(2);
  };

  const handleAdvanceRideState = () => {
    if (!activeRide) return;
    const currentIdx = RIDE_STATES.indexOf(activeRide.state);
    const nextIdx = Math.min(currentIdx + 1, RIDE_STATES.length - 1);
    const nextState = RIDE_STATES[nextIdx];

    setActiveRide({ ...activeRide, state: nextState });
    setDriverStepIndex((prev) => Math.min(prev + 4, (routeInfo.polyline?.length || 16) - 1));

    soaEventBus.publish('KAFKA_EVENT', {
      topic: 'ride.events',
      service: 'ride-service:8003',
      eventName: `RideStateChanged -> ${nextState}`,
      payload: { rideId: activeRide.ride_id, newState: nextState }
    });
  };

  // --- Handlers for Food Cart & Ordering ---
  const addToCart = (dish) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? 15000 : 0;
  const activeVoucherObj = vouchers.find((v) => v.code === selectedVoucherCode);
  const foodDiscountResult = apiRegistry.promo.calculateDiscount(
    activeVoucherObj,
    cartSubtotal + deliveryFee
  );
  const foodFinalTotal = Math.max(0, cartSubtotal + deliveryFee - foodDiscountResult.discountAmount);

  const handlePlaceFoodOrder = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'WALLET' && walletBalance < foodFinalTotal) {
      alert('Số dư Ví không đủ! Vui lòng nạp thêm tiền ở tab Ví & Thanh Toán.');
      return;
    }

    const orderRes = await apiRegistry.food.createOrder({
      restaurantName: selectedRestaurant?.name || 'Phở Thìn Bờ Hồ',
      items: cart,
      finalTotal: foodFinalTotal,
      voucherCode: selectedVoucherCode
    });

    const payRes = await apiRegistry.payment.processTransaction({
      userId: 'usr-customer-001',
      amount: foodFinalTotal,
      method: paymentMethod,
      referenceId: orderRes.order_id,
      referenceType: 'FOOD',
      description: `Đặt đồ ăn ${selectedRestaurant?.name} (${cart.length} món)`
    });

    if (paymentMethod === 'WALLET') {
      setWalletBalance((prev) => prev - foodFinalTotal);
    }

    setTransactions((prev) => [{ ...payRes, type: 'DEBIT' }, ...prev]);
    setSelectedInvoice(payRes);
    setActiveFoodOrder({
      ...orderRes,
      restaurantName: selectedRestaurant?.name,
      total: foodFinalTotal,
      items: [...cart]
    });
  };

  const handleAdvanceFoodState = () => {
    if (!activeFoodOrder) return;
    const idx = FOOD_STATES.indexOf(activeFoodOrder.state);
    const nextState = FOOD_STATES[Math.min(idx + 1, FOOD_STATES.length - 1)];
    setActiveFoodOrder({ ...activeFoodOrder, state: nextState });

    soaEventBus.publish('KAFKA_EVENT', {
      topic: 'food.events',
      service: 'food-service:8004',
      eventName: `FoodOrderStateTransition -> ${nextState}`,
      payload: { orderId: activeFoodOrder.order_id, state: nextState }
    });
  };

  // --- Handlers for Wallet Top-up ---
  const handleTopUpWallet = (amount) => {
    setWalletBalance((prev) => prev + amount);
    const txn = {
      transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
      invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      amount,
      type: 'CREDIT',
      method: 'VNPAY',
      strategy_class: 'VNPayGatewayAdapterStrategy',
      description: `Nạp tiền vào Ví RideEat (+${amount.toLocaleString('vi-VN')}đ)`,
      timestamp: new Date().toLocaleString('vi-VN')
    };
    setTransactions((prev) => [txn, ...prev]);
    setSelectedInvoice(txn);

    soaEventBus.publish('KAFKA_EVENT', {
      topic: 'payment.events',
      service: 'payment-service:8006',
      eventName: 'WalletCreditedEvent',
      payload: { userId: 'usr-customer-001', amount, newBalance: walletBalance + amount }
    });
  };

  // --- Handler for Driver OTP Verification ---
  const handleDriverVerifyOtp = () => {
    if (!activeRide) {
      setOtpVerifyMessage('⚠️ Chưa có chuyến xe đang hoạt động. Hãy đặt xe ở Tab 1 trước!');
      return;
    }
    if (otpInput.trim() === activeRide.otp_code) {
      setActiveRide({ ...activeRide, state: 'IN_PROGRESS' });
      setDriverStepIndex(8);
      setOtpVerifyMessage(
        `✅ Xác thực OTP [${activeRide.otp_code}] & Chữ ký QR hợp lệ! Chuyến xe ${activeRide.ride_id} đã chuyển sang IN_PROGRESS.`
      );
      soaEventBus.publish('KAFKA_EVENT', {
        topic: 'ride.events',
        service: 'ride-service:8003',
        eventName: 'RideStartedViaOTPVerification',
        payload: { rideId: activeRide.ride_id, driverId: 'drv-partner-001', verified: true }
      });
    } else {
      setOtpVerifyMessage('❌ Mã OTP không khớp với chữ ký chuyến đi!');
    }
  };

  // AI Food Recommendations Computation
  const allMenuDishes = restaurants.flatMap((r) =>
    r.menu.map((m) => ({ ...m, restaurantName: r.name, rating: r.rating }))
  );
  const aiRecommendedDishes = allMenuDishes.filter(
    (d) =>
      d.price <= aiBudget &&
      (d.tags.includes(aiWeatherFilter) || d.tags.includes(aiTimeFilter) || d.tags.includes('BESTSELLER'))
  );

  const microservicesCatalog = apiRegistry.monitor.getMicroservicesCatalog();

  return (
    <div className="app-shell">
      {/* TOP HEADER BAR */}
      <header className="top-header">
        <div className="brand-box">
          <div className="brand-logo">🚀</div>
          <div className="brand-title">
            <h1>
              RideEat Super-App
              <span className="badge-soa">SOA 9 Microservices + Deep OOP</span>
            </h1>
            <p className="brand-subtitle">
              Hệ sinh thái Đặt Xe Công Nghệ, Giao Đồ Ăn & Ví Điện Tử Thời Gian Thực (Nginx Gateway :8080)
            </p>
          </div>
        </div>

        <div className="header-pills">
          <div className="wallet-pill">
            <span>💳 Số dư Ví RideEat:</span>
            <span className="wallet-amount">{walletBalance.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="wallet-pill">
            <span className="status-dot" />
            <span>9/9 Services Healthy</span>
          </div>
        </div>
      </header>

      {/* 5 INTERACTIVE TABS */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'RIDE' ? 'active' : ''}`}
          onClick={() => setActiveTab('RIDE')}
        >
          🛵 Đặt Xe & Bản Đồ GPS
        </button>
        <button
          className={`nav-tab ${activeTab === 'FOOD' ? 'active' : ''}`}
          onClick={() => setActiveTab('FOOD')}
        >
          🍔 Đặt Đồ Ăn & AI Gợi Ý
        </button>
        <button
          className={`nav-tab ${activeTab === 'WALLET' ? 'active' : ''}`}
          onClick={() => setActiveTab('WALLET')}
        >
          💳 Ví & Thanh Toán Đa Kênh
        </button>
        <button
          className={`nav-tab ${activeTab === 'PARTNER' ? 'active' : ''}`}
          onClick={() => setActiveTab('PARTNER')}
        >
          👨‍✈️ Cổng Tài Xế & Nhà Hàng
        </button>
        <button
          className={`nav-tab ${activeTab === 'MONITOR' ? 'active' : ''}`}
          onClick={() => setActiveTab('MONITOR')}
        >
          📊 Giám Sát SOA & OOP
        </button>
      </nav>

      {/* =====================================================================
          TAB 1: ĐẶT XE (RIDE BOOKING + OPENSTREETMAP + POLYMORPHIC FARE + QR/OTP)
         ===================================================================== */}
      {activeTab === 'RIDE' && (
        <div className="grid-2">
          {/* Left Column: Booking Configuration & Polymorphic Vehicle Selection */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🛵 Đặt Xe Đa Hình (Polymorphic Fare Engine)</div>
              <span className="oop-tag">Inheritance + Strategy + Decorator</span>
            </div>

            <div className="form-group">
              <label className="form-label">📍 Điểm đón khách (Origin GeoPoint)</label>
              <select
                className="form-select"
                value={pickupId}
                onChange={(e) => setPickupId(e.target.value)}
              >
                {HCMC_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.lat}, {loc.lng})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">🏁 Điểm đến (Destination GeoPoint)</label>
              <select
                className="form-select"
                value={dropoffId}
                onChange={(e) => setDropoffId(e.target.value)}
              >
                {HCMC_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.lat}, {loc.lng})
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing Strategy & Decorator Toggles */}
            <div className="form-label">⚙️ Ngữ cảnh Định Giá (Strategy Pattern) & Dịch vụ Cộng Thêm (Decorator Pattern):</div>
            <div className="toggle-row">
              <button
                type="button"
                className={`chip-toggle ${weather === 'RAIN' ? 'active' : ''}`}
                onClick={() => setWeather(weather === 'RAIN' ? 'CLEAR' : 'RAIN')}
              >
                🌧️ Trời mưa (RainyWeatherStrategy x1.25)
              </button>
              <button
                type="button"
                className={`chip-toggle ${isPeakHour ? 'active' : ''}`}
                onClick={() => setIsPeakHour(!isPeakHour)}
              >
                🔥 Giờ cao điểm (SurgeStrategy x1.2)
              </button>
              <button
                type="button"
                className={`chip-toggle ${includeInsurance ? 'active' : ''}`}
                onClick={() => setIncludeInsurance(!includeInsurance)}
              >
                🛡️ Bảo hiểm chuyến đi (+3.000đ)
              </button>
              <button
                type="button"
                className={`chip-toggle ${priorityDispatch ? 'active' : ''}`}
                onClick={() => setPriorityDispatch(!priorityDispatch)}
              >
                ⚡ Ưu tiên tìm tài xế (+10.000đ)
              </button>
            </div>

            {/* Voucher Selector */}
            <div className="form-group">
              <label className="form-label">🎟️ Áp dụng Voucher Khuyến mãi (Promo Service :8008)</label>
              <select
                className="form-select"
                value={selectedVoucherCode}
                onChange={(e) => setSelectedVoucherCode(e.target.value)}
              >
                <option value="">-- Không dùng mã giảm giá --</option>
                {vouchers.map((v) => (
                  <option key={v.code} value={v.code}>
                    [{v.code}] {v.title} — ({v.strategyClass})
                  </option>
                ))}
              </select>
            </div>

            {/* Polymorphic Vehicle Hierarchy List */}
            <div className="form-label">
              🚘 Chọn loại phương tiện (Kế thừa từ lớp trừu tượng <code>AbstractVehicle</code>):
            </div>
            <div className="vehicle-list">
              {fareEstimates.map((est) => (
                <div
                  key={est.vehicleCode}
                  className={`vehicle-item ${
                    selectedVehicleCode === est.vehicleCode ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedVehicleCode(est.vehicleCode)}
                >
                  <div className="vehicle-left">
                    <span className="vehicle-icon">{est.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{est.vehicleName}</div>
                      <div className="price-sub mono">
                        Class: {est.className} • {est.capacity} chỗ • Gốc:{' '}
                        {est.baseCalculated.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                  <div className="vehicle-price">
                    <div className="price-main">{est.finalFare.toLocaleString('vi-VN')} đ</div>
                    <div className="price-sub">
                      Hệ số x{est.surgeMultiplier} {est.voucherDiscount > 0 ? `(-${est.voucherDiscount.toLocaleString('vi-VN')}đ)` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={handleBookRide}>
              🚀 Đặt Xe Ngay ({currentVehicleEstimate?.finalFare?.toLocaleString('vi-VN') || 0} đ •{' '}
              {paymentMethod})
            </button>
          </div>

          {/* Right Column: Interactive OpenStreetMap + Live GPS + QR/OTP Verification */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🗺️ Bản Đồ Định Tuyến OpenStreetMap & Live GPS (:8005)</div>
              <span className="oop-tag">
                {routeInfo.distance_km} km • ~{routeInfo.duration_minutes} phút
              </span>
            </div>

            <div ref={mapContainerRef} className="leaflet-map-box" />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '12px'
              }}
            >
              <div className="price-sub mono">
                Strategy đang kích hoạt: <strong style={{ color: '#60a5fa' }}>{strategySummary}</strong>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setDriverStepIndex((prev) =>
                    (prev + 2) % Math.max(2, routeInfo.polyline?.length || 10)
                  )
                }
              >
                🛰️ Mô phỏng Tài xế di chuyển GPS
              </button>
            </div>

            {/* Active Ride State Machine & QR/OTP Card */}
            {activeRide ? (
              <div
                style={{
                  background: '#0b1020',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.35)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}
                >
                  <div>
                    <strong style={{ color: '#34d399' }}>
                      Mã chuyến: {activeRide.ride_id} ({activeRide.vehicleName})
                    </strong>
                    <div className="price-sub">
                      Tài xế: {activeRide.driver.name} ({activeRide.driver.rating}★) • Biển số:{' '}
                      <strong>{activeRide.driver.license_plate}</strong>
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={handleAdvanceRideState}>
                    ⏭️ Chuyển State Tiếp Theo
                  </button>
                </div>

                {/* State Pattern Stepper */}
                <div className="state-stepper">
                  {RIDE_STATES.map((st, idx) => {
                    const currentIdx = RIDE_STATES.indexOf(activeRide.state);
                    const cls =
                      idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
                    return (
                      <div key={st} className={`step-pill ${cls}`}>
                        {st}
                      </div>
                    );
                  })}
                </div>

                {/* QR & 6-Digit OTP Verification Box */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#131b31',
                    padding: '12px',
                    borderRadius: '10px',
                    marginTop: '10px'
                  }}
                >
                  <div>
                    <div className="form-label" style={{ marginBottom: '2px' }}>
                      🔐 Mã OTP 6 số Xác Thực Lên Xe (Chống nhầm xe):
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '4px' }}
                    >
                      {activeRide.otp_code}
                    </div>
                    <div className="price-sub mono">QR Payload: {activeRide.qr_payload}</div>
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      color: '#0b1020',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      textAlign: 'center'
                    }}
                  >
                    [QR VERIFIED]
                    <br />
                    {activeRide.ride_id}
                  </div>
                </div>
              </div>
            ) : (
              <div className="price-sub" style={{ textAlign: 'center', padding: '14px' }}>
                💡 Chọn điểm đón, điểm đến và nhấn <strong>"Đặt Xe Ngay"</strong> để khởi tạo State Machine, mã QR/OTP và theo dõi tài xế trực tiếp trên bản đồ.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: ĐẶT ĐỒ ĂN (RESTAURANTS + REDIS CART + VOUCHER + AI RECOMMENDER)
         ===================================================================== */}
      {activeTab === 'FOOD' && (
        <div className="grid-2">
          {/* Left Column: AI Food Recommender & Composite Restaurant Menus */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🍔 Nhà Hàng & Thực Đơn Cấu Trúc Cây (Composite Pattern)</div>
              <span className="oop-tag">MenuComponent: Leaf & Combo</span>
            </div>

            {/* AI Contextual Recommender Panel */}
            <div
              style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '8px', color: '#c4b5fd' }}>
                🤖 AI Food Recommender (Gợi ý món thông minh theo Thời tiết, Khung giờ & Ngân sách)
              </div>
              <div className="toggle-row" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className={`chip-toggle ${aiWeatherFilter === 'RAIN' ? 'active' : ''}`}
                  onClick={() => setAiWeatherFilter('RAIN')}
                >
                  🌧️ Trời Mưa (Món nóng)
                </button>
                <button
                  type="button"
                  className={`chip-toggle ${aiWeatherFilter === 'SUNNY' ? 'active' : ''}`}
                  onClick={() => setAiWeatherFilter('SUNNY')}
                >
                  ☀️ Trời Nắng (Giải nhiệt)
                </button>
                <button
                  type="button"
                  className={`chip-toggle ${aiTimeFilter === 'MORNING' ? 'active' : ''}`}
                  onClick={() => setAiTimeFilter('MORNING')}
                >
                  🌅 Bữa Sáng
                </button>
                <button
                  type="button"
                  className={`chip-toggle ${aiTimeFilter === 'LUNCH' ? 'active' : ''}`}
                  onClick={() => setAiTimeFilter('LUNCH')}
                >
                  🍱 Bữa Trưa
                </button>
                <button
                  type="button"
                  className={`chip-toggle ${aiTimeFilter === 'DINNER' ? 'active' : ''}`}
                  onClick={() => setAiTimeFilter('DINNER')}
                >
                  🌙 Bữa Tối
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '4px' }}>
                {aiRecommendedDishes.map((dish) => (
                  <div
                    key={dish.id}
                    style={{
                      minWidth: '210px',
                      background: '#0b1020',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid rgba(148,163,184,0.2)'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {dish.image} {dish.name}
                    </div>
                    <div className="price-sub">
                      {dish.price.toLocaleString('vi-VN')}đ • {dish.calories} kcal
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ marginTop: '6px', width: '100%' }}
                      onClick={() => addToCart(dish)}
                    >
                      + Thêm vào giỏ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Restaurant Selector */}
            <div className="toggle-row">
              {restaurants.map((rest) => (
                <button
                  key={rest.id}
                  type="button"
                  className={`chip-toggle ${
                    selectedRestaurant?.id === rest.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedRestaurant(rest)}
                >
                  🏪 {rest.name} ({rest.rating}★)
                </button>
              ))}
            </div>

            {/* Menu Items */}
            {selectedRestaurant && (
              <div className="vehicle-list">
                {selectedRestaurant.menu.map((dish) => (
                  <div key={dish.id} className="vehicle-item">
                    <div className="vehicle-left">
                      <span className="vehicle-icon">{dish.image}</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{dish.name}</div>
                        <div className="price-sub">
                          {dish.calories} kcal • Tags: {dish.tags.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="price-main">{dish.price.toLocaleString('vi-VN')} đ</div>
                      <button className="btn-secondary" onClick={() => addToCart(dish)}>
                        + Chọn món
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Redis Cart + Voucher Strategy + Food Order State Machine */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🛒 Giỏ Hàng Redis & Trạng Thái Đơn Hàng (:8004)</div>
              <span className="oop-tag">State Pattern + Promo Strategy</span>
            </div>

            {cart.length === 0 ? (
              <div className="price-sub" style={{ padding: '20px', textAlign: 'center' }}>
                Giỏ hàng đang trống. Hãy chọn món bên trái!
              </div>
            ) : (
              <div className="vehicle-list">
                {cart.map((item) => (
                  <div key={item.id} className="vehicle-item">
                    <div>
                      <strong>
                        {item.image} {item.name}
                      </strong>
                      <div className="price-sub">
                        {item.price.toLocaleString('vi-VN')}đ x {item.quantity}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn-secondary" onClick={() => updateCartQty(item.id, -1)}>
                        -
                      </button>
                      <span style={{ fontWeight: 700 }}>{item.quantity}</span>
                      <button className="btn-secondary" onClick={() => updateCartQty(item.id, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Voucher Selection */}
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">🎟️ Chọn Voucher Khuyến Mãi (Specification Chain):</label>
              <select
                className="form-select"
                value={selectedVoucherCode}
                onChange={(e) => setSelectedVoucherCode(e.target.value)}
              >
                <option value="">-- Không áp dụng Voucher --</option>
                {vouchers.map((v) => (
                  <option key={v.code} value={v.code}>
                    [{v.code}] {v.title} ({v.strategyClass})
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing Breakdown */}
            <div
              style={{
                background: '#0b1020',
                padding: '14px',
                borderRadius: '12px',
                marginBottom: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="price-sub">Tạm tính ({cart.length} món):</span>
                <span>{cartSubtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="price-sub">Phí giao hàng tiêu chuẩn:</span>
                <span>{deliveryFee.toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#34d399' }}>
                <span>Giảm giá ({foodDiscountResult.strategyClass || 'None'}):</span>
                <span>-{foodDiscountResult.discountAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(148,163,184,0.2)',
                  fontWeight: 800,
                  fontSize: '1.1rem'
                }}
              >
                <span>Tổng thanh toán:</span>
                <span style={{ color: '#34d399' }}>{foodFinalTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <button className="btn-primary" onClick={handlePlaceFoodOrder}>
              🛵 Đặt Giao Đồ Ăn Ngay ({foodFinalTotal.toLocaleString('vi-VN')} đ)
            </button>

            {/* Food Order State Machine Tracker */}
            {activeFoodOrder && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '14px',
                  background: '#0b1020',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.4)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#60a5fa' }}>
                      Đơn hàng: {activeFoodOrder.order_id}
                    </strong>
                    <div className="price-sub">
                      Shipper: {activeFoodOrder.shipper.name} ({activeFoodOrder.shipper.plate})
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={handleAdvanceFoodState}>
                    ⏭️ Chuyển Trạng Thái Đơn
                  </button>
                </div>

                <div className="state-stepper">
                  {FOOD_STATES.map((st, idx) => {
                    const currentIdx = FOOD_STATES.indexOf(activeFoodOrder.state);
                    const cls =
                      idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
                    return (
                      <div key={st} className={`step-pill ${cls}`}>
                        {st}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: VÍ & THANH TOÁN (WALLET + TOP-UP + PAYMENT STRATEGY + INVOICE)
         ===================================================================== */}
      {activeTab === 'WALLET' && (
        <div className="grid-2">
          {/* Left Column: Encapsulated Wallet & Payment Strategy Selector */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">💳 Ví Điện Tử RideEat & Cổng Thanh Toán (:8006)</div>
              <span className="oop-tag">Encapsulation + Factory + Strategy</span>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #059669, #1d4ed8)',
                padding: '22px',
                borderRadius: '16px',
                marginBottom: '18px'
              }}
            >
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Số dư đóng gói an toàn (<code>WalletEntity.__balance</code>)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0' }}>
                {walletBalance.toLocaleString('vi-VN')} VNĐ
              </div>
              <div className="mono" style={{ fontSize: '0.78rem', opacity: 0.85 }}>
                Chủ ví: Nguyễn Văn A (usr-customer-001) • Trạng thái: ACTIVE_VERIFIED
              </div>
            </div>

            <div className="form-label">⚡ Nạp tiền nhanh vào Ví (Atomic Credit Operation):</div>
            <div className="toggle-row" style={{ marginBottom: '18px' }}>
              <button className="btn-secondary" onClick={() => handleTopUpWallet(100000)}>
                + 100.000 đ
              </button>
              <button className="btn-secondary" onClick={() => handleTopUpWallet(500000)}>
                + 500.000 đ
              </button>
              <button className="btn-secondary" onClick={() => handleTopUpWallet(1000000)}>
                + 1.000.000 đ
              </button>
            </div>

            <div className="form-label">
              🔌 Chọn Chiến Lược Thanh Toán Mặc Định (<code>PaymentProcessorFactory</code>):
            </div>
            <div className="vehicle-list">
              {[
                {
                  code: 'WALLET',
                  name: 'Ví Điện Tử RideEatPay',
                  cls: 'RideEatWalletPaymentStrategy',
                  desc: 'Trừ trực tiếp số dư đóng gói, hoàn tiền tức thì (Saga Compensation)'
                },
                {
                  code: 'VNPAY',
                  name: 'Cổng Thanh Toán VNPay QR',
                  cls: 'VNPayGatewayAdapterStrategy',
                  desc: 'Tích hợp qua Adapter Pattern chuẩn ISO/VNPay'
                },
                {
                  code: 'MOMO',
                  name: 'Ví MoMo Siêu Ứng Dụng',
                  cls: 'MoMoEWalletStrategy',
                  desc: 'Xác thực chữ ký HMAC-SHA256 tự động'
                },
                {
                  code: 'CASH',
                  name: 'Tiền Mặt (COD)',
                  cls: 'CashOnDeliveryStrategy',
                  desc: 'Thanh toán trực tiếp cho tài xế khi hoàn thành chuyến'
                }
              ].map((pm) => (
                <div
                  key={pm.code}
                  className={`vehicle-item ${paymentMethod === pm.code ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod(pm.code)}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{pm.name}</div>
                    <div className="price-sub mono">{pm.cls}</div>
                    <div className="price-sub">{pm.desc}</div>
                  </div>
                  <div className="badge-soa">{paymentMethod === pm.code ? 'Đang chọn' : 'Chọn'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Ledger History & Digital Invoice */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🧾 Lịch Sử Sổ Cái Giao Dịch & Hóa Đơn Điện Tử</div>
              <span className="oop-tag">{transactions.length} giao dịch</span>
            </div>

            {selectedInvoice && (
              <div
                style={{
                  background: '#0b1020',
                  border: '1px solid #34d399',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#34d399' }}>
                    📄 HÓA ĐƠN ĐIỆN TỬ: {selectedInvoice.invoice_number}
                  </strong>
                  <span className="mono price-sub">{selectedInvoice.transaction_id}</span>
                </div>
                <div className="price-sub" style={{ marginTop: '6px' }}>
                  Nội dung: {selectedInvoice.description}
                </div>
                <div className="price-sub mono">
                  Strategy: {selectedInvoice.strategy_class} • Phương thức: {selectedInvoice.method}
                </div>
                <div style={{ marginTop: '8px', fontWeight: 800, fontSize: '1.1rem' }}>
                  Số tiền: {selectedInvoice.amount?.toLocaleString('vi-VN')} VNĐ — ĐÃ THANH TOÁN
                </div>
              </div>
            )}

            <div className="vehicle-list">
              {transactions.map((tx) => (
                <div
                  key={tx.transaction_id}
                  className="vehicle-item"
                  onClick={() => setSelectedInvoice(tx)}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{tx.description}</div>
                    <div className="price-sub mono">
                      {tx.transaction_id} • {tx.invoice_number} • {tx.strategy_class}
                    </div>
                    <div className="price-sub">{tx.timestamp}</div>
                  </div>
                  <div
                    className="price-main"
                    style={{ color: tx.type === 'CREDIT' ? '#34d399' : '#f43f5e' }}
                  >
                    {tx.type === 'CREDIT' ? '+' : '-'}
                    {tx.amount.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: CỔNG TÀI XẾ & NHÀ HÀNG (PARTNER PORTAL + QR/OTP VERIFY)
         ===================================================================== */}
      {activeTab === 'PARTNER' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">👨‍✈️ Hồ Sơ Tài Xế Đa Hình (DriverProfile extends BaseUserProfile)</div>
              <span className="oop-tag">user-service:8002 + rating-service:8007</span>
            </div>

            <div className="vehicle-item" style={{ marginBottom: '14px' }}>
              <div className="vehicle-left">
                <span className="vehicle-icon">🛵</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    Trần Minh Tài (ID: drv-partner-001)
                  </div>
                  <div className="price-sub">
                    Phương tiện: Honda SH 150i ABS • Biển số: <strong>59-X3 888.99</strong>
                  </div>
                  <div className="price-sub">
                    Điểm uy tín Bayesian: <strong>{driverRating.score} ★</strong> ({driverRating.totalReviews} đánh giá)
                  </div>
                </div>
              </div>
              <span className="badge-soa">
                {driverKycApproved && driverOnline ? 'ELIGIBLE_FOR_DISPATCH' : 'OFFLINE'}
              </span>
            </div>

            <div className="toggle-row">
              <button
                type="button"
                className={`chip-toggle ${driverKycApproved ? 'active' : ''}`}
                onClick={() => setDriverKycApproved(!driverKycApproved)}
              >
                ✅ Phê duyệt Hồ sơ KYC Tài xế (Admin)
              </button>
              <button
                type="button"
                className={`chip-toggle ${driverOnline ? 'active' : ''}`}
                onClick={() => setDriverOnline(!driverOnline)}
              >
                🟢 Trạng thái Trực tuyến Nhận Chuyến (Online)
              </button>
            </div>

            {/* QR / OTP Verification Form */}
            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                background: '#0b1020',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>
                🔐 Xác Thực Mã OTP 6 Số / Quét QR Khách Hàng Khi Đón Khách
              </div>
              <div className="price-sub" style={{ marginBottom: '10px' }}>
                {activeRide
                  ? `Chuyến hiện tại: ${activeRide.ride_id} — Mã OTP của khách là: ${activeRide.otp_code}`
                  : 'Hãy đặt 1 chuyến xe ở Tab 1 để sinh mã OTP động.'}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  className="form-input mono"
                  placeholder="Nhập mã OTP 6 chữ số..."
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                />
                <button className="btn-primary" style={{ width: '220px' }} onClick={handleDriverVerifyOtp}>
                  Xác Thực & Bắt Đầu
                </button>
              </div>
              {otpVerifyMessage && (
                <div style={{ marginTop: '10px', fontSize: '0.86rem', color: '#34d399' }}>
                  {otpVerifyMessage}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">⭐ Đánh Giá & Điểm Uy Tín Bayesian (:8007)</div>
              <span className="oop-tag">BayesianWeightedAverageStrategy</span>
            </div>

            <div className="price-sub" style={{ marginBottom: '14px' }}>
              Hệ thống sử dụng thuật toán trung bình có trọng số Bayes giúp điểm số của Tài xế & Nhà hàng công bằng, chống thao túng điểm số khi số lượng đánh giá còn ít:
            </div>

            <div className="toggle-row">
              {[5, 4, 5].map((stars, idx) => (
                <button
                  key={idx}
                  className="btn-secondary"
                  onClick={() => {
                    const total = driverRating.totalReviews + 1;
                    const newScore = +(
                      (driverRating.score * driverRating.totalReviews + stars) /
                      total
                    ).toFixed(2);
                    setDriverRating({ score: newScore, totalReviews: total });
                    soaEventBus.publish('KAFKA_EVENT', {
                      topic: 'rating.events',
                      service: 'rating-service:8007',
                      eventName: 'DriverRatedEvent',
                      payload: { driverId: 'drv-partner-001', stars, bayesianScore: newScore }
                    });
                  }}
                >
                  🌟 Gửi đánh giá {stars} Sao (+Bayesian Update)
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: GIÁM SÁT SOA & OOP ARCHITECTURE (9 SERVICES + KAFKA + PROMETHEUS)
         ===================================================================== */}
      {activeTab === 'MONITOR' && (
        <div>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            {/* Real-time Kafka Event Stream */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">📡 Luồng Sự Kiện Kafka & API Gateway Thời Gian Thực</div>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    soaEventBus.publish('KAFKA_EVENT', {
                      topic: 'ride.events',
                      service: 'ride-service:8003',
                      eventName: 'HeartbeatDomainEvent',
                      payload: { status: 'ALL_9_SERVICES_HEALTHY', timestamp: Date.now() }
                    })
                  }
                >
                  ⚡ Phát Sự Kiện Kafka Mẫu
                </button>
              </div>
              <div className="event-log">
                {eventLogs.map((ev) => (
                  <div key={ev.id} className="event-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#34d399' }}>
                        [{ev.type}] {ev.eventName || ev.endpoint}
                      </strong>
                      <span className="price-sub mono">{ev.service}</span>
                    </div>
                    <div className="price-sub mono" style={{ marginTop: '4px' }}>
                      {JSON.stringify(ev.payload || { mode: ev.mode, latencyMs: ev.latencyMs })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 Pillars of OOP & Design Patterns Matrix */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🏛️ Ma Trận 4 Trụ Cột OOP & 7 Design Patterns</div>
                <span className="oop-tag">Enterprise OOP Verification</span>
              </div>
              <div className="vehicle-list">
                <div className="vehicle-item">
                  <div>
                    <strong>1. Tính Đóng Gói (Encapsulation)</strong>
                    <div className="price-sub">
                      <code>WalletEntity.__balance</code> (Payment :8006), <code>TokenManager.__secret</code> (Auth :8001), <code>BaseEntity</code> ID & audit timestamps chỉ truy cập qua getter/method kiểm duyệt.
                    </div>
                  </div>
                </div>
                <div className="vehicle-item">
                  <div>
                    <strong>2. Tính Kế Thừa (Inheritance)</strong>
                    <div className="price-sub">
                      <code>AbstractVehicle</code> → <code>BikeVehicle</code>, <code>Car4SeatVehicle</code>, <code>Car7SeatVehicle</code>, <code>LuxuryLimousineVehicle</code>; <code>BaseUserProfile</code> → <code>Customer/Driver/MerchantProfile</code>.
                    </div>
                  </div>
                </div>
                <div className="vehicle-item">
                  <div>
                    <strong>3. Tính Đa Hình (Polymorphism)</strong>
                    <div className="price-sub">
                      Cùng lời gọi <code>calculate_fare()</code>, <code>apply_discount()</code> hoặc <code>process_payment()</code> nhưng mỗi lớp con thực thi công thức toán học và nghiệp vụ hoàn toàn khác nhau lúc runtime.
                    </div>
                  </div>
                </div>
                <div className="vehicle-item">
                  <div>
                    <strong>4. Tính Trừu Tượng (Abstraction)</strong>
                    <div className="price-sub">
                      Tất cả các cổng giao tiếp (<code>IRepository[T]</code>, <code>IPricingStrategy</code>, <code>IPaymentStrategy</code>, <code>INotificationChannel</code>) đều định nghĩa qua <code>ABC</code> và <code>@abstractmethod</code>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 9 Microservices Health & Architecture Grid */}
          <div className="grid-3">
            {microservicesCatalog.map((svc) => (
              <div key={svc.id} className="card">
                <div className="card-header">
                  <div className="card-title">
                    <span className="status-dot" />
                    {svc.name}
                  </div>
                  <span className="oop-tag">:{svc.port}</span>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: '#60a5fa' }}>
                  Bounded Context: {svc.boundedContext}
                </div>
                <div className="price-sub mono" style={{ marginBottom: '10px' }}>
                  DB: {svc.dbSchema}
                </div>
                <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {svc.oopHighlights.map((hl, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      {hl}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
