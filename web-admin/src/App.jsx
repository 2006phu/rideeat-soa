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
const RIDE_STATE_LABELS = {
  REQUESTED: 'Đang tìm xe',
  DRIVER_ASSIGNED: 'Tài xế đã nhận',
  ARRIVING: 'Đang đến đón',
  IN_PROGRESS: 'Đang di chuyển',
  COMPLETED: 'Đã đến nơi'
};

const FOOD_STATES = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED'];
const FOOD_STATE_LABELS = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Quán đã nhận',
  PREPARING: 'Đang nấu món',
  DELIVERING: 'Tài xế đang giao',
  DELIVERED: 'Đã giao xong'
};

const DEMO_ACCOUNTS = {
  CUSTOMER: {
    id: 'usr-customer-001',
    role: 'CUSTOMER',
    roleLabel: 'Khách hàng',
    icon: '👤',
    name: 'Nguyễn Văn A',
    email: 'customer@rideeat.vn',
    defaultTab: 'RIDE',
    allowedTabs: ['RIDE', 'FOOD', 'WALLET']
  },
  DRIVER: {
    id: 'drv-partner-001',
    role: 'DRIVER',
    roleLabel: 'Tài xế',
    icon: '🛵',
    name: 'Trần Minh Tài',
    email: 'driver@rideeat.vn',
    defaultTab: 'PARTNER',
    allowedTabs: ['PARTNER', 'WALLET']
  },
  RESTAURANT: {
    id: 'rst-partner-001',
    role: 'RESTAURANT',
    roleLabel: 'Chủ quán ăn',
    icon: '🏪',
    name: 'Phở Thìn Bờ Hồ',
    email: 'restaurant@rideeat.vn',
    defaultTab: 'MERCHANT',
    allowedTabs: ['MERCHANT', 'WALLET']
  },
  ADMIN: {
    id: 'adm-system-001',
    role: 'ADMIN',
    roleLabel: 'Quản trị viên',
    icon: '🛡️',
    name: 'Quản trị viên RideEat',
    email: 'admin@rideeat.vn',
    defaultTab: 'ADMIN',
    allowedTabs: ['ADMIN', 'RIDE', 'FOOD', 'WALLET']
  }
};

