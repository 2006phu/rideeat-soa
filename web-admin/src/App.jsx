import React, { useState, useEffect, useRef } from 'react';
import { apiRegistry, soaEventBus } from './services/ApiClient.js';

const HCMC_LOCATIONS = [
  { id: 'ben-thanh', name: 'Chợ Bến Thành, Quận 1', lat: 10.7726, lng: 106.6980 },
  { id: 'landmark-81', name: 'Vinhomes Landmark 81, Bình Thạnh', lat: 10.7950, lng: 106.7218 },
  { id: 'nguyen-hue', name: 'Phố Đi Bộ Nguyễn Huệ, Quận 1', lat: 10.7744, lng: 106.7035 },
  { id: 'tan-son-nhat', name: 'Sân Bay Tân Sơn Nhất', lat: 10.8185, lng: 106.6588 },
  { id: 'dh-khtn', name: 'ĐH Khoa Học Tự Nhiên, Quận 5', lat: 10.7629, lng: 106.6822 },
  { id: 'sala-thu-thiem', name: 'Khu Đô Thị Sala, TP. Thủ Đức', lat: 10.7719, lng: 106.7224 }
];

const RIDE_STATES = ['REQUESTED', 'DRIVER_ASSIGNED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED'];
const FOOD_STATES = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED'];

