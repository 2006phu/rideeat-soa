import React, { useState, useEffect, useRef } from 'react';
import { apiRegistry, soaEventBus } from './services/ApiClient.js';
import { signInWithGooglePopup } from './services/firebaseClient.js';

const HCMC_LOCATIONS = [
  { id: 'ben-thanh', name: 'Chợ Bến Thành, Quận 1', lat: 10.7726, lng: 106.6980 },
  { id: 'landmark-81', name: 'Vinhomes Landmark 81, Bình Thạnh', lat: 10.7950, lng: 106.7218 },
  { id: 'nguyen-hue', name: 'Phố Đi Bộ Nguyễn Huệ, Quận 1', lat: 10.7744, lng: 106.7035 },
  { id: 'tan-son-nhat', name: 'Sân Bay Tân Sơn Nhất', lat: 10.8185, lng: 106.6588 },
  { id: 'dh-khtn', name: 'ĐH Khoa Học Tự Nhiên, Quận 5', lat: 10.7629, lng: 106.6822 },
  { id: 'sala-thu-thiem', name: 'Khu Đô Thị Sala, TP. Thủ Đức', lat: 10.7719, lng: 106.7224 }
];

const RIDE_STATES = ['REQUESTED', 'DRIVER_ASSIGNED', 'ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
const RIDE_STATE_LABELS = {
  REQUESTED: '1. Tìm tài xế',
  DRIVER_ASSIGNED: '2. Đã ghép đôi',
  ARRIVING: '3. Đến điểm đón',
  ARRIVED: '4. Đã đến nơi',
  IN_PROGRESS: '5. Đang di chuyển',
  COMPLETED: '6. Hoàn thành'
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
    allowedTabs: ['RIDE', 'FOOD', 'WALLET', 'PROMO', 'RATING']
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
    allowedTabs: ['ADMIN', 'RIDE', 'FOOD', 'WALLET', 'PROMO', 'RATING']
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
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');
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

  // Ride State & Realistic Simulation Lifecycle
  const [pickupId, setPickupId] = useState('ben-thanh');
  const [dropoffId, setDropoffId] = useState('landmark-81');
  const [weather, setWeather] = useState('CLEAR');
  const [isPeakHour, setIsPeakHour] = useState(false);
  const [selectedVehicleCode, setSelectedVehicleCode] = useState('BIKE');
  const [routeInfo, setRouteInfo] = useState({ distance_km: 3.9, duration_minutes: 10, polyline: [] });
  const [fareEstimates, setFareEstimates] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [rideStage, setRideStage] = useState('IDLE'); // IDLE | SEARCHING | ARRIVING | ARRIVED | IN_PROGRESS | COMPLETED
  const [searchProgress, setSearchProgress] = useState(0);
  const [nearbyRadarDrivers, setNearbyRadarDrivers] = useState([]);
  const [approachPolyline, setApproachPolyline] = useState([]);
  const [approachStep, setApproachStep] = useState(0);
  const [driverStepIndex, setDriverStepIndex] = useState(0);
  const [driverBearing, setDriverBearing] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [assignedDriverInfo, setAssignedDriverInfo] = useState({
    name: 'Trần Minh Tài',
    plate: '59-X3 888.99',
    vehicle: 'Honda SH 150i ABS',
    rating: 4.98
  });
  const [showRatingModal, setShowRatingModal] = useState(false);

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

  // Invoice & Rating State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [ratingTargetType, setRatingTargetType] = useState('driver');
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reviewsList, setReviewsList] = useState([
    {
      id: 'rev-01',
      reviewerName: 'Nguyễn Văn A',
      targetType: 'driver',
      targetName: 'Trần Minh Tài',
      stars: 5,
      comment: 'Tài xế lái xe rất an toàn, xe SH êm ái, đúng giờ.',
      time: '10 phút trước',
      refId: 'RIDE-88129'
    },
    {
      id: 'rev-02',
      reviewerName: 'Trần Thị B',
      targetType: 'restaurant',
      targetName: 'Phở Thìn Bờ Hồ',
      stars: 5,
      comment: 'Phở bò tái lăn chuẩn vị Hà Nội, nước dùng nóng hổi thơm phức.',
      time: '1 giờ trước',
      refId: 'ORD-99412'
    }
  ]);

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

  const handleGoogleSignIn = async () => {
    setFirebaseError('');
    setFirebaseLoading(true);
    try {
      const googleUser = await signInWithGooglePopup();
      const preset = DEMO_ACCOUNTS[selectedPresetRole] || DEMO_ACCOUNTS.CUSTOMER;

      // Backend Token Exchange (Step 2 & Step 4 OOP Standard)
      await apiRegistry.auth.googleOAuthExchange({
        idToken: googleUser.idToken,
        role: selectedPresetRole
      });

      const userObj = {
        ...preset,
        id: googleUser.uid,
        email: googleUser.email,
        name: googleUser.displayName,
        photoURL: googleUser.photoURL,
        authProvider: 'Google OAuth2 (Backend Exchange)'
      };
      setCurrentUser(userObj);
      setActiveTab(userObj.defaultTab);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      const code = err.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setFirebaseError('Cửa sổ đăng nhập Google đã được đóng.');
      } else {
        setFirebaseError('Đăng nhập Google trực tiếp đang hoạt động. Bạn cũng có thể chọn 1 trong 4 vai trò nhanh phía trên để trải nghiệm ngay!');
      }
    } finally {
      setFirebaseLoading(false);
    }
  };

  const handleViewInvoice = (tx) => {
    const subtotal = Math.round(tx.amount / 1.08);
    const vat = tx.amount - subtotal;
    setSelectedInvoice({
      invoiceNumber: tx.invoice_number || `INV-${tx.transaction_id.slice(-6)}`,
      companyName: 'RideEat Mobility & Food Delivery Co., Ltd.',
      taxId: '0318999888',
      issuedAt: tx.timestamp || 'Hôm nay',
      user: currentUser?.name || 'Nguyễn Văn A',
      userId: currentUser?.id || 'usr-customer-001',
      description: tx.description,
      paymentMethod: tx.method,
      subtotal,
      vat,
      total: tx.amount
    });
  };

  const handleSubmitRating = async () => {
    if (!ratingComment.trim()) return;
    try {
      await apiRegistry.rating.submitReview({
        reviewerId: currentUser?.id || 'usr-customer-001',
        targetId: ratingTargetType === 'driver' ? 'drv-partner-001' : 'rst-partner-001',
        targetType: ratingTargetType,
        referenceId: `REF-${Date.now().toString().slice(-5)}`,
        stars: ratingStars,
        comment: ratingComment.trim(),
        imageUrl: null
      });

      const newReview = {
        id: `rev-${Date.now()}`,
        reviewerName: currentUser?.name || 'Khách hàng',
        targetType: ratingTargetType,
        targetName: ratingTargetType === 'driver' ? 'Trần Minh Tài' : 'Phở Thìn Bờ Hồ',
        stars: ratingStars,
        comment: ratingComment.trim(),
        time: 'Vừa xong',
        refId: `REF-${Date.now().toString().slice(-4)}`
      };
      setReviewsList([newReview, ...reviewsList]);
      setRatingComment('');
      setWalletBalance((prev) => prev + 5000);
      alert('Cảm ơn bạn đã gửi đánh giá! Bạn được tặng +5.000đ vào ví RideEat.');
    } catch (e) {
      console.warn('Rating submit error:', e);
    }
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

  const handleSwapLocations = () => {
    const temp = pickupId;
    setPickupId(dropoffId);
    setDropoffId(temp);
  };

  // Render Leaflet Map (Grab-style Custom DivIcon Pins, Sonar Radar & Dynamic Heading)
  useEffect(() => {
    if (!currentUser || activeTab !== 'RIDE' || !mapContainerRef.current || !window.L) return;

    if (!leafletMapRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([10.778, 106.705], 13);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
      leafletLayerGroupRef.current = window.L.layerGroup().addTo(map);
    }

    const map = leafletMapRef.current;
    const layerGroup = leafletLayerGroupRef.current;
    layerGroup.clearLayers();

    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId) || HCMC_LOCATIONS[1];

    // 1. Pickup Pin with High-End Badge
    const pickupHtml = `
      <div class="custom-leaflet-marker">
        <div class="pin-pickup-badge">🟢 ${pickup.name.split(',')[0]}</div>
      </div>
    `;
    const pickupIcon = window.L.divIcon({
      html: pickupHtml,
      className: '',
      iconSize: [140, 32],
      iconAnchor: [70, 16]
    });
    window.L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
      .addTo(layerGroup)
      .bindPopup(`<b>Điểm đón:</b> ${pickup.name}`);

    // 2. Dropoff Pin with Checker Flag
    const dropoffHtml = `
      <div class="custom-leaflet-marker">
        <div class="pin-dropoff-badge">🏁 ${dropoff.name.split(',')[0]}</div>
      </div>
    `;
    const dropoffIcon = window.L.divIcon({
      html: dropoffHtml,
      className: '',
      iconSize: [140, 32],
      iconAnchor: [70, 16]
    });
    window.L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon })
      .addTo(layerGroup)
      .bindPopup(`<b>Điểm đến:</b> ${dropoff.name}`);

    // 3. Stage 1: SEARCHING (Sonar Radar Wave & Ghost Drivers)
    if (rideStage === 'SEARCHING') {
      const radarHtml = `<div class="radar-sonar-circle"></div>`;
      const radarIcon = window.L.divIcon({
        html: radarHtml,
        className: '',
        iconSize: [80, 80],
        iconAnchor: [40, 40]
      });
      window.L.marker([pickup.lat, pickup.lng], { icon: radarIcon, interactive: false }).addTo(layerGroup);

      nearbyRadarDrivers.forEach((ghost) => {
        const ghostHtml = `
          <div class="custom-leaflet-marker">
            <div class="pin-ghost-driver">🛵</div>
          </div>
        `;
        const ghostIcon = window.L.divIcon({
          html: ghostHtml,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        window.L.marker([ghost.lat, ghost.lng], { icon: ghostIcon })
          .addTo(layerGroup)
          .bindPopup(`<b>${ghost.name}</b> (${ghost.rating}★)<br>${ghost.vehicle}`);
      });

      map.setView([pickup.lat, pickup.lng], 15);
    }

    // 4. Stage 2: ARRIVING (Approach Dashed Route & Approaching Vehicle)
    if (rideStage === 'ARRIVING' && approachPolyline.length > 0) {
      const approachLine = window.L.polyline(approachPolyline, {
        color: '#f59e0b',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.95
      }).addTo(layerGroup);

      const currentCoord = approachPolyline[approachStep] || approachPolyline[0];
      const vehicleEmoji = selectedVehicleCode === 'BIKE' ? '🛵' : '🚗';
      const driverHtml = `
        <div class="custom-leaflet-marker" style="transform: rotate(${driverBearing}deg);">
          <div class="pin-driver-vehicle">${vehicleEmoji}</div>
        </div>
      `;
      const driverIcon = window.L.divIcon({
        html: driverHtml,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
      window.L.marker(currentCoord, { icon: driverIcon })
        .addTo(layerGroup)
        .bindPopup(`<b>${assignedDriverInfo?.name || 'Tài xế'}</b><br>Đang di chuyển đến điểm đón`);

      map.fitBounds(approachLine.getBounds(), { padding: [50, 50] });
    }

    // 5. Stage 3, 4 & 5: ARRIVED / IN_PROGRESS / COMPLETED (Full Curved Route)
    if (rideStage === 'ARRIVED' || rideStage === 'IN_PROGRESS' || rideStage === 'COMPLETED') {
      if (routeInfo.polyline && routeInfo.polyline.length > 1) {
        const mainPoly = window.L.polyline(routeInfo.polyline, {
          color: '#00b14f',
          weight: 5,
          opacity: 0.95
        }).addTo(layerGroup);

        let driverCoord = [pickup.lat, pickup.lng];
        if (rideStage === 'IN_PROGRESS') {
          const idx = Math.min(driverStepIndex, routeInfo.polyline.length - 1);
          driverCoord = routeInfo.polyline[idx] || driverCoord;
        } else if (rideStage === 'COMPLETED') {
          driverCoord = [dropoff.lat, dropoff.lng];
        }

        const vehicleEmoji = selectedVehicleCode === 'BIKE' ? '🛵' : '🚗';
        const driverHtml = `
          <div class="custom-leaflet-marker" style="transform: rotate(${driverBearing}deg);">
            <div class="pin-driver-vehicle">${vehicleEmoji}</div>
          </div>
        `;
        const driverIcon = window.L.divIcon({
          html: driverHtml,
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });
        window.L.marker(driverCoord, { icon: driverIcon })
          .addTo(layerGroup)
          .bindPopup(`<b>${assignedDriverInfo?.name || 'Tài xế'} (${assignedDriverInfo?.plate || '59-X3 888.99'})</b>`);

        if (rideStage === 'IN_PROGRESS') {
          map.panTo(driverCoord, { animate: true, duration: 0.4 });
        } else {
          map.fitBounds(mainPoly.getBounds(), { padding: [50, 50] });
        }
      }
    }

    // 6. Idle Preview
    if (rideStage === 'IDLE') {
      if (routeInfo.polyline && routeInfo.polyline.length > 1) {
        const previewPoly = window.L.polyline(routeInfo.polyline, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.75
        }).addTo(layerGroup);
        map.fitBounds(previewPoly.getBounds(), { padding: [50, 50] });
      }
    }
  }, [
    currentUser,
    activeTab,
    pickupId,
    dropoffId,
    routeInfo,
    rideStage,
    searchProgress,
    approachStep,
    driverStepIndex,
    driverBearing,
    nearbyRadarDrivers,
    approachPolyline,
    assignedDriverInfo,
    selectedVehicleCode
  ]);

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

    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];
    const dropoff = HCMC_LOCATIONS.find((l) => l.id === dropoffId) || HCMC_LOCATIONS[1];

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

    // Real-Life Stage 1: Initialize Radar Searching Phase
    const ghosts = apiRegistry.map.generateNearbyDrivers(pickup);
    setNearbyRadarDrivers(ghosts);
    setSearchProgress(0);
    setApproachStep(0);
    setDriverStepIndex(0);
    setRideStage('SEARCHING');

    const matchedDriver = ghosts[0] || {
      name: 'Trần Minh Tài',
      plate: '59-X3 888.99',
      vehicle: 'Honda SH 150i ABS',
      rating: 4.98
    };
    setAssignedDriverInfo(matchedDriver);

    setActiveRide({
      ...res,
      state: 'REQUESTED',
      pickupName: pickup.name,
      dropoffName: dropoff.name,
      fare: currentVehicleEstimate.finalFare,
      vehicleName: currentVehicleEstimate.vehicleName,
      driver: {
        name: matchedDriver.name,
        license_plate: matchedDriver.plate,
        vehicle: matchedDriver.vehicle,
        rating: matchedDriver.rating
      }
    });
    setOtpInput(res.otp_code);
  };

  // Stage 1: SEARCHING Engine (~4.5s Radar Scan)
  useEffect(() => {
    if (rideStage !== 'SEARCHING' || !activeRide) return;
    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];

    const interval = setInterval(() => {
      setSearchProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          const driver = assignedDriverInfo || nearbyRadarDrivers[0] || {
            lat: pickup.lat + 0.0020,
            lng: pickup.lng + 0.0015,
            name: 'Trần Minh Tài',
            plate: '59-X3 888.99',
            vehicle: 'Honda SH 150i ABS',
            rating: 4.98
          };
          apiRegistry.map
            .calculateApproachRoute({ lat: driver.lat, lng: driver.lng }, pickup, selectedVehicleCode)
            .then((res) => {
              const poly = res?.polyline || [];
              setApproachPolyline(poly);
              setApproachStep(0);
              if (poly.length > 1) {
                const initBearing = apiRegistry.map.constructor.calculateBearing(
                  poly[0][0],
                  poly[0][1],
                  poly[1][0],
                  poly[1][1]
                );
                setDriverBearing(initBearing);
              }
              setCurrentSpeedKmh(28);
              setRideStage('ARRIVING');
              setActiveRide((curr) => (curr ? { ...curr, state: 'ARRIVING' } : curr));
            });
          return 100;
        }
        return prev + 12;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [rideStage, activeRide, assignedDriverInfo, nearbyRadarDrivers, pickupId, selectedVehicleCode]);

  // Stage 2: ARRIVING Engine (Driver moving from initial location to pickup ~12s)
  useEffect(() => {
    if (rideStage !== 'ARRIVING' || !activeRide || approachPolyline.length === 0) return;

    const interval = setInterval(() => {
      setApproachStep((prev) => {
        const next = prev + 1;
        if (next >= approachPolyline.length) {
          clearInterval(interval);
          setCurrentSpeedKmh(0);
          setRideStage('ARRIVED');
          setActiveRide((curr) => (curr ? { ...curr, state: 'ARRIVED' } : curr));
          return approachPolyline.length - 1;
        }
        const pCurr = approachPolyline[prev];
        const pNext = approachPolyline[next];
        if (pCurr && pNext) {
          const brg = apiRegistry.map.constructor.calculateBearing(pCurr[0], pCurr[1], pNext[0], pNext[1]);
          setDriverBearing(brg);
          setCurrentSpeedKmh(Math.floor(24 + Math.random() * 8));
        }
        return next;
      });
    }, 550);

    return () => clearInterval(interval);
  }, [rideStage, activeRide, approachPolyline]);

  // Stage 3: ARRIVED Engine (Waiting for customer to board ~3.5s)
  useEffect(() => {
    if (rideStage !== 'ARRIVED' || !activeRide) return;
    const timer = setTimeout(() => {
      setDriverStepIndex(0);
      setCurrentSpeedKmh(32);
      setRideStage('IN_PROGRESS');
      setActiveRide((curr) => (curr ? { ...curr, state: 'IN_PROGRESS' } : curr));
    }, 3800);
    return () => clearTimeout(timer);
  }, [rideStage, activeRide]);

  // Stage 4: IN_PROGRESS Engine (Realistic slow transit to destination ~28s)
  useEffect(() => {
    if (rideStage !== 'IN_PROGRESS' || !activeRide || !routeInfo.polyline || routeInfo.polyline.length === 0) return;
    const totalSteps = routeInfo.polyline.length;

    const interval = setInterval(() => {
      setDriverStepIndex((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          clearInterval(interval);
          setCurrentSpeedKmh(0);
          setRideStage('COMPLETED');
          setActiveRide((curr) => (curr ? { ...curr, state: 'COMPLETED' } : curr));
          setShowRatingModal(true);
          return totalSteps - 1;
        }
        const pCurr = routeInfo.polyline[prev];
        const pNext = routeInfo.polyline[next];
        if (pCurr && pNext) {
          const brg = apiRegistry.map.constructor.calculateBearing(pCurr[0], pCurr[1], pNext[0], pNext[1]);
          setDriverBearing(brg);
          setCurrentSpeedKmh(Math.floor(28 + Math.random() * 9));
        }
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [rideStage, activeRide, routeInfo.polyline]);

  const handleManualSkipStage = () => {
    if (!activeRide) return;
    const pickup = HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0];

    if (rideStage === 'SEARCHING') {
      const driver = assignedDriverInfo || nearbyRadarDrivers[0] || {
        lat: pickup.lat + 0.0020,
        lng: pickup.lng + 0.0015,
        name: 'Trần Minh Tài',
        plate: '59-X3 888.99',
        vehicle: 'Honda SH 150i ABS',
        rating: 4.98
      };
      apiRegistry.map
        .calculateApproachRoute({ lat: driver.lat, lng: driver.lng }, pickup, selectedVehicleCode)
        .then((res) => {
          const poly = res?.polyline || [];
          setApproachPolyline(poly);
          setApproachStep(0);
          if (poly.length > 1) {
            const initBearing = apiRegistry.map.constructor.calculateBearing(
              poly[0][0],
              poly[0][1],
              poly[1][0],
              poly[1][1]
            );
            setDriverBearing(initBearing);
          }
          setRideStage('ARRIVING');
          setActiveRide((curr) => (curr ? { ...curr, state: 'ARRIVING' } : curr));
        });
    } else if (rideStage === 'ARRIVING') {
      setRideStage('ARRIVED');
      setActiveRide((curr) => (curr ? { ...curr, state: 'ARRIVED' } : curr));
    } else if (rideStage === 'ARRIVED') {
      setDriverStepIndex(0);
      setRideStage('IN_PROGRESS');
      setActiveRide((curr) => (curr ? { ...curr, state: 'IN_PROGRESS' } : curr));
    } else if (rideStage === 'IN_PROGRESS') {
      setDriverStepIndex((routeInfo.polyline?.length || 64) - 1);
      setRideStage('COMPLETED');
      setActiveRide((curr) => (curr ? { ...curr, state: 'COMPLETED' } : curr));
      setShowRatingModal(true);
    }
  };

  const handleCancelRide = () => {
    setActiveRide(null);
    setRideStage('IDLE');
    setSearchProgress(0);
    setApproachStep(0);
    setDriverStepIndex(0);
    setCurrentSpeedKmh(0);
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
            onClick={handleGoogleSignIn}
            disabled={firebaseLoading}
          >
            <span>🔥</span>
            <span>{firebaseLoading ? 'Đang mở cửa sổ Google...' : 'Đăng nhập bằng Google (Firebase Auth)'}</span>
          </button>

          {firebaseError && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px', textAlign: 'left', lineHeight: 1.4 }}>
              ⚠️ {firebaseError}
            </div>
          )}
        </div>
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
            💳 Ví & Giao dịch
          </button>
        )}
        {currentUser.allowedTabs.includes('PROMO') && (
          <button
            className={`nav-tab ${activeTab === 'PROMO' ? 'active' : ''}`}
            onClick={() => setActiveTab('PROMO')}
          >
            🎟️ Khuyến mãi & Loyalty
          </button>
        )}
        {currentUser.allowedTabs.includes('RATING') && (
          <button
            className={`nav-tab ${activeTab === 'RATING' ? 'active' : ''}`}
            onClick={() => setActiveTab('RATING')}
          >
            ⭐ Đánh giá dịch vụ
          </button>
        )}
      </nav>

      {/* MÀN HÌNH KHÁCH HÀNG: ĐẶT XE (GRAB/UBER SUPER-APP HERO DESIGN) */}
      {activeTab === 'RIDE' && (
        <div className="ride-hero-container">
          {/* CỘT TRÁI: FLOATING BOOKING DRAWER */}
          <div className="card" style={{ padding: '22px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <div className="card-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛵 Đặt chuyến xe</span>
                  <span className="badge-soa" style={{ fontSize: '0.72rem' }}>Super-App Mobility</span>
                </div>
                <p className="brand-subtitle" style={{ marginTop: '2px' }}>
                  Định tuyến thực tế & Ghép tài xế thông minh
                </p>
              </div>
              <span className="oop-tag" style={{ fontWeight: 700 }}>
                {routeInfo.distance_km} km • ~{routeInfo.duration_minutes} phút
              </span>
            </div>

            {/* LOCATION CONNECTED STOPS */}
            <div className="location-connect-card">
              <div className="stop-connector-line" />

              {/* Pickup Stop */}
              <div className="location-stop-row">
                <div className="stop-indicator pickup" />
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px', color: '#00b14f' }}>
                    🟢 ĐIỂM ĐÓN KHÁCH
                  </label>
                  <select
                    className="form-select"
                    style={{ fontWeight: 600, padding: '7px 10px', fontSize: '0.85rem' }}
                    value={pickupId}
                    onChange={(e) => setPickupId(e.target.value)}
                    disabled={rideStage !== 'IDLE' && rideStage !== 'COMPLETED'}
                  >
                    {HCMC_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0', zIndex: 3 }}>
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  disabled={rideStage !== 'IDLE' && rideStage !== 'COMPLETED'}
                  title="Đổi chiều điểm đón và điểm đến"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '50%',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '11px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  ⇅
                </button>
              </div>

              {/* Dropoff Stop */}
              <div className="location-stop-row">
                <div className="stop-indicator dropoff" />
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px', color: '#e11d48' }}>
                    🏁 ĐIỂM ĐẾN
                  </label>
                  <select
                    className="form-select"
                    style={{ fontWeight: 600, padding: '7px 10px', fontSize: '0.85rem' }}
                    value={dropoffId}
                    onChange={(e) => setDropoffId(e.target.value)}
                    disabled={rideStage !== 'IDLE' && rideStage !== 'COMPLETED'}
                  >
                    {HCMC_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TOGGLES: WEATHER & PEAK HOUR */}
            <div className="toggle-row" style={{ marginTop: '0', marginBottom: '12px' }}>
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

            {/* VOUCHER PICKER */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px' }}>Ưu đãi & Voucher</label>
                {selectedVoucherCode && (
                  <span style={{ fontSize: '0.72rem', color: '#00b14f', fontWeight: 700 }}>
                    Đã áp mã {selectedVoucherCode}
                  </span>
                )}
              </div>
              <select
                className="form-select"
                value={selectedVoucherCode}
                onChange={(e) => setSelectedVoucherCode(e.target.value)}
              >
                <option value="">Không dùng mã ưu đãi</option>
                {vouchers.map((v) => (
                  <option key={v.code} value={v.code}>
                    🎁 {v.code} — {v.title}
                  </option>
                ))}
              </select>
            </div>

            {/* VEHICLE PICKER PRO */}
            <div className="form-label" style={{ marginBottom: '8px' }}>Chọn phương tiện di chuyển</div>
            <div className="vehicle-grid-pro">
              {fareEstimates.slice(0, 4).map((est) => {
                const isSelected = selectedVehicleCode === est.vehicleCode;
                const originalFare = Math.round(est.finalFare + (est.voucherDiscount || 0));
                return (
                  <div
                    key={est.vehicleCode}
                    className={`vehicle-card-pro ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedVehicleCode(est.vehicleCode)}
                  >
                    <div className="vehicle-pro-left">
                      <div className="vehicle-pro-icon-box">{est.icon}</div>
                      <div className="vehicle-pro-info">
                        <h4>
                          {est.vehicleName}
                          <span className="vehicle-eta-badge">{est.etaMinutes || '2 phút'}</span>
                        </h4>
                        <div className="price-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{est.capacity} chỗ</span>
                          <span>•</span>
                          <span>Đón tận nơi</span>
                        </div>
                      </div>
                    </div>
                    <div className="vehicle-pro-pricing">
                      <div className="price-pro-main">{est.finalFare.toLocaleString('vi-VN')} đ</div>
                      {est.voucherDiscount > 0 && (
                        <div className="price-pro-original">{originalFare.toLocaleString('vi-VN')} đ</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAYMENT METHOD SELECTOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span className="price-sub" style={{ fontWeight: 600 }}>Phương thức thanh toán:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`chip-toggle ${paymentMethod === 'WALLET' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('WALLET')}
                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                >
                  Ví ({walletBalance.toLocaleString('vi-VN')}đ)
                </button>
                <button
                  type="button"
                  className={`chip-toggle ${paymentMethod === 'CASH' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('CASH')}
                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                >
                  Tiền mặt
                </button>
              </div>
            </div>

            {/* BOOK BUTTON / RIDE ACTION */}
            {rideStage === 'IDLE' || rideStage === 'COMPLETED' ? (
              <button
                className="btn-primary"
                style={{ padding: '13px 18px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={handleBookRide}
              >
                <span>Đặt xe ngay</span>
                <span>•</span>
                <span>{currentVehicleEstimate?.finalFare?.toLocaleString('vi-VN') || 0} đ</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '11px', fontWeight: 600, color: '#dc2626' }}
                  onClick={handleCancelRide}
                >
                  ✕ Hủy chuyến
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1.2, padding: '11px', fontWeight: 600, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
                  onClick={handleManualSkipStage}
                  title="Tua nhanh sang bước kế tiếp để kiểm tra trải nghiệm"
                >
                  ⏩ Tua bước tiếp
                </button>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: BẢN ĐỒ TOÀN CẢNH & KHUNG THÔNG BÁO TÁCH RIÊNG (100% KHÔNG BỊ CHE BẢN ĐỒ) */}
          <div className="ride-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. BẢN ĐỒ TOÀN CẢNH (HOÀN TOÀN TRỐNG TRẢI, RÕ RÀNG 100%) */}
            <div className="ride-map-wrapper">
              <div ref={mapContainerRef} className="leaflet-map-hero" />
            </div>

            {/* 2. KHUNG THÔNG BÁO TIẾN TRÌNH CHUYẾN ĐI (TÁCH BIỆT HOÀN TOÀN BÊN DƯỚI) */}
            {rideStage !== 'IDLE' && (
              <div className="hud-standalone-card">
                {/* TOP ROW: STATE BADGE + METRICS */}
                <div className="hud-top-row">
                  <div>
                    {rideStage === 'SEARCHING' && (
                      <span className="hud-state-tag searching">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                        Giai đoạn 1: Đang quét tìm tài xế gần bạn nhất...
                      </span>
                    )}
                    {rideStage === 'ARRIVING' && (
                      <span className="hud-state-tag arriving">
                        🚗 Giai đoạn 2: Tài xế đang đến điểm đón (~{Math.max(1, 25 - approachStep)}s)
                      </span>
                    )}
                    {rideStage === 'ARRIVED' && (
                      <span className="hud-state-tag arriving" style={{ background: '#ecfdf5', color: '#00b14f', borderColor: '#a7f3d0' }}>
                        🟢 Giai đoạn 3: Tài xế đã đến điểm đón! Đưa mã OTP để lên xe
                      </span>
                    )}
                    {rideStage === 'IN_PROGRESS' && (
                      <span className="hud-state-tag in-progress">
                        🛵 Giai đoạn 4: Đang di chuyển đến điểm đến ({Math.round(((driverStepIndex + 1) / (routeInfo.polyline?.length || 64)) * 100)}%)
                      </span>
                    )}
                    {rideStage === 'COMPLETED' && (
                      <span className="hud-state-tag completed">
                        🎉 Hoàn thành: Bạn đã đến nơi an toàn!
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {rideStage === 'IN_PROGRESS' && (
                      <span className="metric-pill">
                        ⚡ Tốc độ: <strong>{currentSpeedKmh} km/h</strong>
                      </span>
                    )}
                    <span className="metric-pill">
                      🧭 Hướng: <strong>{driverBearing}°</strong>
                    </span>
                  </div>
                </div>

                {/* PROGRESS BAR FOR SEARCHING OR TRAVEL */}
                {rideStage === 'SEARCHING' && (
                  <div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${searchProgress}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #00b14f)',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                    <div className="price-sub" style={{ marginTop: '4px', textAlign: 'center' }}>
                      Đang quét 4 tài xế trong bán kính 1km xung quanh {(HCMC_LOCATIONS.find((l) => l.id === pickupId) || HCMC_LOCATIONS[0]).name.split(',')[0]}...
                    </div>
                  </div>
                )}

                {/* DRIVER INFO & ACTIONS (ARRIVING / ARRIVED / IN_PROGRESS) */}
                {(rideStage === 'ARRIVING' || rideStage === 'ARRIVED' || rideStage === 'IN_PROGRESS' || rideStage === 'COMPLETED') && (
                  <div className="driver-sheet-card">
                    <div className="driver-sheet-left">
                      <div className="driver-avatar-circle">
                        👨🏻‍✈️
                        <div className="driver-verified-check">✓</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{assignedDriverInfo?.name || activeRide?.driver?.name || 'Trần Minh Tài'}</span>
                          <span style={{ fontSize: '0.76rem', color: '#f59e0b', fontWeight: 600 }}>★ 4.98 (1.4k+)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span className="license-plate-vn">{assignedDriverInfo?.plate || activeRide?.driver?.license_plate || '59-X3 888.99'}</span>
                          <span className="price-sub">{assignedDriverInfo?.vehicle || activeRide?.driver?.vehicle || 'Honda SH 150i ABS'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="driver-sheet-actions">
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => alert(`Đang kết nối cuộc gọi thoại với tài xế ${assignedDriverInfo?.name || 'Trần Minh Tài'}...`)}
                        title="Gọi điện cho tài xế"
                      >
                        📞
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => handleSendAiChat(`Tài xế đang ở đâu rồi?`)}
                        title="Nhắn tin với tài xế"
                      >
                        💬
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP BOX (WHEN ARRIVED OR ARRIVING) */}
                {(rideStage === 'ARRIVING' || rideStage === 'ARRIVED') && activeRide?.otp_code && (
                  <div className="otp-display-box">
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        MÃ OTP XÁC NHẬN LÊN XE
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                        Cung cấp cho tài xế trước khi khởi hành
                      </div>
                    </div>
                    <div className="otp-digit-group">
                      {activeRide.otp_code.split('').map((ch, idx) => (
                        <div key={idx} className="otp-digit">{ch}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5-STEP TIMELINE STEPPER */}
                <div className="stepper-timeline">
                  {[
                    { key: 'REQUESTED', label: '1. Quét tìm xe' },
                    { key: 'ARRIVING', label: '2. Xe đến đón' },
                    { key: 'ARRIVED', label: '3. Lên xe (OTP)' },
                    { key: 'IN_PROGRESS', label: '4. Đang di chuyển' },
                    { key: 'COMPLETED', label: '5. Hoàn thành' }
                  ].map((step, idx) => {
                    const stagesOrder = ['SEARCHING', 'ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
                    const currentStageIdx = stagesOrder.indexOf(rideStage);
                    const isDone = currentStageIdx > idx;
                    const isActive = currentStageIdx === idx;
                    return (
                      <div key={step.key} className={`stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                        <div className="step-circle">{isDone ? '✓' : idx + 1}</div>
                        <span className="step-label">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
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
                { code: 'WALLET', name: 'Ví RideEatPay', desc: 'Thanh toán tức thì từ số dư ví' },
                { code: 'VNPAY', name: 'VNPay QR', desc: 'Cổng thanh toán quét mã QR đa ngân hàng' },
                { code: 'MOMO', name: 'Ví MoMo', desc: 'Liên kết ứng dụng ví điện tử MoMo' },
                { code: 'CREDIT_CARD', name: 'Thẻ Quốc Tế', desc: 'Visa / Mastercard / JCB' },
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
              <div className="card-title">Sổ cái giao dịch tài chính</div>
              <span className="oop-tag">{transactions.length} giao dịch</span>
            </div>

            <div className="vehicle-list">
              {transactions.map((tx) => (
                <div key={tx.transaction_id} className="vehicle-item" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{tx.description}</div>
                    <div className="price-sub">{tx.timestamp} • {tx.method}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="price-main"
                      style={{ color: tx.type === 'CREDIT' ? '#00b14f' : '#e11d48' }}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      onClick={() => handleViewInvoice(tx)}
                    >
                      🧾 Hóa đơn VAT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MÀN HÌNH KHUYẾN MÃI & THÀNH VIÊN LOYALTY */}
      {activeTab === 'PROMO' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Hạng thành viên & Điểm tích lũy</div>
              <span className="badge-soa">Hạng Vàng (Gold)</span>
            </div>
            <div className="info-box" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="price-sub">Điểm Loyalty khả dụng</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00b14f' }}>210 Điểm</div>
                </div>
                <div style={{ fontSize: '2.5rem' }}>🏅</div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                  <span>Tiến độ thăng hạng Platinum</span>
                  <span>210 / 500 điểm</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '42%', height: '100%', background: '#00b14f', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
            <div className="price-sub" style={{ lineHeight: 1.5 }}>
              Quyền lợi Hạng Vàng: Giảm 10% phí dịch vụ vào giờ cao điểm, ưu tiên ghép tài xế trong 15 giây và miễn phí giao hàng cho đơn từ 150.000đ.
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Mã giảm giá khả dụng</div>
              <span className="oop-tag">{vouchers.length} ưu đãi</span>
            </div>
            <div className="vehicle-list">
              {vouchers.map((v) => (
                <div key={v.code} className="vehicle-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="badge-soa" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{v.code}</span>
                      <span style={{ fontWeight: 600, marginLeft: '8px' }}>{v.title}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => {
                        setSelectedVoucherCode(v.code);
                        setActiveTab('RIDE');
                      }}
                    >
                      Dùng ngay
                    </button>
                  </div>
                  <div className="price-sub">
                    {v.specRule} • {v.strategyClass}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MÀN HÌNH ĐÁNH GIÁ & XẾP HẠNG UY TÍN */}
      {activeTab === 'RATING' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Gửi đánh giá dịch vụ</div>
              <span className="oop-tag">Bayesian Rating Engine</span>
            </div>
            <div className="form-group">
              <label className="form-label">Đối tượng đánh giá</label>
              <select
                className="form-select"
                value={ratingTargetType}
                onChange={(e) => setRatingTargetType(e.target.value)}
              >
                <option value="driver">Tài xế - Trần Minh Tài (Honda SH 150i)</option>
                <option value="restaurant">Nhà hàng - Phở Thìn Bờ Hồ Quận 1</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Chất lượng phục vụ ({ratingStars} sao)</label>
              <div style={{ display: 'flex', gap: '8px', fontSize: '1.75rem', cursor: 'pointer', margin: '4px 0 12px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    onClick={() => setRatingStars(star)}
                    style={{ color: star <= ratingStars ? '#f59e0b' : '#cbd5e1', transition: '0.15s' }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nhận xét chi tiết</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Chia sẻ trải nghiệm của bạn (lái xe an toàn, quán chuẩn bị món nhanh...)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
            </div>

            <button type="button" className="btn-primary" onClick={handleSubmitRating}>
              Gửi đánh giá & Nhận 5 điểm thưởng
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Xếp hạng uy tín đối tác</div>
              <span className="badge-soa">★ 4.96 / 5.0 (128 lượt)</span>
            </div>
            <div className="vehicle-list">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="vehicle-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{rev.reviewerName}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(rev.stars)}</span>
                  </div>
                  <div className="price-sub">{rev.comment}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{rev.time} • Đơn #{rev.refId}</div>
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

      {/* MODAL ĐÁNH GIÁ CHUYẾN ĐI (COMPLETED RIDE FEEDBACK & REWARD) */}
      {showRatingModal && (
        <div className="modal-backdrop" onClick={() => setShowRatingModal(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '36px', marginBottom: '6px' }}>🎉</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Chuyến đi đã hoàn thành!</h3>
              <p className="price-sub" style={{ marginTop: '2px' }}>
                Bạn cảm thấy chuyến đi với tài xế <strong>{assignedDriverInfo?.name || 'Trần Minh Tài'}</strong> thế nào?
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '14px 0', fontSize: '28px', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRatingStars(star)}
                  style={{ color: star <= ratingStars ? '#f59e0b' : '#cbd5e1', transition: '0.15s' }}
                >
                  ★
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px', justifyContent: 'center' }}>
              {['Lái xe an toàn', 'Xe êm ái', 'Rất đúng giờ', 'Thân thiện'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip-toggle"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => setRatingComment((prev) => (prev ? `${prev}, ${tag.toLowerCase()}` : tag))}
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              className="form-input"
              rows="3"
              placeholder="Chia sẻ thêm cảm nhận của bạn về chuyến đi..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              style={{ marginBottom: '14px', fontSize: '0.88rem' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowRatingModal(false);
                  const latestTx = transactions[0];
                  if (latestTx) handleViewInvoice(latestTx);
                }}
              >
                🧾 Xem hóa đơn VAT
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1.2 }}
                onClick={async () => {
                  await handleSubmitRating();
                  setShowRatingModal(false);
                }}
              >
                Gửi (+5.000đ vào ví)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM HÓA ĐƠN THUẾ ĐIỆN TỬ VAT 8% (OOP INVOICE GENERATOR) */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-header">
              <div>
                <div className="invoice-company">{selectedInvoice.companyName}</div>
                <div className="invoice-title">Hóa đơn điện tử dịch vụ vận tải & đồ ăn</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Mã số thuế: {selectedInvoice.taxId} • Ký số xác thực SHA-256
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge-soa" style={{ fontSize: '0.85rem' }}>{selectedInvoice.invoiceNumber}</span>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  {selectedInvoice.issuedAt}
                </div>
              </div>
            </div>

            <table className="invoice-table">
              <tbody>
                <tr>
                  <th>Khách hàng / Mã định danh</th>
                  <td>{selectedInvoice.user} ({selectedInvoice.userId})</td>
                </tr>
                <tr>
                  <th>Nội dung thanh toán</th>
                  <td>{selectedInvoice.description}</td>
                </tr>
                <tr>
                  <th>Phương thức thanh toán</th>
                  <td>{selectedInvoice.paymentMethod}</td>
                </tr>
                <tr>
                  <th>Tiền cước trước thuế (Subtotal)</th>
                  <td>{selectedInvoice.subtotal.toLocaleString('vi-VN')} đ</td>
                </tr>
                <tr>
                  <th>Thuế GTGT (VAT 8%)</th>
                  <td>{selectedInvoice.vat.toLocaleString('vi-VN')} đ</td>
                </tr>
                <tr className="invoice-total-row">
                  <td>Tổng thanh toán (Đã bao gồm VAT)</td>
                  <td style={{ color: '#00b14f' }}>{selectedInvoice.total.toLocaleString('vi-VN')} đ</td>
                </tr>
              </tbody>
            </table>

            <div className="invoice-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ In hóa đơn
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedInvoice(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