export default function App() {
  // Start at Login screen (currentUser === null)
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('LOGIN'); // LOGIN | REGISTER
  const [selectedPresetRole, setSelectedPresetRole] = useState('CUSTOMER');
  const [loginEmail, setLoginEmail] = useState('customer@rideeat.vn');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [registerName, setRegisterName] = useState('');
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseEmail, setFirebaseEmail] = useState('phu2006@gmail.com');
  const [firebaseName, setFirebaseName] = useState('Phú Nguyễn');
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

  // Ride State
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

  // Food State
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([
    { id: 'f-01', name: 'Phở Bò Tái Lăn Đặc Biệt', price: 65000, quantity: 1, image: '🍜' }
  ]);
  const [activeFoodOrder, setActiveFoodOrder] = useState(null);

  // Driver State
  const [driverOnline, setDriverOnline] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifyMessage, setOtpVerifyMessage] = useState('');

  // Admin Logs
  const [eventLogs, setEventLogs] = useState([]);

  // Floating Gemini AI Assistant State (API Key read silently from env/storage, never shown on UI)
  const [aiOpen, setAiOpen] = useState(false);
  const aiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('RIDEEAT_GEMINI_KEY') || '';
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'bot',
      text: 'Xin chào! Mình là Trợ lý AI RideEat. Bạn cần tư vấn giá xe, gợi ý món ngon hay mã giảm giá hôm nay?'
    }
  ]);

  const handleSelectRolePreset = (roleKey) => {
    const preset = DEMO_ACCOUNTS[roleKey];
    setSelectedPresetRole(roleKey);
    setLoginEmail(preset.email);
    setLoginPassword('Password123!');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const emailLower = loginEmail.trim().toLowerCase();
    let matchedRole = selectedPresetRole;
    if (emailLower.includes('driver')) matchedRole = 'DRIVER';
    else if (emailLower.includes('restaurant')) matchedRole = 'RESTAURANT';
    else if (emailLower.includes('admin')) matchedRole = 'ADMIN';
    else if (emailLower.includes('customer')) matchedRole = 'CUSTOMER';

    const preset = DEMO_ACCOUNTS[matchedRole] || DEMO_ACCOUNTS.CUSTOMER;
    const res = await apiRegistry.auth.login(loginEmail.trim(), loginPassword, matchedRole);
    const displayName =
      authMode === 'REGISTER' && registerName.trim()
        ? registerName.trim()
        : res?.user?.full_name || preset.name;

    const userObj = {
      ...preset,
      email: loginEmail.trim(),
      name: displayName,
      authProvider: 'JWT'
    };
    setCurrentUser(userObj);
    setActiveTab(userObj.defaultTab);
  };

  const handleFirebaseLogin = async (customEmail, customName) => {
    const email = (customEmail || firebaseEmail).trim().toLowerCase();
    const fullName = (customName || firebaseName).trim() || email.split('@')[0];
    const preset = DEMO_ACCOUNTS[selectedPresetRole] || DEMO_ACCOUNTS.CUSTOMER;

    const res = await apiRegistry.auth.firebaseLogin({
      email,
      fullName,
      role: selectedPresetRole
    });

    const userObj = {
      ...preset,
      id: res?.user?.id || `fb-${Date.now()}`,
      email,
      name: res?.user?.full_name || fullName,
      authProvider: 'Firebase OAuth'
    };
    setShowFirebaseModal(false);
    setCurrentUser(userObj);
    setActiveTab(userObj.defaultTab);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAiOpen(false);
  };

  const handleSendAiChat = async (customPrompt) => {
    const question = (customPrompt ?? aiInput).trim();
    if (!question || aiLoading) return;
    setAiInput('');
    const updatedHistory = [...aiMessages, { role: 'user', text: question }];
    setAiMessages(updatedHistory);
    setAiLoading(true);

    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId) || HCMC_LOCATIONS[1];
    const systemInstruction = `Bạn là Trợ lý AI thông minh của ứng dụng RideEat (Đặt xe & Giao đồ ăn).
Thông tin hiện tại của khách:
- Khách hàng: ${currentUser?.name || 'Khách'}
- Số dư ví: ${walletBalance.toLocaleString('vi-VN')}đ
- Lộ trình đang chọn: ${pickup.name} -> ${dropoff.name} (${routeInfo.distance_km}km, ~${routeInfo.duration_minutes} phút)
- Giá xe máy: ${fareEstimates[0]?.finalFare?.toLocaleString('vi-VN') || '18.000'}đ, Ô tô 4 chỗ: ${fareEstimates[1]?.finalFare?.toLocaleString('vi-VN') || '45.000'}đ
- Thực đơn các quán trên hệ thống:
  1. Phở Thìn Bờ Hồ: Phở Bò Tái Lăn (65.000đ), Phở Gà Ta (55.000đ)
  2. Cơm Tấm Sài Gòn Xưa: Cơm Tấm Sườn Bì Chả (55.000đ), Cơm Gà Xối Mỡ (50.000đ)
  3. Bún Bò Huế Sông Hương: Bún Bò Đặc Biệt (60.000đ), Chả Cua Huế (25.000đ)
  4. Trà Sữa & Ăn Vặt Gong Cha: Trà Sữa Trân Châu Đen (45.000đ), Bánh Mì Nướng Bơ Tỏi (30.000đ)
- Voucher đang có: RIDEEAT50 (Giảm 50% tối đa 25k), FREESHIP15K (Giảm 15k)
Lưu ý: Nếu khách nói KHÔNG muốn ăn món nào (ví dụ "không muốn ăn phở"), TUYỆT ĐỐI KHÔNG gợi ý lại món đó mà đổi sang món khác (như Cơm Tấm, Bún Bò Huế, Gà Xối Mỡ hoặc Trà Sữa). Trả lời ngắn gọn (2-3 câu), tự nhiên bằng tiếng Việt.`;

    try {
      if (aiKey.trim()) {
        // Gemini API strictly requires contents[0].role === 'user' and alternating user/model turns
        const geminiContents = [];
        for (const m of updatedHistory.slice(-8)) {
          const geminiRole = m.role === 'user' ? 'user' : 'model';
          if (geminiContents.length === 0 && geminiRole !== 'user') {
            continue; // Skip initial bot greeting so first turn is always 'user'
          }
          if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === geminiRole) {
            geminiContents[geminiContents.length - 1].parts[0].text += '\n' + m.text;
          } else {
            geminiContents.push({
              role: geminiRole,
              parts: [{ text: m.text }]
            });
          }
        }

        if (geminiContents.length > 0) {
          geminiContents[geminiContents.length - 1].parts[0].text =
            `${systemInstruction}\n\nKhách hỏi: "${question}"`;
        }

        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const modelName of modelsToTry) {
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(aiKey.trim())}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: geminiContents })
              }
            );
            if (resp.ok) {
              const data = await resp.json();
              const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (reply) {
                setAiMessages((prev) => [...prev, { role: 'bot', text: reply }]);
                setAiLoading(false);
                return;
              }
            }
          } catch {
            // Try next model
          }
        }
      }

      const q = question.toLowerCase();
      const isNegation =
        q.includes('không') || q.includes('đổi') || q.includes('khác') || q.includes('ngán') || q.includes('chán');

      let replyText = '';
      if (isNegation && q.includes('phở')) {
        replyText =
          'Nếu bạn không thích ăn Phở hôm nay, mình đổi sang Cơm Tấm Sườn Bì Chả (55.000đ), Bún Bò Huế Sông Hương (60.000đ) hoặc Gà Xối Mỡ giòn rụm kèm Trà Sữa Trân Châu (45.000đ) nhé!';
      } else if (isNegation && q.includes('cơm')) {
        replyText =
          'Nếu bạn ngán Cơm rồi thì thử ngay một tô Bún Bò Huế Sông Hương cay nhẹ (60.000đ) hoặc Phở Bò Tái Lăn (65.000đ) kèm Trà Sữa Gong Cha đổi vị nhé!';
      } else if (isNegation && (q.includes('ăn') || q.includes('món'))) {
        replyText =
          'Vậy mình đổi sang món nước thanh mát nhé: Trà Sữa Trân Châu Hoàng Kim (45.000đ) hoặc Bún Bò Huế Đặc Biệt (60.000đ), đang có ưu đãi giảm 50% (mã RIDEEAT50)!';
      } else if (q.includes('cơm') || q.includes('gà') || q.includes('sườn')) {
        replyText =
          'Bạn muốn ăn cơm thì quán "Cơm Tấm Sài Gòn Xưa" đang có 2 món bán chạy nhất: Cơm Tấm Sườn Bì Chả Trứng Ốp La (55.000đ) và Cơm Gà Xối Mỡ Giòn Rụm (50.000đ). Bạn qua mục Đặt đồ ăn thêm vào giỏ và áp mã FREESHIP15K nhé!';
      } else if (q.includes('bún') || q.includes('huế') || q.includes('cay')) {
        replyText =
          'Nếu bạn thích ăn bún, quán "Bún Bò Huế Sông Hương" có tô Bún Bò Đặc Biệt Giò Heo (60.000đ) và Chả Cua Huế (25.000đ) cực kỳ đậm đà, giao nóng tận nơi trong 15 phút!';
      } else if (q.includes('phở')) {
        replyText =
          'Món Phở ngon nhất hôm nay là Phở Bò Tái Lăn Đặc Biệt (65.000đ) và Phở Gà Ta (55.000đ) tại quán Phở Thìn Bờ Hồ (đánh giá 4.9★).';
      } else if (q.includes('trà sữa') || q.includes('uống') || q.includes('nước') || q.includes('bánh mì')) {
        replyText =
          'Quán Gong Cha đang có Trà Sữa Trân Châu Đen (45.000đ) và Bánh Mì Nướng Bơ Tỏi (30.000đ). Đặt kèm đơn ăn trưa sẽ được giảm ngay 15.000đ phí ship!';
      } else if (q.includes('ăn') || q.includes('món') || q.includes('đói') || q.includes('ngon')) {
        replyText =
          'Hôm nay thực đơn có 4 quán nổi bật: Cơm Tấm Sườn Bì Chả (55.000đ), Bún Bò Huế (60.000đ), Phở Thìn (65.000đ) và Trà Sữa Gong Cha (45.000đ). Bạn đang thèm món khô hay món nước?';
      } else if (q.includes('mã') || q.includes('voucher') || q.includes('khuyến mãi') || q.includes('giảm')) {
        replyText =
          'Bạn đang có mã RIDEEAT50 (giảm 50% tối đa 25.000đ) và FREESHIP15K (giảm 15.000đ phí ship). Chọn mã ngay ở mục Khuyến mãi khi đặt đơn nhé!';
      } else {
        replyText = `Với lộ trình ${pickup.name} → ${dropoff.name} (${routeInfo.distance_km} km), cước Xe máy là ${fareEstimates[0]?.finalFare?.toLocaleString('vi-VN') || '18.000'}đ và Ô tô 4 chỗ là ${fareEstimates[1]?.finalFare?.toLocaleString('vi-VN') || '45.000'}đ. Bạn cần mình hỗ trợ đặt xe hay chọn món ăn?`;
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
    if (!currentUser || activeTab !== 'RIDE' || !mapContainerRef.current || !window.L) return;

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
  }, [currentUser, activeTab, pickupId, dropoffId, routeInfo, activeRide, driverStepIndex]);

  useEffect(() => {
    if ((!currentUser || activeTab !== 'RIDE') && leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      leafletLayerGroupRef.current = null;
    }
  }, [currentUser, activeTab]);

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
      userId: currentUser?.id || 'usr-customer-001',
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
      state: 'REQUESTED',
      pickupName: pickup.name,
      dropoffName: dropoff.name,
      fare: currentVehicleEstimate.finalFare,
      vehicleName: currentVehicleEstimate.vehicleName
    });
    setOtpInput(res.otp_code);
    setDriverStepIndex(0);
  };

  // Tự động chạy xe trên bản đồ & tự động chuyển trạng thái chuyến xe (Real-time Simulation)
  useEffect(() => {
    if (!activeRide || activeRide.state === 'COMPLETED') return;

    const totalSteps = Math.max(12, routeInfo.polyline?.length || 16);
    const timer = setInterval(() => {
      setDriverStepIndex((prevStep) => {
        const nextStep = Math.min(prevStep + 1, totalSteps - 1);
        const progressRatio = nextStep / (totalSteps - 1);

        let nextState = 'REQUESTED';
        if (progressRatio >= 1) nextState = 'COMPLETED';
        else if (progressRatio >= 0.45) nextState = 'IN_PROGRESS';
        else if (progressRatio >= 0.22) nextState = 'ARRIVING';
        else if (progressRatio >= 0.08) nextState = 'DRIVER_ASSIGNED';

        setActiveRide((curr) => (curr && curr.state !== nextState ? { ...curr, state: nextState } : curr));
        return nextStep;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [activeRide?.ride_id, activeRide?.state, routeInfo.polyline]);

  // Tự động chuyển trạng thái đơn đồ ăn (Real-time Order Progression)
  useEffect(() => {
    if (!activeFoodOrder || activeFoodOrder.state === 'DELIVERED') return;

    const timer = setInterval(() => {
      setActiveFoodOrder((curr) => {
        if (!curr || curr.state === 'DELIVERED') return curr;
        const idx = FOOD_STATES.indexOf(curr.state);
        const next = FOOD_STATES[Math.min(idx + 1, FOOD_STATES.length - 1)];
        return { ...curr, state: next };
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [activeFoodOrder?.order_id, activeFoodOrder?.state]);

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
      userId: currentUser?.id || 'usr-customer-001',
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
      items: [...cart],
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
      setOtpVerifyMessage('Hiện chưa có chuyến xe nào đang chờ.');
      return;
    }
    if (otpInput.trim() === activeRide.otp_code) {
      setActiveRide({ ...activeRide, state: 'IN_PROGRESS' });
      setDriverStepIndex(8);
      setOtpVerifyMessage(`✅ Xác nhận mã OTP thành công! Đang thực hiện chuyến đi.`);
    } else {
      setOtpVerifyMessage('❌ Mã OTP chưa đúng.');
    }
  };

  const microservicesCatalog = apiRegistry.monitor.getMicroservicesCatalog();

  // ============================================================================
  // 1. MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ (HIỂN THỊ ĐẦU TIÊN KHI VÀO WEB)
  // ============================================================================
  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo">🛵</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>RideEat</h1>
            <p className="price-sub">Ứng dụng Đặt xe & Giao đồ ăn trực tuyến</p>
          </div>

          <div className="nav-tabs" style={{ marginBottom: '16px' }}>
            <button
              type="button"
              className={`nav-tab ${authMode === 'LOGIN' ? 'active' : ''}`}
              onClick={() => setAuthMode('LOGIN')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`nav-tab ${authMode === 'REGISTER' ? 'active' : ''}`}
              onClick={() => setAuthMode('REGISTER')}
            >
              Đăng ký
            </button>
          </div>

          <div className="form-label">Chọn vai trò đăng nhập</div>
          <div className="auth-role-grid">
            {Object.values(DEMO_ACCOUNTS).map((acc) => (
              <button
                key={acc.role}
                type="button"
                className={`auth-role-item ${selectedPresetRole === acc.role ? 'active' : ''}`}
                onClick={() => handleSelectRolePreset(acc.role)}
              >
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                  {acc.icon} {acc.roleLabel}
                </div>
                <div className="price-sub">{acc.name}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'REGISTER' && (
              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập họ tên của bạn..."
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                className="form-input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary">
              {authMode === 'LOGIN' ? 'Đăng nhập vào RideEat' : 'Tạo tài khoản & Bắt đầu'}
            </button>
          </form>

          <div className="auth-divider">hoặc xác thực qua Firebase</div>

          <button
            type="button"
            className="btn-firebase"
            onClick={() => setShowFirebaseModal(true)}
          >
            <span>🔥</span>
            <span>Đăng nhập bằng Google (Firebase Auth)</span>
          </button>
        </div>

        {/* FIREBASE GOOGLE OAUTH POPUP (rideate-project) */}
        {showFirebaseModal && (
          <div className="modal-backdrop" onClick={() => setShowFirebaseModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="card-header">
                <div className="card-title">🔥 Đăng nhập với Google (Firebase)</div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFirebaseModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="price-sub" style={{ marginBottom: '12px' }}>
                Xác thực qua Firebase Project: <strong className="mono">rideate-project</strong> (Vai trò:{' '}
                <strong>{DEMO_ACCOUNTS[selectedPresetRole]?.roleLabel}</strong>)
              </div>

              <div className="form-group">
                <label className="form-label">Họ tên tài khoản Google</label>
                <input
                  type="text"
                  className="form-input"
                  value={firebaseName}
                  onChange={(e) => setFirebaseName(e.target.value)}
                  placeholder="Nhập tên hiển thị..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Email Google (@gmail.com)</label>
                <input
                  type="email"
                  className="form-input"
                  value={firebaseEmail}
                  onChange={(e) => setFirebaseEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                />
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleFirebaseLogin()}
              >
                🔥 Xác nhận đăng nhập Firebase
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. GIAO DIỆN CHÍNH SAU KHI ĐĂNG NHẬP (THEO ĐÚNG VAI TRÒ CỦA USER)
  // ============================================================================
  return (
    <div className="app-shell">
      {/* HEADER */}
      <header className="top-header">
        <div className="brand-box">
          <div className="brand-logo">🛵</div>
          <div className="brand-title">
            <h1>
              RideEat
              <span className="badge-soa">{currentUser.roleLabel}</span>
            </h1>
            <p className="brand-subtitle">
              Xin chào, <strong>{currentUser.name}</strong> ({currentUser.email})
            </p>
          </div>
        </div>

        <div className="header-pills">
          <div className="wallet-pill">
            <span>Số dư ví:</span>
            <span className="wallet-amount">{walletBalance.toLocaleString('vi-VN')} đ</span>
          </div>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS (HIỂN THỊ ĐÚNG CHỨC NĂNG CỦA TỪNG VAI TRÒ) */}
      <nav className="nav-tabs">
        {currentUser.allowedTabs.includes('RIDE') && (
          <button
            className={`nav-tab ${activeTab === 'RIDE' ? 'active' : ''}`}
            onClick={() => setActiveTab('RIDE')}
          >
            🛵 Đặt xe
          </button>
        )}
        {currentUser.allowedTabs.includes('FOOD') && (
          <button
            className={`nav-tab ${activeTab === 'FOOD' ? 'active' : ''}`}
            onClick={() => setActiveTab('FOOD')}
          >
            🍔 Đặt đồ ăn
          </button>
        )}
        {currentUser.allowedTabs.includes('PARTNER') && (
          <button
            className={`nav-tab ${activeTab === 'PARTNER' ? 'active' : ''}`}
            onClick={() => setActiveTab('PARTNER')}
          >
            🛵 Nhận chuyến & Giao hàng
          </button>
        )}
        {currentUser.allowedTabs.includes('MERCHANT') && (
          <button
            className={`nav-tab ${activeTab === 'MERCHANT' ? 'active' : ''}`}
            onClick={() => setActiveTab('MERCHANT')}
          >
            🏪 Quản lý đơn & Thực đơn
          </button>
        )}
        {currentUser.allowedTabs.includes('ADMIN') && (
          <button
            className={`nav-tab ${activeTab === 'ADMIN' ? 'active' : ''}`}
            onClick={() => setActiveTab('ADMIN')}
          >
            📊 Quản trị hệ thống
          </button>
        )}
        {currentUser.allowedTabs.includes('WALLET') && (
          <button
            className={`nav-tab ${activeTab === 'WALLET' ? 'active' : ''}`}
            onClick={() => setActiveTab('WALLET')}
          >
            💳 Ví & Lịch sử giao dịch
          </button>
        )}
      </nav>

      {/* MÀN HÌNH KHÁCH HÀNG: ĐẶT XE */}
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
              {activeRide && (
                <span className="badge-soa">
                  {RIDE_STATE_LABELS[activeRide.state] || activeRide.state}
                </span>
              )}
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
                  <span className="oop-tag">
                    {activeRide.state === 'COMPLETED' ? '✅ Hoàn tất' : '🛵 Xe đang tự động di chuyển...'}
                  </span>
                </div>

                <div className="state-stepper">
                  {RIDE_STATES.map((st, idx) => {
                    const currentIdx = RIDE_STATES.indexOf(activeRide.state);
                    const cls = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
                    return (
                      <div key={st} className={`step-pill ${cls}`}>
                        {RIDE_STATE_LABELS[st] || st}
                      </div>
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
                Chọn điểm đón, điểm đến và bấm <strong>Đặt xe ngay</strong> để theo dõi xe chạy trực tiếp trên bản đồ.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MÀN HÌNH KHÁCH HÀNG: ĐẶT ĐỒ ĂN */}
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
                  <span className="oop-tag">
                    {activeFoodOrder.state === 'DELIVERED' ? '✅ Hoàn tất' : '🛵 Tự động cập nhật...'}
                  </span>
                </div>
                <div className="state-stepper">
                  {FOOD_STATES.map((st, idx) => {
                    const currentIdx = FOOD_STATES.indexOf(activeFoodOrder.state);
                    const cls = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
                    return (
                      <div key={st} className={`step-pill ${cls}`}>
                        {FOOD_STATE_LABELS[st] || st}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MÀN HÌNH TÀI XẾ: NHẬN CHUYẾN & GIAO HÀNG */}
      {activeTab === 'PARTNER' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Trạng thái hoạt động</div>
              <span className="badge-soa">{driverOnline ? 'Đang bật nhận chuyến' : 'Đang tạm nghỉ'}</span>
            </div>

            <div className="vehicle-item" style={{ marginBottom: '12px' }}>
              <div className="vehicle-left">
                <span className="vehicle-icon">🛵</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{currentUser.name}</div>
                  <div className="price-sub">Honda SH • Biển số: 59-X3 888.99 • Đánh giá: 4.96 ★</div>
                </div>
              </div>
              <button className="btn-secondary" onClick={() => setDriverOnline(!driverOnline)}>
                {driverOnline ? 'Tắt nhận chuyến' : 'Bật nhận chuyến'}
              </button>
            </div>

            <div className="info-box">
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Xác nhận mã OTP khi đón khách</div>
              <div className="price-sub" style={{ marginBottom: '8px' }}>
                {activeRide
                  ? `Chuyến hiện tại: ${activeRide.ride_id} (Mã OTP của khách: ${activeRide.otp_code})`
                  : 'Nhập mã OTP 4 số từ khách hàng để bắt đầu hành trình.'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="form-input mono"
                  placeholder="Nhập mã OTP..."
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                />
                <button className="btn-primary" style={{ width: '160px' }} onClick={handleDriverVerifyOtp}>
                  Bắt đầu chuyến
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
              <div className="card-title">Cuốc xe & Đơn hàng cần giao</div>
              <span className="oop-tag">{driverOnline ? 'Sẵn sàng' : 'Tạm dừng'}</span>
            </div>

            {activeRide ? (
              <div className="info-box">
                <div style={{ fontWeight: 700 }}>🛵 Cuốc xe: {activeRide.ride_id}</div>
                <div className="price-sub" style={{ margin: '4px 0' }}>
                  Lộ trình: {activeRide.pickupName || 'Chợ Bến Thành'} → {activeRide.dropoffName || 'Landmark 81'}
                </div>
                <div className="price-main" style={{ marginBottom: '8px' }}>
                  Thu nhập chuyến: {activeRide.fare?.toLocaleString('vi-VN')} đ
                </div>
                <button className="btn-primary" onClick={handleAdvanceRideState}>
                  Cập nhật tiến độ chuyến ({activeRide.state})
                </button>
              </div>
            ) : (
              <div className="vehicle-item">
                <div>
                  <div style={{ fontWeight: 600 }}>🛵 Chợ Bến Thành → Vinhomes Landmark 81</div>
                  <div className="price-sub">Khoảng cách: 3.9 km • Khách hàng: Nguyễn Văn A</div>
                </div>
                <button
                  className="btn-primary"
                  style={{ width: 'auto' }}
                  onClick={handleBookRide}
                >
                  Nhận chuyến (28.000đ)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MÀN HÌNH CHỦ QUÁN: QUẢN LÝ ĐƠN & THỰC ĐƠN */}
      {activeTab === 'MERCHANT' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Đơn đặt món mới</div>
              <span className="badge-soa">Đang mở cửa</span>
            </div>

            {activeFoodOrder ? (
              <div className="info-box">
                <div style={{ fontWeight: 700 }}>Đơn hàng #{activeFoodOrder.order_id}</div>
                <div className="price-sub" style={{ margin: '4px 0' }}>
                  Trạng thái: <strong>{activeFoodOrder.state}</strong> • Tổng tiền: {activeFoodOrder.total?.toLocaleString('vi-VN')} đ
                </div>
                <button
                  className="btn-primary"
                  style={{ marginTop: '8px' }}
                  onClick={() => {
                    const idx = FOOD_STATES.indexOf(activeFoodOrder.state);
                    const next = FOOD_STATES[Math.min(idx + 1, FOOD_STATES.length - 1)];
                    setActiveFoodOrder({ ...activeFoodOrder, state: next });
                  }}
                >
                  Xác nhận bước tiếp theo →
                </button>
              </div>
            ) : (
              <div className="price-sub" style={{ padding: '20px', textAlign: 'center' }}>
                Hiện chưa có đơn đặt món mới nào chờ xác nhận.
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Thực đơn của quán ({selectedRestaurant?.name})</div>
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
                    <span className="badge-soa">Đang bán</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MÀN HÌNH VÍ & LỊCH SỬ GIAO DỊCH */}
      {activeTab === 'WALLET' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Ví điện tử RideEat</div>
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

      {/* MÀN HÌNH QUẢN TRỊ VIÊN (CHỈ ADMIN MỚI THẤY) */}
      {activeTab === 'ADMIN' && (
        <div>
          <div className="grid-3" style={{ marginBottom: '18px' }}>
            {microservicesCatalog.map((svc) => (
              <div key={svc.id} className="card">
                <div className="card-header">
                  <div className="card-title">
                    <span className="status-dot" />
                    {svc.name}
                  </div>
                  <span className="oop-tag">:{svc.port}</span>
                </div>
                <div className="price-sub">{svc.boundedContext}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Nhật ký hoạt động hệ thống</div>
            </div>
            <div className="event-log">
              {eventLogs.length === 0 ? (
                <div className="price-sub">Chưa có sự kiện mới.</div>
              ) : (
                eventLogs.map((ev) => (
                  <div key={ev.id} className="event-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{ev.eventName || ev.endpoint}</strong>
                      <span className="price-sub mono">{ev.service}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING AI CHAT WIDGET */}
      <button className="ai-fab" onClick={() => setAiOpen(!aiOpen)}>
        🤖 {aiOpen ? 'Đóng Trợ lý AI' : 'Trợ lý AI RideEat'}
      </button>

      {aiOpen && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <span>🤖 Trợ lý AI RideEat</span>
            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              onClick={() => setAiOpen(false)}
            >
              ✕
            </button>
          </div>

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