export default function App() {
  const [activeTab, setActiveTab] = useState('RIDE');

  // Shared User & Wallet State
  const [walletBalance, setWalletBalance] = useState(500000);
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
      description: 'Nạp tiền vào ví qua VNPay',
      timestamp: 'Hôm nay, 08:15'
    }
  ]);

  // Tab 1: Ride State
  const [pickupId, setPickupId] = useState('ben-thanh');
  const [dropoffId, setDropoffId] = useState('landmark-81');
  const [weather, setWeather] = useState('CLEAR');
  const [isPeakHour, setIsPeakHour] = useState(false);
  const [selectedVehicleCode, setSelectedVehicleCode] = useState('BIKE');
  const [routeInfo, setRouteInfo] = useState({ distance_km: 3.9, duration_minutes: 10, polyline: [] });
  const [fareEstimates, setFareEstimates] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [driverStepIndex, setDriverStepIndex] = useState(0);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletLayerGroupRef = useRef(null);

  // Tab 2: Food State
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([
    { id: 'f-01', name: 'Phở Bò Tái Lăn Đặc Biệt', price: 65000, quantity: 1, image: '🍜' }
  ]);
  const [activeFoodOrder, setActiveFoodOrder] = useState(null);

  // Tab 4: Driver State
  const [driverOnline, setDriverOnline] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifyMessage, setOtpVerifyMessage] = useState('');

  // Tab 5: SOA Logs
  const [eventLogs, setEventLogs] = useState([
    {
      id: 'evt-init-1',
      type: 'KAFKA_EVENT',
      service: 'api-gateway:8080',
      eventName: 'Hệ thống 9 Microservices sẵn sàng',
      payload: { broker: 'kafka:9092', cache: 'redis:6379' }
    }
  ]);

  // Floating Gemini AI Assistant State
  const [aiOpen, setAiOpen] = useState(false);
  const [aiKey, setAiKey] = useState(() => localStorage.getItem('RIDEEAT_GEMINI_KEY') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'bot',
      text: 'Xin chào! Mình là Trợ lý AI RideEat (Gemini). Bạn cần tư vấn giá xe, gợi ý món ngon hay mã giảm giá hôm nay?'
    }
  ]);

  const handleSendAiChat = async (customPrompt) => {
    const question = (customPrompt ?? aiInput).trim();
    if (!question || aiLoading) return;
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', text: question }]);
    setAiLoading(true);

    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId) || HCMC_LOCATIONS[1];
    const contextPrompt = `Bạn là Trợ lý AI của siêu ứng dụng RideEat SOA (Đặt xe & Giao đồ ăn).
Thông tin hiện tại của khách:
- Số dư ví: ${walletBalance.toLocaleString('vi-VN')}đ
- Lộ trình đang chọn: ${pickup.name} -> ${dropoff.name} (${routeInfo.distance_km}km, ~${routeInfo.duration_minutes} phút)
- Giá xe máy: ${fareEstimates[0]?.finalFare?.toLocaleString('vi-VN') || '18.000'}đ, Ô tô 4 chỗ: ${fareEstimates[1]?.finalFare?.toLocaleString('vi-VN') || '45.000'}đ
- Quán ăn nổi bật: Phở Thìn Bờ Hồ (65.000đ), Cơm Tấm Sài Gòn (55.000đ), Bún Bò Huế (60.000đ), Trà Sữa Gong Cha (45.000đ)
- Voucher đang có: RIDEEAT50 (Giảm 50% tối đa 25k), FREESHIP15K (Giảm 15k)
Câu hỏi của khách: "${question}"
Hãy trả lời ngắn gọn (2-3 câu), thân thiện bằng tiếng Việt.`;

    try {
      if (aiKey.trim()) {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(aiKey.trim())}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: contextPrompt }] }]
            })
          }
        );
        const data = await resp.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          setAiMessages((prev) => [...prev, { role: 'bot', text: reply }]);
          setAiLoading(false);
          return;
        }
      }

      // Smart local fallback when API key isn't entered yet
      const q = question.toLowerCase();
      let replyText = `Với lộ trình ${pickup.name} → ${dropoff.name} (${routeInfo.distance_km} km), cước Xe máy chỉ ${fareEstimates[0]?.finalFare?.toLocaleString('vi-VN') || '18.000'}đ và Ô tô 4 chỗ là ${fareEstimates[1]?.finalFare?.toLocaleString('vi-VN') || '45.000'}đ. Bạn nhớ áp mã RIDEEAT50 để giảm thêm nhé!`;
      if (q.includes('ăn') || q.includes('món') || q.includes('phở') || q.includes('cơm')) {
        replyText = 'Hôm nay mình gợi ý món Phở Bò Tái Lăn Đặc Biệt (65.000đ) hoặc Cơm Tấm Sườn Bì Chả (55.000đ). Kết hợp mã FREESHIP15K sẽ được miễn phí giao hàng 15.000đ!';
      } else if (q.includes('mã') || q.includes('voucher') || q.includes('khuyến mãi')) {
        replyText = 'Bạn đang có mã RIDEEAT50 (giảm 50% tối đa 25.000đ) và FREESHIP15K (giảm 15.000đ phí ship). Chọn mã ngay ở mục Khuyến mãi khi đặt đơn nhé!';
      }
      setAiMessages((prev) => [...prev, { role: 'bot', text: replyText }]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Không kết nối được Gemini API. Vui lòng kiểm tra lại khóa API của bạn.' }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const unsub = soaEventBus.subscribe('*', (evt) => {
      setEventLogs((prev) => [evt, ...prev.slice(0, 29)]);
    });
    return unsub;
  }, []);

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
          includeInsurance: false,
          priorityDispatch: false,
          voucherDiscount: selectedVoucherCode ? Math.min(20000, rawDiscount) : 0
        })
        .then((estRes) => {
          setFareEstimates(estRes.estimates || []);
        });
    });
  }, [pickupId, dropoffId, weather, isPeakHour, selectedVoucherCode, selectedVehicleCode, vouchers]);

  // Render Leaflet Map
  useEffect(() => {
    if (activeTab !== 'RIDE' || !mapContainerRef.current || !window.L) return;

    if (!leafletMapRef.current) {
      const map = window.L.map(mapContainerRef.current).setView([10.778, 106.705], 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      leafletMapRef.current = map;
      leafletLayerGroupRef.current = window.L.layerGroup().addTo(map);
    }

    const map = leafletMapRef.current;
    const layerGroup = leafletLayerGroupRef.current;
    layerGroup.clearLayers();

    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId) || HCMC_LOCATIONS[1];

    window.L.circleMarker([pickup.lat, pickup.lng], {
      radius: 8,
      fillColor: '#00b14f',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    })
      .addTo(layerGroup)
      .bindPopup(`<b>Điểm đón:</b> ${pickup.name}`);

    window.L.circleMarker([dropoff.lat, dropoff.lng], {
      radius: 8,
      fillColor: '#e11d48',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    })
      .addTo(layerGroup)
      .bindPopup(`<b>Điểm đến:</b> ${dropoff.name}`);

    if (routeInfo.polyline && routeInfo.polyline.length > 1) {
      const poly = window.L.polyline(routeInfo.polyline, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.85
      }).addTo(layerGroup);

      const idx = Math.min(driverStepIndex, routeInfo.polyline.length - 1);
      const driverCoord = routeInfo.polyline[idx];
      if (driverCoord) {
        window.L.circleMarker(driverCoord, {
          radius: 9,
          fillColor: '#f59e0b',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1
        })
          .addTo(layerGroup)
          .bindPopup(`<b>🛵 Tài xế Trần Minh Tài</b>`);
      }

      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }
  }, [activeTab, pickupId, dropoffId, routeInfo, activeRide, driverStepIndex]);

  useEffect(() => {
    if (activeTab !== 'RIDE' && leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      leafletLayerGroupRef.current = null;
    }
  }, [activeTab]);

  const currentVehicleEstimate =
    fareEstimates.find((e) => e.vehicleCode === selectedVehicleCode) || fareEstimates[0];

  const handleBookRide = async () => {
    if (!currentVehicleEstimate) return;
    if (paymentMethod === 'WALLET' && walletBalance < currentVehicleEstimate.finalFare) {
      alert('Số dư ví không đủ! Vui lòng nạp thêm.');
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

    const payRes = await apiRegistry.payment.processTransaction({
      userId: 'usr-customer-001',
      amount: currentVehicleEstimate.finalFare,
      method: paymentMethod,
      referenceId: res.ride_id,
      referenceType: 'RIDE',
      description: `Đặt ${currentVehicleEstimate.vehicleName} (${pickup.name} → ${dropoff.name})`
    });

    if (paymentMethod === 'WALLET') {
      setWalletBalance((prev) => prev - currentVehicleEstimate.finalFare);
    }

    setTransactions((prev) => [{ ...payRes, type: 'DEBIT' }, ...prev]);
    setActiveRide({
      ...res,
      fare: currentVehicleEstimate.finalFare,
      vehicleName: currentVehicleEstimate.vehicleName
    });
    setOtpInput(res.otp_code);
    setDriverStepIndex(2);
  };

  const handleAdvanceRideState = () => {
    if (!activeRide) return;
    const currentIdx = RIDE_STATES.indexOf(activeRide.state);
    const nextState = RIDE_STATES[Math.min(currentIdx + 1, RIDE_STATES.length - 1)];
    setActiveRide({ ...activeRide, state: nextState });
    setDriverStepIndex((prev) => Math.min(prev + 4, (routeInfo.polyline?.length || 16) - 1));
  };

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
      alert('Số dư ví không đủ!');
      return;
    }

    const orderRes = await apiRegistry.food.createOrder({
      restaurantName: selectedRestaurant?.name || 'Nhà hàng',
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
      description: `Đặt món tại ${selectedRestaurant?.name}`
    });

    if (paymentMethod === 'WALLET') {
      setWalletBalance((prev) => prev - foodFinalTotal);
    }

    setTransactions((prev) => [{ ...payRes, type: 'DEBIT' }, ...prev]);
    setActiveFoodOrder({
      ...orderRes,
      restaurantName: selectedRestaurant?.name,
      total: foodFinalTotal
    });
  };

  const handleTopUpWallet = (amount) => {
    setWalletBalance((prev) => prev + amount);
    const txn = {
      transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
      invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      amount,
      type: 'CREDIT',
      method: 'VNPAY',
      description: `Nạp tiền vào ví (+${amount.toLocaleString('vi-VN')}đ)`,
      timestamp: new Date().toLocaleTimeString('vi-VN')
    };
    setTransactions((prev) => [txn, ...prev]);
  };

  const handleDriverVerifyOtp = () => {
    if (!activeRide) {
      setOtpVerifyMessage('Chưa có chuyến xe nào. Hãy đặt xe ở mục Đặt xe trước.');
      return;
    }
    if (otpInput.trim() === activeRide.otp_code) {
      setActiveRide({ ...activeRide, state: 'IN_PROGRESS' });
      setDriverStepIndex(8);
      setOtpVerifyMessage(`✅ Mã OTP ${activeRide.otp_code} chính xác! Đã bắt đầu chuyến đi.`);
    } else {
      setOtpVerifyMessage('❌ Mã OTP chưa đúng.');
    }
  };

  const microservicesCatalog = apiRegistry.monitor.getMicroservicesCatalog();

  return (
    <div className="app-shell">
      {/* HEADER */}
      <header className="top-header">
        <div className="brand-box">
          <div className="brand-logo">🛵</div>
          <div className="brand-title">
            <h1>
              RideEat
              <span className="badge-soa">SOA • 9 Services</span>
            </h1>
            <p className="brand-subtitle">Ứng dụng Đặt xe & Giao đồ ăn</p>
          </div>
        </div>

        <div className="header-pills">
          <div className="wallet-pill">
            <span>Ví của bạn:</span>
            <span className="wallet-amount">{walletBalance.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="wallet-pill">
            <span className="status-dot" />
            <span>Hệ thống trực tuyến</span>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'RIDE' ? 'active' : ''}`}
          onClick={() => setActiveTab('RIDE')}
        >
          🛵 Đặt xe
        </button>
        <button
          className={`nav-tab ${activeTab === 'FOOD' ? 'active' : ''}`}
          onClick={() => setActiveTab('FOOD')}
        >
          🍔 Đồ ăn
        </button>
        <button
          className={`nav-tab ${activeTab === 'WALLET' ? 'active' : ''}`}
          onClick={() => setActiveTab('WALLET')}
        >
          💳 Ví & Thanh toán
        </button>
        <button
          className={`nav-tab ${activeTab === 'PARTNER' ? 'active' : ''}`}
          onClick={() => setActiveTab('PARTNER')}
        >
          👨‍✈️ Tài xế
        </button>
        <button
          className={`nav-tab ${activeTab === 'MONITOR' ? 'active' : ''}`}
          onClick={() => setActiveTab('MONITOR')}
        >
          📊 Hệ thống SOA
        </button>
      </nav>

      {/* TAB 1: ĐẶT XE */}
      {activeTab === 'RIDE' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Đặt chuyến xe</div>
              <span className="oop-tag">{routeInfo.distance_km} km • {routeInfo.duration_minutes} phút</span>
            </div>

            <div className="form-group">
              <label className="form-label">Điểm đón</label>
              <select
                className="form-select"
                value={pickupId}
                onChange={(e) => setPickupId(e.target.value)}
              >
                {HCMC_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Điểm đến</label>
              <select
                className="form-select"
                value={dropoffId}
                onChange={(e) => setDropoffId(e.target.value)}
              >
                {HCMC_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="toggle-row">
              <button
                type="button"
                className={`chip-toggle ${weather === 'RAIN' ? 'active' : ''}`}
                onClick={() => setWeather(weather === 'RAIN' ? 'CLEAR' : 'RAIN')}
              >
                🌧️ Trời mưa (x1.25)
              </button>
              <button
                type="button"
                className={`chip-toggle ${isPeakHour ? 'active' : ''}`}
                onClick={() => setIsPeakHour(!isPeakHour)}
              >
                🔥 Giờ cao điểm (x1.2)
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Mã khuyến mãi</label>
              <select
                className="form-select"
                value={selectedVoucherCode}
                onChange={(e) => setSelectedVoucherCode(e.target.value)}
              >
                <option value="">Không dùng mã</option>
                {vouchers.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.code} — {v.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-label">Chọn loại xe</div>
            <div className="vehicle-list">
              {fareEstimates.slice(0, 3).map((est) => (
                <div
                  key={est.vehicleCode}
                  className={`vehicle-item ${selectedVehicleCode === est.vehicleCode ? 'selected' : ''}`}
                  onClick={() => setSelectedVehicleCode(est.vehicleCode)}
                >
                  <div className="vehicle-left">
                    <span className="vehicle-icon">{est.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{est.vehicleName}</div>
                      <div className="price-sub">{est.capacity} chỗ ngồi</div>
                    </div>
                  </div>
                  <div className="vehicle-price">
                    <div className="price-main">{est.finalFare.toLocaleString('vi-VN')} đ</div>
                    {est.voucherDiscount > 0 && (
                      <div className="price-sub">Đã giảm {est.voucherDiscount.toLocaleString('vi-VN')}đ</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={handleBookRide}>
              Đặt xe ngay • {currentVehicleEstimate?.finalFare?.toLocaleString('vi-VN') || 0} đ
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Bản đồ lộ trình</div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setDriverStepIndex((prev) => (prev + 2) % Math.max(2, routeInfo.polyline?.length || 10))
                }
              >
                Mô phỏng xe di chuyển
              </button>
            </div>

            <div ref={mapContainerRef} className="leaflet-map-box" />

            {activeRide ? (
              <div className="info-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Chuyến xe: {activeRide.ride_id}</strong>
                    <div className="price-sub">
                      Tài xế: {activeRide.driver.name} • Biển số: <strong>{activeRide.driver.license_plate}</strong>
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={handleAdvanceRideState}>
                    Cập nhật trạng thái →
                  </button>
                </div>

                <div className="state-stepper">
                  {RIDE_STATES.map((st, idx) => {
                    const currentIdx = RIDE_STATES.indexOf(activeRide.state);
                    const cls = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
                    return (
                      <div key={st} className={`step-pill ${cls}`}>{st}</div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span className="price-sub">Mã OTP xác nhận lên xe:</span>
                  <strong className="mono" style={{ fontSize: '1.1rem', color: '#00b14f' }}>
                    {activeRide.otp_code}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="price-sub" style={{ textAlign: 'center', padding: '8px' }}>
                Chọn điểm đón, điểm đến và bấm <strong>Đặt xe ngay</strong> để theo dõi lộ trình.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ĐẶT ĐỒ ĂN */}
      {activeTab === 'FOOD' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Danh sách quán ăn</div>
              <span className="oop-tag">{restaurants.length} quán</span>
            </div>

            <div className="toggle-row" style={{ marginTop: 0 }}>
              {restaurants.map((rest) => (
                <button
                  key={rest.id}
                  type="button"
                  className={`chip-toggle ${selectedRestaurant?.id === rest.id ? 'active' : ''}`}
                  onClick={() => setSelectedRestaurant(rest)}
                >
                  {rest.name} ({rest.rating}★)
                </button>
              ))}
            </div>

            {selectedRestaurant && (
              <div className="vehicle-list">
                {selectedRestaurant.menu.map((dish) => (
                  <div key={dish.id} className="vehicle-item">
                    <div className="vehicle-left">
                      <span className="vehicle-icon">{dish.image}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{dish.name}</div>
                        <div className="price-sub">{dish.price.toLocaleString('vi-VN')} đ</div>
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={() => addToCart(dish)}>
                      + Thêm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Giỏ hàng của bạn</div>
              <span className="oop-tag">{cart.length} món</span>
            </div>

            {cart.length === 0 ? (
              <div className="price-sub" style={{ padding: '20px', textAlign: 'center' }}>
                Giỏ hàng đang trống.
              </div>
            ) : (
              <div className="vehicle-list">
                {cart.map((item) => (
                  <div key={item.id} className="vehicle-item">
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.image} {item.name}</div>
                      <div className="price-sub">
                        {item.price.toLocaleString('vi-VN')}đ x {item.quantity}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn-secondary" onClick={() => updateCartQty(item.id, -1)}>-</button>
                      <span style={{ fontWeight: 600 }}>{item.quantity}</span>
                      <button className="btn-secondary" onClick={() => updateCartQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="info-box" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="price-sub">Tạm tính:</span>
                <span>{cartSubtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="price-sub">Phí giao hàng:</span>
                <span>{deliveryFee.toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#00b14f' }}>
                <span>Khuyến mãi:</span>
                <span>-{foodDiscountResult.discountAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                <span>Tổng cộng:</span>
                <span style={{ color: '#00b14f' }}>{foodFinalTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <button className="btn-primary" onClick={handlePlaceFoodOrder}>
              Đặt món ngay • {foodFinalTotal.toLocaleString('vi-VN')} đ
            </button>

            {activeFoodOrder && (
              <div className="info-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Đơn hàng: {activeFoodOrder.order_id}</strong>
                    <div className="price-sub">Tài xế giao: {activeFoodOrder.shipper.name}</div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const idx = FOOD_STATES.indexOf(activeFoodOrder.state);
                      const next = FOOD_STATES[Math.min(idx + 1, FOOD_STATES.length - 1)];
                      setActiveFoodOrder({ ...activeFoodOrder, state: next });
                    }}
                  >
                    Tiếp theo →
                  </button>
                </div>
                <div className="state-stepper">
                  {FOOD_STATES.map((st, idx) => {
                    const currentIdx = FOOD_STATES.indexOf(activeFoodOrder.state);
                    const cls = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
                    return (
                      <div key={st} className={`step-pill ${cls}`}>{st}</div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VÍ & THANH TOÁN */}
      {activeTab === 'WALLET' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Ví điện tử RideEat</div>
              <span className="oop-tag">Payment Service</span>
            </div>

            <div className="info-box" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: '14px' }}>
              <div className="price-sub">Số dư khả dụng</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00b14f', margin: '4px 0' }}>
                {walletBalance.toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div className="form-label">Nạp tiền nhanh</div>
            <div className="toggle-row">
              <button className="btn-secondary" onClick={() => handleTopUpWallet(100000)}>+ 100.000 đ</button>
              <button className="btn-secondary" onClick={() => handleTopUpWallet(200000)}>+ 200.000 đ</button>
              <button className="btn-secondary" onClick={() => handleTopUpWallet(500000)}>+ 500.000 đ</button>
            </div>

            <div className="form-label">Phương thức thanh toán mặc định</div>
            <div className="vehicle-list">
              {[
                { code: 'WALLET', name: 'Ví RideEatPay', desc: 'Thanh toán nhanh từ số dư ví' },
                { code: 'VNPAY', name: 'VNPay QR', desc: 'Quét mã QR ngân hàng' },
                { code: 'CASH', name: 'Tiền mặt', desc: 'Trả trực tiếp khi hoàn tất' }
              ].map((pm) => (
                <div
                  key={pm.code}
                  className={`vehicle-item ${paymentMethod === pm.code ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod(pm.code)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{pm.name}</div>
                    <div className="price-sub">{pm.desc}</div>
                  </div>
                  <span className="badge-soa">{paymentMethod === pm.code ? 'Đang dùng' : 'Chọn'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Lịch sử giao dịch</div>
              <span className="oop-tag">{transactions.length} giao dịch</span>
            </div>

            <div className="vehicle-list">
              {transactions.map((tx) => (
                <div key={tx.transaction_id} className="vehicle-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{tx.description}</div>
                    <div className="price-sub">{tx.timestamp} • {tx.method}</div>
                  </div>
                  <div
                    className="price-main"
                    style={{ color: tx.type === 'CREDIT' ? '#00b14f' : '#e11d48' }}
                  >
                    {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TÀI XẾ */}
      {activeTab === 'PARTNER' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Thông tin tài xế</div>
              <span className="badge-soa">{driverOnline ? 'Đang trực tuyến' : 'Tạm nghỉ'}</span>
            </div>

            <div className="vehicle-item" style={{ marginBottom: '12px' }}>
              <div className="vehicle-left">
                <span className="vehicle-icon">🛵</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Trần Minh Tài</div>
                  <div className="price-sub">Honda SH • Biển số: 59-X3 888.99 • Đánh giá: 4.96 ★</div>
                </div>
              </div>
              <button className="btn-secondary" onClick={() => setDriverOnline(!driverOnline)}>
                {driverOnline ? 'Tắt nhận chuyến' : 'Bật nhận chuyến'}
              </button>
            </div>

            <div className="info-box">
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Xác nhận mã OTP khách hàng</div>
              <div className="price-sub" style={{ marginBottom: '8px' }}>
                {activeRide
                  ? `Chuyến hiện tại: ${activeRide.ride_id} (Mã OTP: ${activeRide.otp_code})`
                  : 'Hãy đặt một chuyến xe ở mục Đặt xe để nhận mã OTP.'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="form-input mono"
                  placeholder="Nhập mã OTP..."
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                />
                <button className="btn-primary" style={{ width: '160px' }} onClick={handleDriverVerifyOtp}>
                  Xác nhận
                </button>
              </div>
              {otpVerifyMessage && (
                <div style={{ marginTop: '8px', fontSize: '0.84rem', fontWeight: 500, color: '#00b14f' }}>
                  {otpVerifyMessage}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Thiết kế OOP áp dụng</div>
              <span className="oop-tag">4 Tính chất OOP</span>
            </div>
            <div className="vehicle-list">
              <div className="vehicle-item">
                <div>
                  <strong>1. Đóng gói (Encapsulation)</strong>
                  <div className="price-sub">Các Entity tự kiểm soát trạng thái chuyến xe, đơn hàng và số dư ví.</div>
                </div>
              </div>
              <div className="vehicle-item">
                <div>
                  <strong>2. Kế thừa (Inheritance)</strong>
                  <div className="price-sub">Tất cả 9 service kế thừa từ BaseORMModel, SqlAlchemyRepository, BaseApplicationService.</div>
                </div>
              </div>
              <div className="vehicle-item">
                <div>
                  <strong>3. Đa hình (Polymorphism)</strong>
                  <div className="price-sub">Tính giá theo loại xe, chiến lược giảm giá và đa kênh thanh toán/thông báo.</div>
                </div>
              </div>
              <div className="vehicle-item">
                <div>
                  <strong>4. Trừu tượng (Abstraction)</strong>
                  <div className="price-sub">Giao tiếp qua các Abstract Interfaces (IRepository, IEventPublisher, IPricingStrategy).</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HỆ THỐNG SOA */}
      {activeTab === 'MONITOR' && (
        <div>
          <div className="card" style={{ marginBottom: '18px' }}>
            <div className="card-header">
              <div className="card-title">Nhật ký sự kiện Kafka & API Gateway</div>
              <span className="oop-tag">Event-Driven SOA</span>
            </div>
            <div className="event-log">
              {eventLogs.map((ev) => (
                <div key={ev.id} className="event-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{ev.eventName || ev.endpoint}</strong>
                    <span className="price-sub mono">{ev.service}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                <div className="price-sub" style={{ marginBottom: '6px' }}>
                  <strong>Nghiệp vụ:</strong> {svc.boundedContext}
                </div>
                <div className="price-sub mono">DB: {svc.dbSchema}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING GEMINI AI CHAT WIDGET */}
      <button className="ai-fab" onClick={() => setAiOpen(!aiOpen)}>
        🤖 {aiOpen ? 'Đóng Trợ lý AI' : 'Chat AI Gemini'}
      </button>

      {aiOpen && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <span>🤖 Trợ lý AI RideEat (Google Gemini)</span>
            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
              onClick={() => setShowKeyInput(!showKeyInput)}
            >
              🔑 {aiKey ? 'Đã gắn Key' : 'Gắn API Key'}
            </button>
          </div>

          {showKeyInput && (
            <div style={{ padding: '8px 12px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="password"
                className="form-input"
                placeholder="Dán Gemini API Key (AIza...) từ Google AI Studio"
                value={aiKey}
                onChange={(e) => {
                  setAiKey(e.target.value);
                  localStorage.setItem('RIDEEAT_GEMINI_KEY', e.target.value);
                }}
              />
              <div className="price-sub" style={{ marginTop: '4px' }}>
                Key chỉ lưu cục bộ trên trình duyệt của bạn (Free Tier không mất phí).
              </div>
            </div>
          )}

          <div className="ai-chat-messages">
            {aiMessages.map((m, idx) => (
              <div key={idx} className={`ai-msg ${m.role}`}>
                {m.text}
              </div>
            ))}
            {aiLoading && <div className="ai-msg bot">Đang suy nghĩ...</div>}
          </div>

          <div className="ai-chat-footer">
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
              <button
                type="button"
                className="chip-toggle"
                onClick={() => handleSendAiChat('Tư vấn giá xe cho lộ trình hiện tại')}
              >
                💰 Hỏi giá xe
              </button>
              <button
                type="button"
                className="chip-toggle"
                onClick={() => handleSendAiChat('Hôm nay ăn món gì ngon và rẻ?')}
              >
                🍜 Gợi ý món ăn
              </button>
              <button
                type="button"
                className="chip-toggle"
                onClick={() => handleSendAiChat('Có mã giảm giá nào đang dùng được?')}
              >
                🎟️ Hỏi mã giảm giá
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                className="form-input"
                placeholder="Nhập câu hỏi cho AI..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiChat()}
              />
              <button
                className="btn-primary"
                style={{ width: '76px' }}
                onClick={() => handleSendAiChat()}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
