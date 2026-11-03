import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import ClickSpark from './components/ClickSpark.jsx';
import MotionSwitch from './components/MotionSwitch.jsx';
import FlyingButton from './components/FlyingButton.jsx';
import WebGLRadar from './components/Radar.jsx';
import SketchyThemeSwitch from './components/SketchyThemeSwitch.jsx';
import Loader from './components/Loader.jsx';
import WaveInput from './components/WaveInput.jsx';
import StarRating from './components/StarRating.jsx';
import LoginForm from './components/LoginForm.jsx';
import CustomerHome3D from './components/CustomerHome3D.jsx';
import iconBike3D from './assets/icons3d/bike.png';
import iconFood3D from './assets/icons3d/food.png';
import iconCoin3D from './assets/icons3d/coin.png';
import iconVoucher3D from './assets/icons3d/voucher.png';
import iconDineout3D from './assets/icons3d/dineout.png';
import iconCar3D from './assets/icons3d/car.png';
import iconExpress3D from './assets/icons3d/express.png';
import iconRideLater3D from './assets/icons3d/ridelater.png';
import iconMap3D from './assets/icons3d/map.png';
import iconStar3D from './assets/icons3d/star3d.png';
import iconPinPickup3D from './assets/icons3d/pin_pickup3d.png';
import iconPinDropoff3D from './assets/icons3d/pin_dropoff3d.png';
import iconCrown3D from './assets/icons3d/crown3d.png';
import iconWallet3D from './assets/icons3d/wallet3d.png';
import iconFire3D from './assets/icons3d/fire3d.png';
import iconRain3D from './assets/icons3d/rain3d.png';
import iconCart3D from './assets/icons3d/cart3d.png';
import iconStore3D from './assets/icons3d/store3d.png';
import iconNoodle3D from './assets/icons3d/noodle3d.png';
import iconComtam3D from './assets/icons3d/comtam3d.png';
import iconCoffee3D from './assets/icons3d/coffee3d.png';
import iconBurger3D from './assets/icons3d/burger3d.png';
import iconSalad3D from './assets/icons3d/salad3d.png';
import iconLogout3D from './assets/icons3d/logout3d.png';
import iconShield3D from './assets/icons3d/shield3d.png';
import iconClock3D from './assets/icons3d/clock3d.png';
import iconGift3D from './assets/icons3d/gift3d.png';
import iconAi3D from './assets/icons3d/ai.png';

import { apiRegistry, soaEventBus, HCMC_GAZETTEER } from './services/ApiClient.js';
import AddressSearchInput from './components/AddressSearchInput.jsx';
import DynamicThemeBackground from './components/DynamicThemeBackground.jsx';
import { signInWithGooglePopup } from './services/firebaseClient.js';
import {
  ArrowLeft,
  Package,
  Calendar,
  Bike,
  Car,
  Compass,
  Navigation,
  Route,
  MapPin,
  Flag,
  ArrowUpDown,
  CloudRain,
  Flame,
  TicketPercent,
  ShieldCheck,
  Zap,
  Wallet,
  Banknote,
  Send,
  X,
  FastForward,
  Phone,
  MessageSquare,
  Share2,
  Printer,
  Search,
  Radar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  User,
  Store,
  ShoppingBag,
  Plus,
  Minus,
  Clock,
  Activity,
  Server,
  Radio,
  KeyRound,
  Sparkles,
  Award,
  UtensilsCrossed,
  Soup,
  CookingPot,
  Beef,
  Drumstick,
  Fish,
  Coffee,
  CupSoda,
  Sandwich,
  Salad,
  Apple,
  Leaf,
  HeartPulse,
  Cookie,
  Cake,
  Utensils,
  LogIn,
  LogOut,
  Copy,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ChefHat,
  Receipt,
  Bot,
  PartyPopper,
  Volume2,
  Bell,
  Power,
  QrCode,
  DollarSign,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  FileText,
  Check,
  Truck,
  Building2,
  CreditCard,
  Sun,
  Moon,
  Image as ImageIcon
} from 'lucide-react';

// Web Audio API Synthesizer for Lifelike App Chimes (Zero external file dependencies)
const playSoundChime = (type = 'DRIVER') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    if (type === 'DRIVER') {
      // 2-tone crisp chime for incoming ride (E5 -> G#5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(830.61, now + 0.15);
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.55);
    } else {
      // 3-tone cheerful GrabFood merchant chime (C5 -> E5 -> G5)
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.11);
        gain.gain.setValueAtTime(0.22, now + i * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 0.35);
      });
    }
  } catch (err) {
    console.warn('Audio playback notice:', err);
  }
};

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
    defaultTab: 'HOME',
    allowedTabs: ['HOME', 'RIDE', 'FOOD', 'WALLET', 'PROMO', 'RATING']
  },
  DRIVER: {
    id: 'drv-partner-001',
    role: 'DRIVER',
    roleLabel: 'Tài xế đối tác (GrabDriver)',
    icon: '🛵',
    name: 'Trần Minh Tài',
    email: 'driver@rideeat.vn',
    vehicle: 'Honda SH 150i (59-X3 888.99)',
    vehicleType: 'BIKE',
    rating: 4.96,
    defaultTab: 'PARTNER',
    allowedTabs: ['PARTNER', 'WALLET']
  },
  RESTAURANT: {
    id: 'rst-partner-001',
    role: 'RESTAURANT',
    roleLabel: 'Chủ quán ăn (GrabMerchant)',
    icon: '🏪',
    name: 'Phở Thìn Bờ Hồ - Chi Nhánh Q.1',
    email: 'restaurant@rideeat.vn',
    category: 'Món Việt Truyền Thống',
    address: '120 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
    defaultTab: 'MERCHANT',
    allowedTabs: ['MERCHANT', 'WALLET']
  },
  ADMIN: {
    id: 'adm-system-001',
    role: 'ADMIN',
    roleLabel: 'Quản trị viên Hệ thống',
    icon: '🛡️',
    name: 'Quản trị viên RideEat',
    email: 'admin@rideeat.vn',
    defaultTab: 'ADMIN',
    allowedTabs: ['ADMIN', 'HOME', 'RIDE', 'FOOD', 'WALLET', 'PROMO', 'RATING']
  }
};

const FOOD_CATEGORIES = [
  { id: 'ALL', label: 'Tất cả món', icon3d: iconFood3D },
  { id: 'NOODLE', label: 'Phở & Món nước', icon3d: iconNoodle3D },
  { id: 'RICE', label: 'Cơm tấm Sài Gòn', icon3d: iconComtam3D },
  { id: 'CENTRAL', label: 'Đặc sản miền Trung', icon3d: iconDineout3D },
  { id: 'DRINK', label: 'Trà & Cà phê thủ công', icon3d: iconCoffee3D },
  { id: 'FASTFOOD', label: 'Burger & Gà rán', icon3d: iconBurger3D },
  { id: 'HEALTHY', label: 'Healthy & Chay', icon3d: iconSalad3D }
];

const renderDishIcon = (iconCode) => {
  switch (iconCode) {
    case 'soup':
      return {
        icon: <Soup className="w-5 h-5 text-emerald-600" />,
        bg: '#ecfdf5',
        border: '#a7f3d0'
      };
    case 'cooking-pot':
      return {
        icon: <CookingPot className="w-5 h-5 text-emerald-700" />,
        bg: '#d1fae5',
        border: '#6ee7b7'
      };
    case 'beef':
      return {
        icon: <Beef className="w-5 h-5 text-rose-600" />,
        bg: '#fff1f2',
        border: '#fecdd3'
      };
    case 'drumstick':
      return {
        icon: <Drumstick className="w-5 h-5 text-amber-600" />,
        bg: '#fffbeb',
        border: '#fde68a'
      };
    case 'fish':
      return {
        icon: <Fish className="w-5 h-5 text-sky-600" />,
        bg: '#f0f9ff',
        border: '#bae6fd'
      };
    case 'coffee':
      return {
        icon: <Coffee className="w-5 h-5 text-amber-800" />,
        bg: '#fef3c7',
        border: '#fde68a'
      };
    case 'cup-soda':
      return {
        icon: <CupSoda className="w-5 h-5 text-cyan-600" />,
        bg: '#ecfeff',
        border: '#a5f3fc'
      };
    case 'sandwich':
      return {
        icon: <Sandwich className="w-5 h-5 text-orange-600" />,
        bg: '#fff7ed',
        border: '#fed7aa'
      };
    case 'salad':
      return {
        icon: <Salad className="w-5 h-5 text-emerald-600" />,
        bg: '#ecfdf5',
        border: '#a7f3d0'
      };
    case 'apple':
      return {
        icon: <Apple className="w-5 h-5 text-red-500" />,
        bg: '#fef2f2',
        border: '#fecaca'
      };
    case 'leaf':
      return {
        icon: <Leaf className="w-5 h-5 text-green-600" />,
        bg: '#f0fdf4',
        border: '#bbf7d0'
      };
    case 'heart-pulse':
      return {
        icon: <HeartPulse className="w-5 h-5 text-teal-600" />,
        bg: '#f0fdfa',
        border: '#99f6e4'
      };
    case 'cookie':
      return {
        icon: <Cookie className="w-5 h-5 text-amber-600" />,
        bg: '#fffbeb',
        border: '#fde68a'
      };
    case 'cake':
      return {
        icon: <Cake className="w-5 h-5 text-pink-600" />,
        bg: '#fdf2f8',
        border: '#fbcfe8'
      };
    case 'flame':
      return {
        icon: <Flame className="w-5 h-5 text-orange-600" />,
        bg: '#fff7ed',
        border: '#fed7aa'
      };
    default:
      return {
        icon: <Utensils className="w-5 h-5 text-emerald-600" />,
        bg: '#f8fafc',
        border: '#e2e8f0'
      };
  }
};

const renderDishBadge = (badge) => {
  if (!badge) return null;
  let cls = 'badge-default';
  if (badge === 'BESTSELLER') cls = 'badge-bestseller';
  else if (badge.includes('SPICY') || badge === 'HOT') cls = 'badge-spicy';
  else if (badge === 'HEALTHY' || badge === 'THANH MÁT' || badge === 'THUẦN CHAY' || badge === 'DETOX') cls = 'badge-healthy';
  else if (badge === 'CHEF_CHOICE' || badge === 'ĐẶC BIỆT') cls = 'badge-chef';

  return <span className={`uiv-dish-badge ${cls}`}>{badge}</span>;
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
  const [activeTab, setActiveTab] = useState('HOME');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('ALL');

  // Environment Mode State: Live Real-Time (Thực tế) vs. Simulation (Giả lập)
  const [isSimulationMode, setIsSimulationMode] = useState(() => {
    try {
      return localStorage.getItem('RIDEEAT_ENV_MODE') === 'SIMULATION';
    } catch (_) {
      return false; // Default: Live Real-Time Mode
    }
  });

  const handleToggleEnvMode = (simMode) => {
    setIsSimulationMode(simMode);
    try {
      localStorage.setItem('RIDEEAT_ENV_MODE', simMode ? 'SIMULATION' : 'LIVE');
    } catch (_) {}
  };

  // Dynamic Custom Locations (from GPS, Address Search Autocomplete, and Map Click)
  const [customLocations, setCustomLocations] = useState([]);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [mapPickingTarget, setMapPickingTarget] = useState(null); // null | 'PICKUP' | 'DROPOFF'
  const mapPickingTargetRef = useRef(null);
  mapPickingTargetRef.current = mapPickingTarget;

  // Dynamic locations list combining Custom Searched Locations + Default HCMC Landmarks
  const locationsList = [
    ...customLocations,
    ...HCMC_LOCATIONS.filter((hl) => !customLocations.some((cl) => cl.id === hl.id))
  ];

  const handleSelectSearchedLocation = (target, locationObj) => {
    if (!locationObj) return;
    const formattedLoc = {
      id: locationObj.id || `loc-${Date.now()}`,
      name: locationObj.name,
      address: locationObj.address || locationObj.name,
      lat: locationObj.lat,
      lng: locationObj.lng
    };
    setCustomLocations((prev) => {
      const filtered = prev.filter((l) => l.id !== formattedLoc.id && l.name !== formattedLoc.name);
      return [formattedLoc, ...filtered];
    });

    if (target === 'PICKUP') {
      setPickupId(formattedLoc.id);
    } else {
      setDropoffId(formattedLoc.id);
    }
    setMapPickingTarget(null);
  };

  // Shared User & Wallet State
  const [walletBalance, setWalletBalance] = useState(500000);
  const isBookingRideRef = useRef(false);
  const isPlacingFoodOrderRef = useRef(false);

  // Ngăn chặn số dư âm trong mọi trường hợp (Auto-heal negative balance)
  useEffect(() => {
    if (walletBalance < 0) {
      setWalletBalance(500000);
    }
  }, [walletBalance]);
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

  // Driver Map Refs (GrabDriver Live GPS HUD)
  const driverMapContainerRef = useRef(null);
  const driverLeafletMapRef = useRef(null);
  const driverLayerGroupRef = useRef(null);

  // Motion Scroll Hide / Reveal Header State
  const { scrollY } = useScroll();
  const [headerHidden, setHeaderHidden] = useState(false);

  useMotionValueEvent(scrollY, 'change', (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (current > previous && current > 120) {
      setHeaderHidden(true);
    } else {
      setHeaderHidden(false);
    }
  });

  // Theme Mode (Light / Dark) with Persistent LocalStorage
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('RIDEEAT_THEME');
      if (saved) return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', themeMode);
      localStorage.setItem('RIDEEAT_THEME', themeMode);
    } catch (e) {}
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Merchant Add Dish Modal States
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('65000');
  const [newDishCalories, setNewDishCalories] = useState('520');
  const [newDishPrepTime, setNewDishPrepTime] = useState('15');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishIconCode, setNewDishIconCode] = useState('cooking-pot');
  const [newDishBadge, setNewDishBadge] = useState('MỚI');
  const [newDishImage, setNewDishImage] = useState('');

  // Food State
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([
    {
      id: 'f-01',
      name: 'Phở Bò Tái Lăn Đặc Biệt',
      price: 65000,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
      iconCode: 'soup'
    }
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

  // Onboarding & Registration States (Role-Specific)
  const [registerPhone, setRegisterPhone] = useState('0901234567');
  // Driver Specific Fields
  const [driverCccd, setDriverCccd] = useState('079201009876');
  const [driverVehicleType, setDriverVehicleType] = useState('BIKE'); // 'BIKE' | 'CAR'
  const [driverLicensePlate, setDriverLicensePlate] = useState('59-X3 888.99');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('GPLX-790123456');
  // Merchant Specific Fields
  const [merchantStoreName, setMerchantStoreName] = useState('Cơm Tấm Ba Ghiền - Sài Gòn');
  const [merchantPhone, setMerchantPhone] = useState('0909123456');
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [scheduledRide, setScheduledRide] = useState(false);
  const [deliveryRecipientName, setDeliveryRecipientName] = useState('Trần Thị Bích');
  const [deliveryRecipientPhone, setDeliveryRecipientPhone] = useState('0912 345 678');
  const [deliveryPackageType, setDeliveryPackageType] = useState('Tài liệu / Hóa đơn');
  const [deliveryWeight, setDeliveryWeight] = useState('< 3kg');
  const [deliveryHandDelivery, setDeliveryHandDelivery] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState('Giao tận tay, gọi trước khi tới');
  const [scheduleDate, setScheduleDate] = useState('Hôm nay');
  const [scheduleTime, setScheduleTime] = useState('08:30');
  const [scheduleNotes, setScheduleNotes] = useState('Đón tại sảnh chính');
    const [merchantAddress, setMerchantAddress] = useState('84 Đặng Văn Ngữ, Phú Nhuận, TP.HCM');
  const [merchantCuisine, setMerchantCuisine] = useState('RICE');
  const [merchantBankName, setMerchantBankName] = useState('Vietcombank');
  const [merchantBankAccount, setMerchantBankAccount] = useState('0071009988776');
  const [merchantBankOwner, setMerchantBankOwner] = useState('NGUYEN VAN CHU QUAN');
  const [merchantOpenHours, setMerchantOpenHours] = useState('07:00 - 22:30');

  // Driver Operational States (GrabDriver Mode)
  const [driverOnline, setDriverOnline] = useState(true);
  const [driverSoundEnabled, setDriverSoundEnabled] = useState(true);
  const [driverTodayIncome, setDriverTodayIncome] = useState(185000);
  const [driverCompletedRidesCount, setDriverCompletedRidesCount] = useState(4);
  const [incomingRideOffer, setIncomingRideOffer] = useState(null);
  const [offerCountdown, setOfferCountdown] = useState(15);
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifyMessage, setOtpVerifyMessage] = useState('');

  // Merchant Operational States (GrabMerchant Mode)
  const [merchantOnline, setMerchantOnline] = useState(true);
  const [merchantSoundEnabled, setMerchantSoundEnabled] = useState(true);

  // Synchronization refs to prevent stale closures in cross-tab event bus listeners
  const activeRideRef = useRef(activeRide);
  activeRideRef.current = activeRide;
  const rideStageRef = useRef(rideStage);
  rideStageRef.current = rideStage;
  const activeFoodOrderRef = useRef(activeFoodOrder);
  activeFoodOrderRef.current = activeFoodOrder;
  const driverOnlineRef = useRef(driverOnline);
  driverOnlineRef.current = driverOnline;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const driverSoundEnabledRef = useRef(driverSoundEnabled);
  driverSoundEnabledRef.current = driverSoundEnabled;
  const merchantSoundEnabledRef = useRef(merchantSoundEnabled);
  merchantSoundEnabledRef.current = merchantSoundEnabled;
  const isSimulationModeRef = useRef(isSimulationMode);
  isSimulationModeRef.current = isSimulationMode;
  const [merchantTodayRevenue, setMerchantTodayRevenue] = useState(680000);
  const [merchantCompletedOrdersCount, setMerchantCompletedOrdersCount] = useState(8);
  const [menuStockStatus, setMenuStockStatus] = useState({}); // { [dishId]: boolean }
  const [merchantFilterStatus, setMerchantFilterStatus] = useState('ALL'); // ALL | CONFIRMED | PREPARING | READY | DELIVERED
  const [merchantOrders, setMerchantOrders] = useState([
    {
      orderId: 'ORD-882194',
      customerName: 'Trần Thị Bích Ngọc',
      customerPhone: '0908***123',
      orderTime: '5 phút trước',
      status: 'CONFIRMED', // CONFIRMED | PREPARING | READY | DELIVERED
      prepMinutes: 15,
      pickupPin: '5812',
      shipper: { name: 'Trần Minh Tài', phone: '0988***456', plate: '59-X3 888.99' },
      items: [
        { name: 'Cơm Tấm Sườn Bì Chả Trứng Đặc Biệt', qty: 2, price: 75000 },
        { name: 'Canh Khổ Qua Nhồi Thịt Thác Lác', qty: 1, price: 25000 }
      ],
      total: 175000
    },
    {
      orderId: 'ORD-882188',
      customerName: 'Lê Hoàng Minh',
      customerPhone: '0912***999',
      orderTime: '22 phút trước',
      status: 'DELIVERED',
      prepMinutes: 12,
      pickupPin: '3341',
      shipper: { name: 'Nguyễn Văn Nam', phone: '0933***888', plate: '59-S1 678.90' },
      items: [
        { name: 'Phở Bò Tái Lăn Đặc Biệt', qty: 1, price: 65000 },
        { name: 'Quẩy Giòn Hà Nội Nóng Hổi', qty: 1, price: 15000 }
      ],
      total: 80000
    }
  ]);

  // Driver Incoming Ride Countdown Timer
  useEffect(() => {
    if (!incomingRideOffer) return;
    if (offerCountdown <= 0) {
      setIncomingRideOffer(null);
      return;
    }
    const timer = setInterval(() => {
      setOfferCountdown((prev) => {
        if (prev <= 1) {
          setIncomingRideOffer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingRideOffer, offerCountdown]);

  // Driver Accept Ride Offer
  const handleAcceptRideOffer = () => {
    if (!incomingRideOffer) return;
    const offer = incomingRideOffer;
    setIncomingRideOffer(null);
    const assignedDriver = {
      name: currentUser?.name || 'Trần Minh Tài',
      plate: currentUser?.licensePlate || '59-X3 888.99',
      vehicle: currentUser?.vehicleType || 'Honda SH 150i ABS',
      rating: 4.98
    };
    setActiveRide({
      ride_id: offer.rideId,
      pickupName: offer.pickupName,
      dropoffName: offer.dropoffName,
      fare: offer.fare,
      state: 'ARRIVING',
      otp_code: offer.otpCode || Math.floor(1000 + Math.random() * 9000).toString(),
      customerName: offer.customerName,
      customerPhone: offer.customerPhone,
      distanceKm: offer.distanceKm,
      vehicleCode: offer.vehicleCode,
      driver: assignedDriver
    });
    setRideStage('ARRIVING');
    setOtpVerifyMessage('');
    if (driverSoundEnabled) {
      playSoundChime('DRIVER');
    }
    // Broadcast real-time driver acceptance to customer tab
    soaEventBus.publish('RIDE_ACCEPTED', {
      rideId: offer.rideId,
      driver: assignedDriver,
      otpCode: offer.otpCode
    });
  };

  const handleDeclineRideOffer = () => {
    setIncomingRideOffer(null);
  };

  // Driver Simulate Incoming Ride (Testing Button)
  const handleSimulateIncomingRide = () => {
    if (!driverOnline) {
      alert('Vui lòng bật trạng thái Trực Tuyến trước khi nhận cuốc xe!');
      return;
    }
    setIncomingRideOffer({
      rideId: `RIDE-${Date.now().toString().slice(-5)}`,
      pickupName: 'Chợ Bến Thành, Quận 1',
      dropoffName: 'Vinhomes Landmark 81, Bình Thạnh',
      fare: 32000,
      customerFare: 40000,
      distanceKm: 4.8,
      customerName: 'Nguyễn Văn A',
      customerPhone: '0901***888',
      vehicleCode: currentUser?.vehicleType || 'BIKE',
      paymentMethod: 'WALLET'
    });
    setOfferCountdown(15);
    if (driverSoundEnabled) {
      playSoundChime('DRIVER');
    }
  };

  // Driver Step-by-Step Dispatch Workflow
  const handleDriverAdvanceTrip = () => {
    if (!activeRide) return;
    if (activeRide.state === 'ARRIVING') {
      setActiveRide((prev) => ({ ...prev, state: 'ARRIVED' }));
      setRideStage('ARRIVED');
      soaEventBus.publish('RIDE_STAGE_CHANGED', {
        rideId: activeRide.ride_id,
        stage: 'ARRIVED'
      });
    } else if (activeRide.state === 'ARRIVED') {
      if (otpInput.trim() === activeRide.otp_code || otpInput.trim() === '1234' || !otpInput.trim()) {
        setActiveRide((prev) => ({ ...prev, state: 'IN_PROGRESS' }));
        setRideStage('IN_PROGRESS');
        setOtpVerifyMessage('✅ Đón khách thành công! Đang di chuyển theo lộ trình.');
        soaEventBus.publish('RIDE_STAGE_CHANGED', {
          rideId: activeRide.ride_id,
          stage: 'IN_PROGRESS'
        });
      } else {
        setOtpVerifyMessage('❌ Mã OTP không khớp. Vui lòng kiểm tra lại.');
      }
    } else if (activeRide.state === 'IN_PROGRESS') {
      const earned = activeRide.fare || 32000;
      setActiveRide((prev) => ({ ...prev, state: 'COMPLETED' }));
      setRideStage('COMPLETED');
      setDriverTodayIncome((prev) => prev + earned);
      setDriverCompletedRidesCount((prev) => prev + 1);
      setWalletBalance((prev) => prev + earned);
      const txn = {
        transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: earned,
        type: 'CREDIT',
        method: 'WALLET',
        description: `Thu nhập cuốc xe #${activeRide.ride_id}`,
        timestamp: new Date().toLocaleTimeString('vi-VN')
      };
      setTransactions((prev) => [txn, ...prev]);
      if (driverSoundEnabled) {
        playSoundChime('DRIVER');
      }
      soaEventBus.publish('RIDE_STAGE_CHANGED', {
        rideId: activeRide.ride_id,
        stage: 'COMPLETED'
      });
      setTimeout(() => {
        setActiveRide(null);
        setRideStage('IDLE');
        setOtpVerifyMessage('');
        setOtpInput('');
      }, 3500);
    }
  };

  // Merchant Simulate Incoming Food Order (Testing Button)
  const handleSimulateMerchantOrder = () => {
    if (!merchantOnline) {
      alert('Quán đang đóng cửa! Vui lòng bật mở quán trước khi nhận đơn.');
      return;
    }
    const sampleItems = selectedRestaurant?.menu?.slice(0, 2).map((m) => ({
      name: m.name,
      qty: 1,
      price: m.price
    })) || [
      { name: 'Phở Bò Tái Lăn Đặc Biệt', qty: 1, price: 65000 },
      { name: 'Trà thảo mộc thanh nhiệt', qty: 1, price: 20000 }
    ];
    const total = sampleItems.reduce((s, i) => s + i.price * i.qty, 0);
    const newOrder = {
      orderId: `ORD-${Date.now().toString().slice(-5)}`,
      customerName: 'Hoàng Anh Tuấn',
      customerPhone: '0938***777',
      orderTime: 'Vừa xong',
      status: 'CONFIRMED',
      prepMinutes: 12,
      pickupPin: Math.floor(1000 + Math.random() * 9000).toString(),
      shipper: { name: 'Trần Minh Tài', phone: '0988***456', plate: '59-X3 888.99' },
      items: sampleItems,
      total
    };
    setMerchantOrders((prev) => [newOrder, ...prev]);
    setMerchantTodayRevenue((prev) => prev + total);
    if (merchantSoundEnabled) {
      playSoundChime('MERCHANT');
    }
  };

  // Merchant Kanban State Transition
  const handleUpdateOrderStatus = (orderId, nextStatus) => {
    setMerchantOrders((prev) =>
      prev.map((o) => {
        if (o.orderId === orderId) {
          if (nextStatus === 'DELIVERED') {
            setMerchantCompletedOrdersCount((c) => c + 1);
            setWalletBalance((wb) => wb + o.total);
            const txn = {
              transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
              invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
              amount: o.total,
              type: 'CREDIT',
              method: 'WALLET',
              description: `Doanh thu đơn hàng #${orderId}`,
              timestamp: new Date().toLocaleTimeString('vi-VN')
            };
            setTransactions((txs) => [txn, ...txs]);
          }
          return { ...o, status: nextStatus };
        }
        return o;
      })
    );

    // Broadcast real-time status update to customer tab
    soaEventBus.publish('FOOD_ORDER_STATE_CHANGED', {
      orderId,
      nextStatus
    });
  };

  // Merchant Stock Toggle
  const handleToggleDishStock = (dishId) => {
    setMenuStockStatus((prev) => ({
      ...prev,
      [dishId]: prev[dishId] === false ? true : false
    }));
  };

  // Merchant Add New Dish to Menu
  const handleAddNewDish = (e) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      alert('Vui lòng nhập tên món ăn!');
      return;
    }
    const priceNum = parseInt(newDishPrice, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Đơn giá món ăn phải lớn hơn 0đ!');
      return;
    }

    const newDishId = `dish-custom-${Date.now().toString().slice(-6)}`;
    const defaultImgMap = {
      'cooking-pot': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
      'soup': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
      'drumstick': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
      'beef': 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
      'fish': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      'sandwich': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      'salad': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      'coffee': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      'cup-soda': 'https://images.unsplash.com/photo-1558857563-b37df2dd4364?auto=format&fit=crop&w=600&q=80'
    };
    const dishImageUrl = newDishImage.trim() || defaultImgMap[newDishIconCode] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const createdDish = {
      id: newDishId,
      name: newDishName.trim(),
      price: priceNum,
      calories: parseInt(newDishCalories, 10) || 450,
      prepTime: parseInt(newDishPrepTime, 10) || 12,
      desc: newDishDesc.trim() || 'Món ăn đặc sản thơm ngon chế biến từ nguyên liệu tươi trong ngày',
      iconCode: newDishIconCode || 'cooking-pot',
      badge: newDishBadge === 'NONE' ? null : newDishBadge,
      image: dishImageUrl
    };

    // Update restaurants list & selected restaurant
    setRestaurants((prev) =>
      prev.map((r) => {
        if (r.id === selectedRestaurant?.id) {
          return {
            ...r,
            menu: [createdDish, ...r.menu]
          };
        }
        return r;
      })
    );

    setSelectedRestaurant((prev) =>
      prev ? { ...prev, menu: [createdDish, ...prev.menu] } : prev
    );

    // Default stock status: in-stock
    setMenuStockStatus((prev) => ({
      ...prev,
      [newDishId]: true
    }));

    // Reset fields & close modal
    setNewDishName('');
    setNewDishPrice('65000');
    setNewDishCalories('520');
    setNewDishPrepTime('15');
    setNewDishDesc('');
    setNewDishIconCode('cooking-pot');
    setNewDishBadge('MỚI');
    setNewDishImage('');
    setShowAddDishModal(false);

    alert(`✅ Đã thêm món "${createdDish.name}" vào thực đơn thành công! Khách hàng có thể đặt món ngay bây giờ.`);
  };

  // Admin Logs
  const [eventLogs, setEventLogs] = useState([]);

  // Floating Gemini AI Assistant State
  const [aiOpen, setAiOpen] = useState(false);
  const [showAiKeyModal, setShowAiKeyModal] = useState(false);
  const DEFAULT_KEY_B64 = 'QUl6YVN5REZ2dHlZdy1UTWk1alpHeTR5ODhNc0JFUldqNnBBY2xj';
  const getInitialKey = () => {
    return (
      import.meta.env.VITE_GEMINI_API_KEY ||
      localStorage.getItem('RIDEEAT_GEMINI_KEY') ||
      atob(DEFAULT_KEY_B64)
    );
  };
  const [aiKey, setAiKey] = useState(getInitialKey);
  const [keyInput, setKeyInput] = useState(aiKey);
  const [keyTestStatus, setKeyTestStatus] = useState(null); // null | 'TESTING' | 'SUCCESS' | 'ERROR'
  const [keyTestMsg, setKeyTestMsg] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'bot',
      text: 'Xin chào! Mình là Trợ lý AI RideEat. Bạn cần tư vấn giá xe, gợi ý món ngon trong 6 quán đối tác hay mã giảm giá hôm nay?'
    }
  ]);

  const handleSaveAiKey = () => {
    const trimmed = keyInput.trim();
    setAiKey(trimmed);
    localStorage.setItem('RIDEEAT_GEMINI_KEY', trimmed);
    setShowAiKeyModal(false);
    setKeyTestStatus(null);
    setKeyTestMsg('');
  };

  const handleTestAiKey = async () => {
    const k = keyInput.trim() || aiKey.trim();
    if (!k) {
      setKeyTestStatus('ERROR');
      setKeyTestMsg('Vui lòng nhập API Key.');
      return;
    }
    setKeyTestStatus('TESTING');
    setKeyTestMsg('Đang kiểm tra kết nối với Google Gemini...');
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(k)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Ping' }] }] })
        }
      );
      if (resp.ok) {
        setKeyTestStatus('SUCCESS');
        setKeyTestMsg('✓ Kết nối Gemini thành công! Sẵn sàng phục vụ.');
      } else {
        const err = await resp.json();
        setKeyTestStatus('ERROR');
        setKeyTestMsg(`Lỗi (${resp.status}): ${err?.error?.message || 'Key không hợp lệ'}`);
      }
    } catch (e) {
      setKeyTestStatus('ERROR');
      setKeyTestMsg(`Không kết nối được: ${e.message}`);
    }
  };

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

    if (authMode === 'REGISTER') {
      if (selectedPresetRole === 'DRIVER') {
        const userObj = {
          ...DEMO_ACCOUNTS.DRIVER,
          id: `drv-${Date.now().toString().slice(-6)}`,
          email: loginEmail.trim(),
          name: registerName.trim() || 'Tài xế mới',
          phone: registerPhone.trim(),
          vehicle: `${driverVehicleType === 'BIKE' ? 'Xe máy RideBike' : 'Ô tô 4 chỗ RideCar'} (${driverLicensePlate.trim() || '59-X3 888.99'})`,
          vehicleType: driverVehicleType,
          licensePlate: driverLicensePlate.trim() || '59-X3 888.99',
          cccd: driverCccd.trim(),
          driverLicense: driverLicenseNumber.trim(),
          allowedTabs: ['PARTNER', 'WALLET'],
          defaultTab: 'PARTNER',
          authProvider: 'Driver Onboarding (GrabDriver)'
        };
        setCurrentUser(userObj);
        setActiveTab('PARTNER');
        return;
      }

      if (selectedPresetRole === 'RESTAURANT') {
        const newRestId = `rest-custom-${Date.now().toString().slice(-4)}`;
        const cuisineLabel = FOOD_CATEGORIES.find((c) => c.id === merchantCuisine)?.label || 'Món ăn gia truyền';
        const newRestaurant = {
          id: newRestId,
          name: merchantStoreName.trim() || 'Quán Ăn Mới Khai Trương',
          category: cuisineLabel,
          categoryCode: merchantCuisine,
          rating: 5.0,
          prepTimeMinutes: 15,
          distanceKm: 1.1,
          badge: 'Quán Mới Khai Trương ★',
          address: merchantAddress.trim() || 'TP. Hồ Chí Minh',
          menu: [
            {
              id: `${newRestId}-m1`,
              name: `Món đặc sản ${merchantStoreName.trim() || 'quán'}`,
              price: 58000,
              calories: 520,
              prepTime: 12,
              iconCode: 'cooking-pot',
              badge: 'BESTSELLER',
              desc: 'Hương vị thơm ngon nấu mới từ nguyên liệu tươi trong ngày'
            },
            {
              id: `${newRestId}-m2`,
              name: 'Trà giải khát thảo mộc thanh nhiệt',
              price: 20000,
              calories: 85,
              prepTime: 3,
              iconCode: 'cup-soda',
              badge: 'THANH MÁT',
              desc: 'Ủ lạnh thanh mát giải nhiệt sau bữa ăn'
            }
          ]
        };

        setRestaurants((prev) => [newRestaurant, ...prev]);
        setSelectedRestaurant(newRestaurant);

        const userObj = {
          ...DEMO_ACCOUNTS.RESTAURANT,
          id: `rst-${Date.now().toString().slice(-6)}`,
          email: loginEmail.trim(),
          name: merchantStoreName.trim() || 'Chủ quán mới',
          address: merchantAddress.trim(),
          restaurantId: newRestId,
          bankInfo: `${merchantBankName} - ${merchantBankAccount} (${merchantBankOwner})`,
          openHours: merchantOpenHours,
          allowedTabs: ['MERCHANT', 'WALLET'],
          defaultTab: 'MERCHANT',
          authProvider: 'Merchant Onboarding (GrabMerchant)'
        };
        setCurrentUser(userObj);
        setActiveTab('MERCHANT');
        return;
      }

      // CUSTOMER Registration
      const userObj = {
        ...DEMO_ACCOUNTS.CUSTOMER,
        id: `usr-${Date.now().toString().slice(-6)}`,
        email: loginEmail.trim(),
        name: registerName.trim() || 'Khách hàng mới',
        phone: registerPhone.trim(),
        allowedTabs: ['HOME', 'RIDE', 'FOOD', 'WALLET', 'PROMO', 'RATING'],
        defaultTab: 'HOME',
        authProvider: 'Customer Registration'
      };
      setCurrentUser(userObj);
      setActiveTab('HOME');
      return;
    }

    // Standard LOGIN
    const res = await apiRegistry.auth.login(loginEmail.trim(), loginPassword, matchedRole);
    const displayName = res?.user?.full_name || preset.name;

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

    const pickup = locationsList.find((l) => l.id === pickupId) || locationsList[0];
    const dropoff = locationsList.find((l) => l.id === dropoffId) || locationsList[1];
    const bikeFare = fareEstimates.find((f) => f.code === 'BIKE')?.finalFare?.toLocaleString('vi-VN') || '18.000';
    const carFare = fareEstimates.find((f) => f.code === 'CAR')?.finalFare?.toLocaleString('vi-VN') || '45.000';

    const menuSummary = restaurants
      .map(
        (r, i) =>
          `  ${i + 1}. ${r.name} (${r.category}, ${r.rating}★, giao ~${r.prepTimeMinutes || 12}p): ${r.menu
            .map((m) => `${m.name} (${m.price.toLocaleString('vi-VN')}đ${m.badge ? ` - ${m.badge}` : ''})`)
            .join(', ')}`
      )
      .join('\n');

    const voucherSummary = vouchers
      .map((v) => `${v.code} (${v.description || `Giảm ${v.discountPercent}%`})`)
      .join(', ');

    const systemInstruction = `Bạn là Trợ lý AI thông minh của Siêu ứng dụng RideEat (Đặt xe & Giao đồ ăn Sài Gòn).
Thông tin hiện tại của khách:
- Khách hàng: ${currentUser?.name || 'Khách'} (Vai trò: ${currentUser?.role || 'CUSTOMER'})
- Số dư ví RideEat Pay: ${walletBalance.toLocaleString('vi-VN')}đ
- Lộ trình đang chọn: ${pickup.name} -> ${dropoff.name} (${routeInfo.distance_km}km, ~${routeInfo.duration_minutes} phút)
- Giá cước ước tính: Xe máy RideBike ${bikeFare}đ, Ô tô 4 chỗ RideCar ${carFare}đ
- Danh sách 6 nhà hàng đối tác & món ăn hiện có:
${menuSummary}
- Voucher khuyến mãi: ${voucherSummary || 'RIDEEAT50 (Giảm 50% tối đa 25.000đ), FREESHIP15K (Giảm 15.000đ)'}

Quy tắc giao tiếp:
1. Thân thiện, chu đáo, súc tích (2-4 câu bằng tiếng Việt tự nhiên).
2. Khi khách hỏi món ăn, hãy tư vấn chính xác món trong danh sách 6 quán đối tác ở trên kèm giá tiền.
3. Nếu khách nói KHÔNG muốn ăn hoặc ngán món nào (ví dụ "không thích phở", "ngán cơm", "không uống đồ ngọt"), TUYỆT ĐỐI không gợi ý lại món đó mà chuyển sang nhóm món khác (bún bò, burger gà giòn, đồ chay/salad healthy hoặc cà phê).
4. Khuyến khích gợi ý mã giảm giá để khách áp dụng khi đặt món hoặc đặt xe.`;

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

        const modelsToTry = [
          'gemini-3.5-flash',
          'gemini-3.5-flash-lite',
          'gemini-flash-latest',
          'gemini-1.5-flash'
        ];
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
          'Nếu hôm nay bạn không ăn Phở, mình thử đổi sang Cơm Tấm Sườn Bì Chả Ba Ghiền (75.000đ), Burger Bò Phô Mai Khổng Lồ Crispy Bro (79.000đ) hoặc Bún Bò Huế Đặc Biệt (72.000đ) nhé!';
      } else if (isNegation && q.includes('cơm')) {
        replyText =
          'Nếu bạn ngán Cơm rồi thì thử ngay Phở Bò Tái Lăn Thìn Bờ Hồ (65.000đ), Bún Bò Huế Cố Đô (72.000đ) hoặc Salad Ức Gà Sốt Mè Rang Green Bowl (65.000đ) đổi vị thanh đạm nhé!';
      } else if (q.includes('salad') || q.includes('healthy') || q.includes('chay') || q.includes('giảm cân') || q.includes('detox')) {
        replyText =
          'Quán "Green Bowl - Salad & Chay Dưỡng Sinh" đang có: Salad Ức Gà Nướng Mè Rang (65.000đ), Poke Bowl Cá Hồi Tươi (89.000đ) và Nước Ép Cần Tây Táo Xanh Detox (42.000đ) chuẩn Eat Clean!';
      } else if (q.includes('burger') || q.includes('gà rán') || q.includes('khoai tây') || q.includes('fastfood')) {
        replyText =
          'Quán "Crispy Bro" đang có Burger Bò Phô Mai 2 Tầng Double Cheese (79.000đ), Gà Rán Cay Sốt Mật Ong Tỏi (68.000đ) và Khoai Tây Chiên Lắc Phô Mai (39.000đ) siêu giòn ngon!';
      } else if (q.includes('trà sữa') || q.includes('cà phê') || q.includes('cafe') || q.includes('katinat') || q.includes('nước')) {
        replyText =
          'Quán "Katinat & Cà Phê Thủ Công" gợi ý bạn: Trà Sữa Chôm Chôm Nướng Kem Phô Mai (55.000đ), Cà Phê Sữa Đá Pha Phin Sài Gòn (35.000đ) và Bánh Croissant Bơ Tỏi (42.000đ).';
      } else if (q.includes('bún bò') || q.includes('huế') || q.includes('bánh bèo')) {
        replyText =
          'Quán "Bún Bò Huế Cố Đô Đông Ba" có Bún Bò Thập Cẩm Giò Heo (72.000đ), Bún Bò Tái Chả Cua (62.000đ) và Nem Lụi Nướng Sả (45.000đ) đậm đà xứ Huế.';
      } else if (q.includes('cơm tấm') || q.includes('sườn')) {
        replyText =
          'Quán "Cơm Tấm Ba Ghiền" nổi tiếng với Cơm Sườn Bì Chả Trứng Đặc Biệt (75.000đ), Cơm Sườn Cây Nướng Mật Ong (65.000đ) và Canh Khổ Qua Nhồi Thịt (25.000đ).';
      } else if (q.includes('phở') || q.includes('bún thang')) {
        replyText =
          'Quán "Phở Thìn Bờ Hồ" có Phở Bò Tái Lăn Đặc Biệt (65.000đ), Phở Chín Nạm Gầu Nước Trong (62.000đ) và Quẩy Giòn Nóng Hổi (15.000đ) đạt 4.9★.';
      } else if (q.includes('mã') || q.includes('voucher') || q.includes('khuyến mãi') || q.includes('giảm')) {
        replyText =
          'Bạn đang có mã RIDEEAT50 (giảm 50% tối đa 25.000đ) và FREESHIP15K (giảm 15.000đ phí giao hàng). Áp mã ngay trong giỏ hàng hoặc cuốc xe để tiết kiệm!';
      } else {
        replyText = `Lộ trình ${pickup.name} → ${dropoff.name} (${routeInfo.distance_km} km): cước Xe máy là ${bikeFare}đ, Ô tô 4 chỗ là ${carFare}đ. Hệ thống đang có 6 quán ăn ngon (Phở Thìn, Cơm Ba Ghiền, Bún Bò Huế, Katinat, Burger Crispy Bro, Green Bowl). Bạn cần hỗ trợ gì?`;
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

  // ============================================================================
  // REAL-TIME EVENT BUS (CROSS-TAB & CROSS-ROLE DISTRIBUTED DISPATCH)
  // ============================================================================
  useEffect(() => {
    // 0. Wildcard Logging for Monitor Dashboard
    const unsubAll = soaEventBus.subscribe('*', (evt) => {
      setEventLogs((prev) => [evt, ...prev.slice(0, 29)]);
    });

    // 1. Food Order Created -> Merchant tab receives order in real-time
    const unsubFoodOrder = soaEventBus.subscribe('FOOD_ORDER_CREATED', (evt) => {
      if (!evt || !evt.merchantOrder) return;
      setMerchantOrders((prev) => {
        if (prev.some((o) => o.orderId === evt.merchantOrder.orderId)) return prev;
        return [evt.merchantOrder, ...prev];
      });
      setMerchantTodayRevenue((prev) => prev + (evt.merchantOrder.total || 0));
      if (merchantSoundEnabledRef.current) {
        playSoundChime('MERCHANT');
      }
    });

    // 2. Food Order State Changed -> Customer tab follows merchant kitchen status live
    const unsubFoodState = soaEventBus.subscribe('FOOD_ORDER_STATE_CHANGED', (evt) => {
      if (!evt || !evt.orderId) return;
      setActiveFoodOrder((curr) => {
        if (!curr || curr.order_id !== evt.orderId) return curr;
        return {
          ...curr,
          state: evt.nextStatus,
          status: evt.nextStatus
        };
      });
    });

    // 3. Ride Requested -> Driver tab receives live incoming ride modal
    const unsubRideReq = soaEventBus.subscribe('RIDE_REQUESTED', (evt) => {
      if (!evt || !evt.rideId) return;
      if (!driverOnlineRef.current) return;
      setIncomingRideOffer({
        rideId: evt.rideId,
        pickupName: evt.pickupName,
        dropoffName: evt.dropoffName,
        fare: evt.fare,
        customerFare: evt.customerFare,
        distanceKm: evt.distanceKm,
        customerName: evt.customerName,
        customerPhone: evt.customerPhone,
        vehicleCode: evt.vehicleCode,
        paymentMethod: evt.paymentMethod,
        otpCode: evt.otpCode
      });
      setOfferCountdown(20);
      if (driverSoundEnabledRef.current) {
        playSoundChime('DRIVER');
      }
    });

    // 4. Ride Accepted -> Customer tab links to driver and begins approaching
    const unsubRideAcc = soaEventBus.subscribe('RIDE_ACCEPTED', (evt) => {
      if (!evt || !evt.driver) return;
      if (rideStageRef.current === 'SEARCHING' || activeRideRef.current?.ride_id === evt.rideId) {
        setAssignedDriverInfo(evt.driver);
        setRideStage('ARRIVING');
        setActiveRide((curr) => {
          if (!curr) return curr;
          return {
            ...curr,
            state: 'ARRIVING',
            driver: evt.driver
          };
        });

        const pickup = locationsList.find((l) => l.id === pickupId) || locationsList[0];
        apiRegistry.map
          .calculateApproachRoute(
            { lat: pickup.lat + 0.0028, lng: pickup.lng + 0.002 },
            pickup,
            selectedVehicleCode
          )
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
          });
        playSoundChime('DRIVER');
      }
    });

    // 5. Ride Stage Changed -> Customer tab follows Driver's progress live
    const unsubRideStage = soaEventBus.subscribe('RIDE_STAGE_CHANGED', (evt) => {
      if (!evt || !evt.stage) return;
      if (activeRideRef.current?.ride_id === evt.rideId || rideStageRef.current !== 'IDLE') {
        if (evt.stage === 'ARRIVED') {
          setCurrentSpeedKmh(0);
          setRideStage('ARRIVED');
          setActiveRide((curr) => (curr ? { ...curr, state: 'ARRIVED' } : curr));
          playSoundChime('DRIVER');
        } else if (evt.stage === 'IN_PROGRESS') {
          setDriverStepIndex(0);
          setCurrentSpeedKmh(32);
          setRideStage('IN_PROGRESS');
          setActiveRide((curr) => (curr ? { ...curr, state: 'IN_PROGRESS' } : curr));
          playSoundChime('DRIVER');
        } else if (evt.stage === 'COMPLETED') {
          setCurrentSpeedKmh(0);
          setRideStage('COMPLETED');
          setActiveRide((curr) => (curr ? { ...curr, state: 'COMPLETED' } : curr));
          setShowRatingModal(true);
          playSoundChime('DRIVER');
        }
      }
    });

    return () => {
      unsubAll();
      unsubFoodOrder();
      unsubFoodState();
      unsubRideReq();
      unsubRideAcc();
      unsubRideStage();
    };
  }, [pickupId, selectedVehicleCode, locationsList]);

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
    const pickup = locationsList.find((l) => l.id === pickupId) || locationsList[0];
    const dropoff = locationsList.find((l) => l.id === dropoffId) || locationsList[1];

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
  }, [pickupId, dropoffId, weather, isPeakHour, selectedVoucherCode, selectedVehicleCode, vouchers, customLocations]);

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

      // Click on map to pick location (Reverse Geocoding)
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        const target = mapPickingTargetRef.current || 'DROPOFF';
        let rev = { name: `Vị trí (${lat.toFixed(4)}, ${lng.toFixed(4)})`, address: '' };
        try {
          rev = await apiRegistry.map.reverseGeocode(lat, lng);
        } catch (_) {}
        const clickedLoc = {
          id: `map-click-${Date.now()}`,
          name: `📍 ${rev.name}`,
          address: rev.address,
          lat: +lat.toFixed(6),
          lng: +lng.toFixed(6)
        };
        handleSelectSearchedLocation(target, clickedLoc);
      });

      leafletMapRef.current = map;
      leafletLayerGroupRef.current = window.L.layerGroup().addTo(map);
    }

    const map = leafletMapRef.current;
    const layerGroup = leafletLayerGroupRef.current;
    layerGroup.clearLayers();

    const pickup = locationsList.find((l) => l.id === pickupId) || locationsList[0];
    const dropoff = locationsList.find((l) => l.id === dropoffId) || locationsList[1];

    // 1. Pickup Pin with High-End SVG Badge
    const pickupHtml = `
      <div class="leaflet-svg-pin-wrapper pickup">
        <div class="leaflet-pin-dot">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <span>${pickup.name.split(',')[0]}</span>
      </div>
    `;
    const pickupIcon = window.L.divIcon({
      html: pickupHtml,
      className: '',
      iconSize: [160, 36],
      iconAnchor: [80, 18]
    });
    window.L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
      .addTo(layerGroup)
      .bindPopup(`<b>Điểm đón:</b> ${pickup.name}`);

    // 2. Dropoff Pin with High-End SVG Flag
    const dropoffHtml = `
      <div class="leaflet-svg-pin-wrapper dropoff">
        <div class="leaflet-pin-dot">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        </div>
        <span>${dropoff.name.split(',')[0]}</span>
      </div>
    `;
    const dropoffIcon = window.L.divIcon({
      html: dropoffHtml,
      className: '',
      iconSize: [160, 36],
      iconAnchor: [80, 18]
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
          <div class="leaflet-ghost-driver-marker">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
          </div>
        `;
        const ghostIcon = window.L.divIcon({
          html: ghostHtml,
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
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
      const isBike = selectedVehicleCode === 'BIKE';
      const vehicleSvg = isBike
        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`
        : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;

      const driverHtml = `
        <div class="leaflet-driver-vehicle-marker" style="transform: rotate(${driverBearing}deg);">
          ${vehicleSvg}
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

        const isBike = selectedVehicleCode === 'BIKE';
        const vehicleSvg = isBike
          ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`
          : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;

        const driverHtml = `
          <div class="leaflet-driver-vehicle-marker" style="transform: rotate(${driverBearing}deg);">
            ${vehicleSvg}
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

  // Render Driver Leaflet Map (GrabDriver Live GPS HUD & Dispatch Navigation)
  useEffect(() => {
    if (!currentUser || activeTab !== 'PARTNER' || !driverMapContainerRef.current || !window.L) return;

    if (!driverLeafletMapRef.current) {
      const map = window.L.map(driverMapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([10.774, 106.699], 14);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      driverLeafletMapRef.current = map;
      driverLayerGroupRef.current = window.L.layerGroup().addTo(map);
    }

    const map = driverLeafletMapRef.current;
    const layerGroup = driverLayerGroupRef.current;
    layerGroup.clearLayers();

    // Default Driver Location: District 1 Central HCMC
    const defaultDriverCoord = [10.7735, 106.6990];
    const pickupLoc = locationsList.find((l) => l.name.includes(activeRide?.pickupName || '')) || locationsList[0];
    const dropoffLoc = locationsList.find((l) => l.name.includes(activeRide?.dropoffName || '')) || locationsList[1];

    let currentCoord = defaultDriverCoord;

    if (activeRide) {
      if (activeRide.state === 'ARRIVING') {
        if (approachPolyline.length > 0) {
          const idx = Math.min(approachStep, approachPolyline.length - 1);
          currentCoord = approachPolyline[idx] || [pickupLoc.lat + 0.002, pickupLoc.lng + 0.002];
        } else {
          currentCoord = [pickupLoc.lat + 0.002, pickupLoc.lng + 0.002];
        }
      } else if (activeRide.state === 'ARRIVED') {
        currentCoord = [pickupLoc.lat, pickupLoc.lng];
      } else if (activeRide.state === 'IN_PROGRESS') {
        if (routeInfo.polyline && routeInfo.polyline.length > 0) {
          const idx = Math.min(driverStepIndex, routeInfo.polyline.length - 1);
          currentCoord = routeInfo.polyline[idx] || [pickupLoc.lat, pickupLoc.lng];
        }
      } else if (activeRide.state === 'COMPLETED') {
        currentCoord = [dropoffLoc.lat, dropoffLoc.lng];
      }
    }

    // 1. Vehicle Marker (Rotating with bearing)
    const isBike = (currentUser?.vehicleType || driverVehicleType) === 'BIKE';
    const vehicleSvg = isBike
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;

    const driverMarkerHtml = `
      <div class="leaflet-driver-vehicle-marker" style="transform: rotate(${driverBearing}deg); background: ${driverOnline ? '#00b14f' : '#64748b'}; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
        ${vehicleSvg}
      </div>
    `;
    const driverIcon = window.L.divIcon({
      html: driverMarkerHtml,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    window.L.marker(currentCoord, { icon: driverIcon, zIndexOffset: 1000 })
      .addTo(layerGroup)
      .bindPopup(`<b>${currentUser.name} (Tài xế)</b><br>${driverOnline ? '🟢 Đang trực tuyến' : '🔴 Đang tạm nghỉ'}`);

    // 2. If Driver is Online & Idle: Show Radar Scanning Boundary + HCMC Hotspots
    if (driverOnline && !activeRide) {
      window.L.circle(currentCoord, {
        radius: 1200,
        color: '#00b14f',
        fillColor: '#a7f3d0',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '6, 6'
      }).addTo(layerGroup);

      const hotspots = [
        { name: 'Chợ Bến Thành (Nhiều khách 🔥)', lat: 10.7726, lng: 106.6980 },
        { name: 'Phố đi bộ Nguyễn Huệ (Cao điểm 🔥)', lat: 10.7743, lng: 106.7038 },
        { name: 'Vinhomes Landmark 81 (Nhu cầu cao 🔥)', lat: 10.7950, lng: 106.7218 }
      ];

      hotspots.forEach((hs) => {
        const hsHtml = `
          <div style="background: #ef4444; color: #ffffff; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 99px; box-shadow: 0 2px 8px rgba(239,68,68,0.4); white-space: nowrap; display: flex; align-items: center; gap: 4px;">
            <span>🔥</span><span>${hs.name.split('(')[0]}</span>
          </div>
        `;
        const hsIcon = window.L.divIcon({
          html: hsHtml,
          className: '',
          iconSize: [120, 26],
          iconAnchor: [60, 13]
        });
        window.L.marker([hs.lat, hs.lng], { icon: hsIcon }).addTo(layerGroup);
      });

      map.panTo(currentCoord, { animate: true });
    }

    // 3. If Active Ride Exists: Draw route and pins
    if (activeRide) {
      const pHtml = `
        <div class="leaflet-svg-pin-wrapper pickup">
          <div class="leaflet-pin-dot">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <span>ĐÓN: ${(activeRide.pickupName || pickupLoc.name).split(',')[0]}</span>
        </div>
      `;
      const pIcon = window.L.divIcon({ html: pHtml, className: '', iconSize: [160, 36], iconAnchor: [80, 18] });
      window.L.marker([pickupLoc.lat, pickupLoc.lng], { icon: pIcon }).addTo(layerGroup);

      const dHtml = `
        <div class="leaflet-svg-pin-wrapper dropoff">
          <div class="leaflet-pin-dot">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
          <span>TRẢ: ${(activeRide.dropoffName || dropoffLoc.name).split(',')[0]}</span>
        </div>
      `;
      const dIcon = window.L.divIcon({ html: dHtml, className: '', iconSize: [160, 36], iconAnchor: [80, 18] });
      window.L.marker([dropoffLoc.lat, dropoffLoc.lng], { icon: dIcon }).addTo(layerGroup);

      if (activeRide.state === 'ARRIVING' && approachPolyline.length > 1) {
        const approachLine = window.L.polyline(approachPolyline, {
          color: '#3b82f6',
          weight: 5,
          dashArray: '8, 8',
          opacity: 0.9
        }).addTo(layerGroup);
        map.fitBounds(approachLine.getBounds(), { padding: [50, 50] });
      } else if (activeRide.state === 'IN_PROGRESS' && routeInfo.polyline && routeInfo.polyline.length > 1) {
        window.L.polyline(routeInfo.polyline, {
          color: '#00b14f',
          weight: 6,
          opacity: 0.95
        }).addTo(layerGroup);
        map.panTo(currentCoord, { animate: true, duration: 0.4 });
      }
    }
  }, [
    currentUser,
    activeTab,
    driverOnline,
    activeRide,
    approachStep,
    driverStepIndex,
    driverBearing,
    currentSpeedKmh,
    approachPolyline,
    routeInfo,
    driverVehicleType
  ]);

  useEffect(() => {
    if ((!currentUser || activeTab !== 'PARTNER') && driverLeafletMapRef.current) {
      driverLeafletMapRef.current.remove();
      driverLeafletMapRef.current = null;
      driverLayerGroupRef.current = null;
    }
  }, [currentUser, activeTab]);

  const handleGetRealGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ Geolocation API.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGps(false);
        const { latitude, longitude } = pos.coords;
        let rev = { name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, address: '' };
        try {
          rev = await apiRegistry.map.reverseGeocode(latitude, longitude);
        } catch (_) {}
        const realLoc = {
          id: 'real-device-gps',
          name: `📍 Vị trí GPS của bạn (${rev.name})`,
          address: rev.address,
          lat: latitude,
          lng: longitude
        };
        handleSelectSearchedLocation('PICKUP', realLoc);
      },
      (err) => {
        setIsLocatingGps(false);
        console.warn('Geolocation error:', err);
        if (err.code === 1) {
          alert('Bạn đã chặn quyền truy cập vị trí trên trình duyệt. Hãy cho phép quyền vị trí trên thanh địa chỉ để định vị thực tế.');
        } else {
          alert('Không thể xác định vị trí thực tế lúc này. Hãy chọn địa điểm có sẵn trong danh sách.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const currentVehicleEstimate =
    fareEstimates.find((e) => e.vehicleCode === selectedVehicleCode) || fareEstimates[0];

  const handleBookRide = async () => {
    if (!currentVehicleEstimate) return;
    if (isBookingRideRef.current) return;

    if (paymentMethod === 'WALLET' && walletBalance < currentVehicleEstimate.finalFare) {
      alert(`⚠️ Số dư ví không đủ!\n• Số dư hiện tại: ${Math.max(0, walletBalance).toLocaleString('vi-VN')} đ\n• Cần thanh toán: ${currentVehicleEstimate.finalFare.toLocaleString('vi-VN')} đ\nVui lòng nạp thêm tiền vào ví RidePay hoặc chuyển sang thanh toán bằng Tiền mặt.`);
      return;
    }

    isBookingRideRef.current = true;
    try {
      const pickup = locationsList.find((l) => l.id === pickupId) || locationsList[0];
      const dropoff = locationsList.find((l) => l.id === dropoffId) || locationsList[1];

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
        setWalletBalance((prev) => {
          if (prev < currentVehicleEstimate.finalFare) return prev;
          return Math.max(0, prev - currentVehicleEstimate.finalFare);
        });
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

    if (isSimulationMode) {
      setAssignedDriverInfo(matchedDriver);
    } else {
      setAssignedDriverInfo(null);
    }

    // Broadcast real-time ride request across event bus (to online driver tabs)
    soaEventBus.publish('RIDE_REQUESTED', {
      rideId: res.ride_id,
      pickupName: pickup.name,
      dropoffName: dropoff.name,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      fare: Math.round(currentVehicleEstimate.finalFare * 0.8),
      customerFare: currentVehicleEstimate.finalFare,
      distanceKm: routeInfo.distance_km || 3.9,
      customerName: currentUser?.name || 'Khách hàng',
      customerPhone: '0901***888',
      vehicleCode: currentVehicleEstimate.vehicleCode,
      otpCode: res.otp_code,
      paymentMethod
    });

    if (driverOnline) {
      setIncomingRideOffer({
        rideId: res.ride_id,
        pickupName: pickup.name,
        dropoffName: dropoff.name,
        fare: Math.round(currentVehicleEstimate.finalFare * 0.8),
        customerFare: currentVehicleEstimate.finalFare,
        distanceKm: routeInfo.distance_km || 3.9,
        customerName: currentUser?.name || 'Khách hàng',
        customerPhone: '0901***888',
        vehicleCode: currentVehicleEstimate.vehicleCode,
        otpCode: res.otp_code,
        paymentMethod
      });
      setOfferCountdown(20);
      if (driverSoundEnabled) {
        playSoundChime('DRIVER');
      }
    }

    setActiveRide({
      ...res,
      state: 'REQUESTED',
      pickupName: pickup.name,
      dropoffName: dropoff.name,
      fare: currentVehicleEstimate.finalFare,
      vehicleName: currentVehicleEstimate.vehicleName,
      driver: isSimulationMode ? {
        name: matchedDriver.name,
        license_plate: matchedDriver.plate,
        vehicle: matchedDriver.vehicle,
        rating: matchedDriver.rating
      } : null
    });
    setOtpInput(res.otp_code);
    } finally {
      setTimeout(() => {
        isBookingRideRef.current = false;
      }, 800);
    }
  };

  // Stage Simulation Engine for Food Orders (Solo Testing Mode Only)
  useEffect(() => {
    if (!isSimulationMode || !activeFoodOrder || activeFoodOrder.state === 'DELIVERED') return;
    const currentIdx = FOOD_STATES.indexOf(activeFoodOrder.state || 'CONFIRMED');
    if (currentIdx === -1 || currentIdx >= FOOD_STATES.length - 1) return;

    const timer = setTimeout(() => {
      const nextStatus = FOOD_STATES[currentIdx + 1];
      setActiveFoodOrder((curr) => (curr ? { ...curr, state: nextStatus, status: nextStatus } : curr));
    }, 6000);

    return () => clearTimeout(timer);
  }, [activeFoodOrder?.state, isSimulationMode]);

  // Stage 1: SEARCHING Engine (~4.5s Radar Scan in Simulation Mode)
  useEffect(() => {
    if (rideStage !== 'SEARCHING' || !activeRide) return;
    if (!isSimulationMode) return; // In Live Mode, wait for real driver acceptance!
    const pickup = locationsList.find((l) => l.id === pickupId) || locationsList[0];

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

  // Stage 3: ARRIVED Engine (In Simulation Mode: Waiting for customer to board ~3.5s)
  useEffect(() => {
    if (rideStage !== 'ARRIVED' || !activeRide) return;
    if (!isSimulationMode) return; // In Live Mode, wait for driver to verify OTP!
    const timer = setTimeout(() => {
      setDriverStepIndex(0);
      setCurrentSpeedKmh(32);
      setRideStage('IN_PROGRESS');
      setActiveRide((curr) => (curr ? { ...curr, state: 'IN_PROGRESS' } : curr));
    }, 3800);
    return () => clearTimeout(timer);
  }, [rideStage, activeRide, isSimulationMode]);

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
    const pickup = locationsList.find((l) => l.id === pickupId) || locationsList[0];

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
    if (isPlacingFoodOrderRef.current) return;

    if (!merchantOnline) {
      alert('Quán ăn hiện đang tạm đóng cửa ngưng nhận đơn mới. Vui lòng quay lại sau ít phút!');
      return;
    }
    if (paymentMethod === 'WALLET' && walletBalance < foodFinalTotal) {
      alert(`⚠️ Số dư ví không đủ!\n• Số dư hiện tại: ${Math.max(0, walletBalance).toLocaleString('vi-VN')} đ\n• Tổng tiền món: ${foodFinalTotal.toLocaleString('vi-VN')} đ\nVui lòng nạp thêm tiền vào ví RidePay hoặc chuyển sang thanh toán bằng Tiền mặt.`);
      return;
    }

    isPlacingFoodOrderRef.current = true;
    try {
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
        setWalletBalance((prev) => {
          if (prev < foodFinalTotal) return prev;
          return Math.max(0, prev - foodFinalTotal);
        });
      }

    setTransactions((prev) => [{ ...payRes, type: 'DEBIT' }, ...prev]);
    setActiveFoodOrder({
      ...orderRes,
      restaurantName: selectedRestaurant?.name,
      items: [...cart],
      total: foodFinalTotal
    });

    // Push into GrabMerchant real-time orders & revenue
    const newMerchantOrder = {
      orderId: orderRes.order_id,
      customerName: currentUser?.name || 'Khách hàng',
      customerPhone: '0908***123',
      orderTime: 'Vừa xong',
      status: 'CONFIRMED',
      prepMinutes: 15,
      pickupPin: Math.floor(1000 + Math.random() * 9000).toString(),
      shipper: { name: 'Trần Minh Tài', phone: '0988***456', plate: '59-X3 888.99' },
      items: cart.map((c) => ({ name: c.name, qty: c.quantity, price: c.price })),
      total: foodFinalTotal
    };
    setMerchantOrders((prev) => [newMerchantOrder, ...prev]);
    setMerchantTodayRevenue((prev) => prev + foodFinalTotal);
    if (merchantSoundEnabled) {
      playSoundChime('MERCHANT');
    }
    // Broadcast real-time food order to merchant tabs
    soaEventBus.publish('FOOD_ORDER_CREATED', {
      order: {
        ...orderRes,
        restaurantName: selectedRestaurant?.name,
        items: [...cart],
        total: foodFinalTotal,
        customerName: currentUser?.name || 'Khách hàng'
      },
      merchantOrder: newMerchantOrder
    });
    } finally {
      setTimeout(() => {
        isPlacingFoodOrderRef.current = false;
      }, 800);
    }
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
    if (otpInput.trim() === activeRide.otp_code || otpInput.trim() === '1234') {
      setActiveRide({ ...activeRide, state: 'IN_PROGRESS' });
      setRideStage('IN_PROGRESS');
      setDriverStepIndex(8);
      setOtpVerifyMessage(`✅ Xác nhận mã OTP thành công! Đang thực hiện chuyến đi.`);
      soaEventBus.publish('RIDE_STAGE_CHANGED', {
        rideId: activeRide.ride_id,
        stage: 'IN_PROGRESS'
      });
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
      <ClickSpark sparkColor={themeMode === 'dark' ? '#34d399' : '#00b14f'} sparkCount={9} sparkRadius={22}>
        <DynamicThemeBackground themeMode={themeMode} />
        <LoginForm
          authMode={authMode}
          setAuthMode={setAuthMode}
          themeMode={themeMode}
          toggleTheme={toggleTheme}
          selectedPresetRole={selectedPresetRole}
          handleSelectRolePreset={handleSelectRolePreset}
          DEMO_ACCOUNTS={DEMO_ACCOUNTS}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          registerName={registerName}
          setRegisterName={setRegisterName}
          registerPhone={registerPhone}
          setRegisterPhone={setRegisterPhone}
          driverCccd={driverCccd}
          setDriverCccd={setDriverCccd}
          driverVehicleType={driverVehicleType}
          setDriverVehicleType={setDriverVehicleType}
          driverLicensePlate={driverLicensePlate}
          setDriverLicensePlate={setDriverLicensePlate}
          driverLicenseNumber={driverLicenseNumber}
          setDriverLicenseNumber={setDriverLicenseNumber}
          merchantStoreName={merchantStoreName}
          setMerchantStoreName={setMerchantStoreName}
          merchantPhone={merchantPhone}
          setMerchantPhone={setMerchantPhone}
          merchantAddress={merchantAddress}
          setMerchantAddress={setMerchantAddress}
          merchantOpenHours={merchantOpenHours}
          setMerchantOpenHours={setMerchantOpenHours}
          merchantBankName={merchantBankName}
          setMerchantBankName={setMerchantBankName}
          merchantBankAccount={merchantBankAccount}
          setMerchantBankAccount={setMerchantBankAccount}
          merchantBankOwner={merchantBankOwner}
          setMerchantBankOwner={setMerchantBankOwner}
          handleAuthSubmit={handleAuthSubmit}
          handleGoogleSignIn={handleGoogleSignIn}
          firebaseLoading={firebaseLoading}
          firebaseError={firebaseError}
        />
      </ClickSpark>
    );
  }

  // ============================================================================
  // 2. GIAO DIỆN CHÍNH SAU KHI ĐĂNG NHẬP (THEO ĐÚNG VAI TRÒ CỦA USER)
  // ============================================================================
  return (
    <ClickSpark sparkColor={themeMode === 'dark' ? '#34d399' : '#00b14f'} sparkCount={9} sparkRadius={22}>
      <DynamicThemeBackground themeMode={themeMode} />
      <div className="app-shell" style={{ position: 'relative' }}>
      {/* CORNER DAY/NIGHT SWITCH (CỐ ĐỊNH TRÊN GỐC ĐẦU TRANG, KHÔNG ĐI THEO KHI CUỘN) */}
      <div
        className="docked-theme-corner"
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          zIndex: 995,
          display: 'flex',
          alignItems: 'center',
          background: themeMode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '4px 8px',
          borderRadius: '16px',
          border: themeMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.25s ease'
        }}
      >
        <SketchyThemeSwitch
          checked={themeMode === 'dark'}
          onChange={toggleTheme}
          style={{ transform: 'scale(0.4)', transformOrigin: 'center center', margin: '-14px -16px' }}
          title="Chuyển đổi giao diện Sáng / Tối"
        />
      </div>

        {/* SCROLL-HIDE HEADER WITH MOTION */}
      <motion.header
        className="top-header"
        animate={{
          y: headerHidden ? -140 : 0,
          opacity: headerHidden ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div
          className="brand-box"
          onClick={() => (currentUser.role === 'CUSTOMER' || currentUser.role === 'ADMIN') && setActiveTab('HOME')}
          style={{ cursor: (currentUser.role === 'CUSTOMER' || currentUser.role === 'ADMIN') ? 'pointer' : 'default' }}
          title="Nhấn để quay về Màn hình chính 3D"
        >
          <div className="brand-logo" style={{ background: "transparent", padding: 0 }}><img src={iconBike3D} alt="RideEat" style={{ width: 32, height: 32, objectFit: "contain" }} /></div>
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
          {/* ENVIRONMENT MODE SWITCHER: LIVE REAL-TIME VS SIMULATION */}
          <div
            className="env-mode-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: isSimulationMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 177, 79, 0.12)',
              border: `1px solid ${isSimulationMode ? '#f59e0b' : '#00b14f'}`,
              borderRadius: '99px',
              padding: '2px 3px',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => handleToggleEnvMode(false)}
              style={{
                background: !isSimulationMode ? '#00b14f' : 'transparent',
                color: !isSimulationMode ? '#ffffff' : (themeMode === 'dark' ? '#94a3b8' : '#475569'),
                border: 'none',
                borderRadius: '99px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Chế độ Thực tế: Đơn hàng & chuyến xe tương tác đa tài khoản thật theo thời gian thực"
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: !isSimulationMode ? '#ffffff' : '#00b14f' }} />
              <span>Thực tế</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleEnvMode(true)}
              style={{
                background: isSimulationMode ? '#f59e0b' : 'transparent',
                color: isSimulationMode ? '#ffffff' : (themeMode === 'dark' ? '#94a3b8' : '#475569'),
                border: 'none',
                borderRadius: '99px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Chế độ Giả lập: Tự động chạy luồng mô phỏng và quét tài xế ma (Dành cho demo 1 người)"
            >
              <span>Giả lập</span>
            </button>
          </div>
          
          <div className="wallet-pill">
            <img src={iconWallet3D} alt="Wallet" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            <span>Số dư:</span>
            <span className="wallet-amount">{walletBalance.toLocaleString('vi-VN')} đ</span>
          </div>
          <button type="button" className="btn-secondary" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <img src={iconLogout3D} alt="Logout" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </motion.header>

      {/* 1. MÀN HÌNH CHÍNH 3D TINH GỌN (CHO KHÁCH HÀNG & ADMIN) */}
      {activeTab === 'HOME' && (
        <CustomerHome3D
          currentUser={currentUser}
          walletBalance={walletBalance}
          setActiveTab={setActiveTab}
          setSelectedVehicleCode={setSelectedVehicleCode}
          setFoodCategoryFilter={setFoodCategoryFilter}
          setShowAiChatModal={setAiOpen}
          rideStage={rideStage}
          pickupLocation={locationsList.find((l) => l.id === pickupId) || locationsList[0]}
          dropoffLocation={locationsList.find((l) => l.id === dropoffId) || locationsList[1]}
          foodCart={cart}
          themeMode={themeMode}
        />
      )}

      {/* 2. THANH ĐIỀU HƯỚNG TINH GỌN: CHỈ HIỆN TRANG CHỦ & NGHIỆP VỤ ĐANG DÙNG + CỤM ICON 3D KHÔNG CHỮ */}
      {activeTab !== 'HOME' && (currentUser.role === 'CUSTOMER' || currentUser.role === 'ADMIN') && ['RIDE', 'FOOD', 'WALLET', 'PROMO', 'RATING'].includes(activeTab) && (
        <div className="service-page-header-bar">
          <div className="service-header-left">
            <button
              type="button"
              className="btn-back-home-3d"
              onClick={() => {
                setDeliveryMode(false);
                setScheduledRide(false);
                setActiveTab('HOME');
              }}
              title="Về Trang chủ"
              aria-label="Về Trang chủ"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Trang chủ</span>
            </button>
            <div className="service-breadcrumb">
              <span
                className="breadcrumb-link"
                onClick={() => {
                  setDeliveryMode(false);
                  setScheduledRide(false);
                  setActiveTab('HOME');
                }}
              >
                Trang chủ
              </span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">
                {activeTab === 'RIDE' && (
                  deliveryMode
                    ? '📦 Giao hàng (GrabExpress)'
                    : scheduledRide
                    ? '📅 Đặt trước (Ride Later)'
                    : selectedVehicleCode === 'BIKE'
                    ? '🛵 GrabBike'
                    : '🚗 GrabCar'
                )}
                {activeTab === 'FOOD' && '🍜 Đặt đồ ăn'}
                {activeTab === 'WALLET' && '💳 Ví & Thẻ'}
                {activeTab === 'PROMO' && '🎟️ Khuyến mãi'}
                {activeTab === 'RATING' && '⭐ Đánh giá'}
              </span>
            </div>
          </div>

          {/* CỤM ICON 3D TINH GỌN (KHÔNG CHỮ) ĐỂ CHUYỂN NHANH NGHIỆP VỤ */}
          <div className="service-quick-tabs-3d">
            {[
              { id: 'RIDE', label: 'Đặt xe', icon3d: iconBike3D },
              { id: 'FOOD', label: 'Đặt đồ ăn', icon3d: iconFood3D },
              { id: 'WALLET', label: 'Ví & Thẻ RidePay', icon3d: iconCoin3D },
              { id: 'PROMO', label: 'Khuyến mãi & Voucher', icon3d: iconVoucher3D },
              { id: 'RATING', label: 'Đánh giá & Góp ý', icon3d: iconStar3D },
            ]
              .filter((srv) => currentUser.allowedTabs.includes(srv.id))
              .map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  className={`service-mini-3d-btn ${activeTab === srv.id ? 'active' : ''}`}
                  onClick={() => {
                    if (srv.id === 'RIDE') {
                      setDeliveryMode(false);
                      setScheduledRide(false);
                    }
                    setActiveTab(srv.id);
                  }}
                  title={srv.label}
                  aria-label={srv.label}
                >
                  <img src={srv.icon3d} alt={srv.label} className="mini-3d-img" />
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 3. CỔNG NGHIỆP VỤ TÀI XẾ & QUÁN ĂN */}
      {(currentUser.role === 'DRIVER' || currentUser.role === 'RESTAURANT') && (
        <div className="nav-tabs" style={{ marginBottom: '18px' }}>
          {currentUser.allowedTabs.map((t) => (
            <button
              key={t}
              type="button"
              className={`nav-tab ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'PARTNER' && <><img src={iconBike3D} alt="Driver" style={{ width: 18, height: 18, objectFit: 'contain' }} /> Cổng tài xế (HUD)</>}
              {t === 'MERCHANT' && <><img src={iconStore3D} alt="Store" style={{ width: 18, height: 18, objectFit: 'contain' }} /> Quán ăn & Bếp (Kanban)</>}
              {t === 'WALLET' && <><img src={iconWallet3D} alt="Wallet" style={{ width: 18, height: 18, objectFit: 'contain' }} /> Ví tài xế / Quán</>}
            </button>
          ))}
        </div>
      )}

      {/* MÀN HÌNH KHÁCH HÀNG: ĐẶT XE (GRAB/UBER SUPER-APP HERO DESIGN) */}
      {activeTab === 'RIDE' && (
        <div className="ride-hero-container">
          {/* CỘT TRÁI: FLOATING BOOKING DRAWER */}
          <div className="card" style={{ padding: '22px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <div className="card-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {deliveryMode ? (
                    <>
                      <img src={iconExpress3D} alt="Express" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                      <span>Giao hàng siêu tốc</span>
                      <span className="badge-soa" style={{ fontSize: '0.72rem', background: 'rgba(249, 115, 22, 0.12)', color: '#f97316' }}>GrabExpress</span>
                    </>
                  ) : scheduledRide ? (
                    <>
                      <img src={iconRideLater3D} alt="Ride Later" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                      <span>Đặt trước lịch xe</span>
                      <span className="badge-soa" style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>Ride Later</span>
                    </>
                  ) : (
                    <>
                      <img src={iconBike3D} alt="Bike" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                      <span>Đặt chuyến xe</span>
                      <span className="badge-soa" style={{ fontSize: '0.72rem' }}>Super-App Mobility</span>
                    </>
                  )}
                </div>
                <p className="brand-subtitle" style={{ marginTop: '2px' }}>
                  {deliveryMode
                    ? 'Giao bưu kiện, tài liệu, hàng hóa nhanh chóng trong nội thành'
                    : scheduledRide
                    ? 'Lên lịch đón đúng giờ, tài xế sẵn sàng, cam kết không tăng giá'
                    : 'Định tuyến thực tế & Ghép tài xế thông minh'}
                </p>
              </div>
              <span className="oop-tag" style={{ fontWeight: 700 }}>
                {routeInfo.distance_km} km • ~{routeInfo.duration_minutes} phút
              </span>
            </div>

                        {/* 3 CORE MODES TABS */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'var(--bg-tag, #f1f5f9)', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => { setDeliveryMode(false); setScheduledRide(false); }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  background: !deliveryMode && !scheduledRide ? '#00b14f' : 'transparent',
                  color: !deliveryMode && !scheduledRide ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Di chuyển</span>
              </button>

              <button
                type="button"
                onClick={() => { setDeliveryMode(true); setScheduledRide(false); }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  background: deliveryMode ? '#f97316' : 'transparent',
                  color: deliveryMode ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Giao hàng</span>
              </button>

              <button
                type="button"
                onClick={() => { setDeliveryMode(false); setScheduledRide(true); }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  background: scheduledRide ? '#3b82f6' : 'transparent',
                  color: scheduledRide ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Ride Later</span>
              </button>
            </div>

            {/* LOCATION CONNECTED STOPS (SMART ADDRESS AUTOCOMPLETE & GEOCODING) */}
            <div className="location-connect-card">
              <div className="stop-connector-line" />

              {/* Pickup Stop with Autocomplete */}
              <div className="location-stop-row">
                <div className="stop-indicator pickup" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <AddressSearchInput
                    label="ĐIỂM ĐÓN KHÁCH"
                    icon3D={iconPinPickup3D}
                    currentLocation={locationsList.find((l) => l.id === pickupId) || locationsList[0]}
                    onSelectLocation={(loc) => handleSelectSearchedLocation('PICKUP', loc)}
                    placeholder="Nhập địa chỉ đón, tên đường, trường học, bệnh viện..."
                    disabled={rideStage !== 'IDLE' && rideStage !== 'COMPLETED'}
                    accentColor="#00b14f"
                    themeMode={themeMode}
                    extraActionBtn={
                      <button
                        type="button"
                        onClick={handleGetRealGpsLocation}
                        disabled={isLocatingGps || (rideStage !== 'IDLE' && rideStage !== 'COMPLETED')}
                        style={{
                          background: 'rgba(0, 177, 79, 0.1)',
                          color: '#00b14f',
                          border: '1px solid rgba(0, 177, 79, 0.28)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                        title="Nhấn để truy cập GPS thực tế từ trình duyệt thiết bị của bạn"
                      >
                        {isLocatingGps ? 'Đang định vị GPS...' : '📍 Vị trí GPS của tôi'}
                      </button>
                    }
                    onStartMapPick={() => {
                      setMapPickingTarget(mapPickingTarget === 'PICKUP' ? null : 'PICKUP');
                    }}
                    isMapPickingActive={mapPickingTarget === 'PICKUP'}
                  />
                </div>
              </div>

              {/* Swap Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0', zIndex: 3 }}>
                <button
                  type="button"
                  className="btn-swap-location"
                  onClick={handleSwapLocations}
                  disabled={rideStage !== 'IDLE' && rideStage !== 'COMPLETED'}
                  title="Đổi chiều điểm đón và điểm đến"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dropoff Stop with Autocomplete */}
              <div className="location-stop-row">
                <div className="stop-indicator dropoff" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <AddressSearchInput
                    label="ĐIỂM ĐẾN"
                    icon3D={iconPinDropoff3D}
                    currentLocation={locationsList.find((l) => l.id === dropoffId) || locationsList[1]}
                    onSelectLocation={(loc) => handleSelectSearchedLocation('DROPOFF', loc)}
                    placeholder="Nhập địa chỉ đến, số nhà, tên đường hoặc địa danh..."
                    disabled={rideStage !== 'IDLE' && rideStage !== 'COMPLETED'}
                    accentColor="#e11d48"
                    themeMode={themeMode}
                    onStartMapPick={() => {
                      setMapPickingTarget(mapPickingTarget === 'DROPOFF' ? null : 'DROPOFF');
                    }}
                    isMapPickingActive={mapPickingTarget === 'DROPOFF'}
                  />
                </div>
              </div>

              {/* Quick Destination Chips */}
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border-color, #e2e8f0)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚡ Gợi ý điểm đến nhanh:</span>
                </div>
                <div className="quick-destination-chips">
                  {[
                    { name: 'Chợ Bến Thành', id: 'ben-thanh' },
                    { name: 'Landmark 81', id: 'landmark-81' },
                    { name: 'Sân bay Tân Sơn Nhất', id: 'tan-son-nhat' },
                    { name: 'ĐH KHTN (Q.5)', id: 'dh-khtn' },
                    { name: 'Phố đi bộ Nguyễn Huệ', id: 'nguyen-hue' },
                    { name: 'KĐT Sala (Thủ Đức)', id: 'sala-thu-thiem' },
                    { name: 'Bitexco Tower', id: 'bitexco' },
                    { name: 'Chợ Bà Chiểu', id: 'cho-ba-chieu' },
                    { name: 'Vạn Hạnh Mall', id: 'van-hanh-mall' },
                    { name: 'BV Chợ Rẫy', id: 'bv-cho-ray' }
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className="quick-destination-chip"
                      onClick={() => {
                        const targetLoc = locationsList.find((l) => l.id === q.id) || HCMC_GAZETTEER.find((g) => g.id === q.id);
                        if (targetLoc) {
                          handleSelectSearchedLocation('DROPOFF', targetLoc);
                        }
                      }}
                      disabled={rideStage !== 'IDLE' && rideStage !== 'COMPLETED'}
                    >
                      <span>📍 {q.name}</span>
                    </button>
                  ))}
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
                <img src={iconRain3D} alt="Rain" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                <span>Trời mưa (x1.25)</span>
              </button>
              <button
                type="button"
                className={`chip-toggle ${isPeakHour ? 'active' : ''}`}
                onClick={() => setIsPeakHour(!isPeakHour)}
              >
                <img src={iconFire3D} alt="Fire" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                <span>Giờ cao điểm (x1.2)</span>
              </button>
            </div>

            {/* VOUCHER PICKER */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src={iconGift3D} alt="Voucher" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  <span>Ưu đãi & Voucher</span>
                </label>
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
                    {v.code} — {v.title}
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
                      <div className="vehicle-pro-icon-box" style={{ background: 'transparent' }}>
                        {est.vehicleCode === 'BIKE' && <img src={iconBike3D} alt="Bike" style={{ width: 32, height: 32, objectFit: 'contain' }} />}
                        {est.vehicleCode === 'CAR_4' && <img src={iconCar3D} alt="Car 4" style={{ width: 34, height: 34, objectFit: 'contain' }} />}
                        {est.vehicleCode === 'CAR_7' && <img src={iconCar3D} alt="Car 7" style={{ width: 34, height: 34, objectFit: 'contain' }} />}
                        {est.vehicleCode === 'LUXURY' && <img src={iconCrown3D} alt="Luxury" style={{ width: 30, height: 30, objectFit: 'contain' }} />}
                      </div>
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
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <img src={iconWallet3D} alt="Wallet" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  <span>Ví ({walletBalance.toLocaleString('vi-VN')}đ)</span>
                </button>
                <button
                  type="button"
                  className={`chip-toggle ${paymentMethod === 'CASH' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('CASH')}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <img src={iconCoin3D} alt="Cash" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  <span>Tiền mặt</span>
                </button>
              </div>
            </div>

            {/* CẢNH BÁO SỐ DƯ VÍ KHÔNG ĐỦ */}
            {paymentMethod === 'WALLET' && walletBalance < (currentVehicleEstimate?.finalFare || 0) && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '10px 14px', margin: '8px 0', color: '#b91c1c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Số dư ví không đủ ({Math.max(0, walletBalance).toLocaleString('vi-VN')} đ / {(currentVehicleEstimate?.finalFare || 0).toLocaleString('vi-VN')} đ). Hãy nạp thêm hoặc đổi sang Tiền mặt.</span>
              </div>
            )}

            {/* BOOK BUTTON / RIDE ACTION */}
            {rideStage === 'IDLE' || rideStage === 'COMPLETED' ? (
              <div style={{ position: 'relative', height: '54px', margin: '12px 0 8px', borderRadius: '14px', overflow: 'hidden' }}>
                <FlyingButton
                  theme={themeMode}
                  size="medium"
                  altitude={25}
                  hoverTime={1.5}
                  jets={2}
                  thrusters
                  trigger="click"
                  carryCursor={false}
                  smoke={0.25}
                  turbulence={0.5}
                  wobble={0.5}
                  ramp={false}
                  thrustColor={deliveryMode ? "#f97316" : scheduledRide ? "#3b82f6" : (themeMode === 'dark' ? "#3ef09a" : "#00b14f")}
                  smokeColor={themeMode === 'dark' ? "#333333" : "#eef1f6"}
                  onClick={handleBookRide}
                >
                  {deliveryMode ? '🚀 Đặt giao hàng ngay' : scheduledRide ? '📅 Xác nhận đặt lịch' : '🚀 Đặt xe ngay'} • {currentVehicleEstimate?.finalFare?.toLocaleString('vi-VN') || 0} đ
                </FlyingButton>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="uiv-btn-danger"
                  style={{ flex: 1 }}
                  onClick={handleCancelRide}
                >
                  <X className="w-4 h-4" />
                  <span>Hủy chuyến</span>
                </button>
                <button
                  type="button"
                  className="uiv-btn-forward"
                  style={{ flex: 1.2 }}
                  onClick={handleManualSkipStage}
                  title="Tua nhanh sang bước kế tiếp để kiểm tra trải nghiệm"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Tua bước tiếp</span>
                </button>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: BẢN ĐỒ TOÀN CẢNH & KHUNG THÔNG BÁO TÁCH RIÊNG (100% KHÔNG BỊ CHE BẢN ĐỒ) */}
          <div className="ride-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. BẢN ĐỒ TOÀN CẢNH (HOÀN TOÀN TRỐNG TRẢI, RÕ RÀNG 100%) */}
            <div className="ride-map-wrapper" style={{ position: 'relative' }}>
              <div ref={mapContainerRef} className="leaflet-map-hero" />
              {mapPickingTarget && (
                <div className="map-picker-floating-banner">
                  <Compass className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>
                    Chấm trên bản đồ để chọn{' '}
                    <strong style={{ color: mapPickingTarget === 'PICKUP' ? '#34d399' : '#f87171' }}>
                      {mapPickingTarget === 'PICKUP' ? 'ĐIỂM ĐÓN KHÁCH' : 'ĐIỂM ĐẾN'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMapPickingTarget(null)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '99px',
                      padding: '2px 8px',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            {/* 2. KHUNG THÔNG BÁO TIẾN TRÌNH CHUYẾN ĐI (TÁCH BIỆT HOÀN TOÀN BÊN DƯỚI) */}
            {rideStage !== 'IDLE' && (
              <div className="hud-standalone-card">
                {/* TOP ROW: STATE BADGE + METRICS */}
                <div className="hud-top-row">
                  <div>
                    {rideStage === 'SEARCHING' && (
                      <span className="hud-state-tag searching" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Radar className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Giai đoạn 1: Đang quét tìm tài xế gần bạn nhất...</span>
                      </span>
                    )}
                    {rideStage === 'ARRIVING' && (
                      <span className="hud-state-tag arriving" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Bike className="w-4 h-4 text-amber-600" />
                        <span>Giai đoạn 2: Tài xế đang đến điểm đón (~{Math.max(1, 22 - approachStep)}s)</span>
                      </span>
                    )}
                    {rideStage === 'ARRIVED' && (
                      <span className="hud-state-tag arriving" style={{ background: '#ecfdf5', color: '#00b14f', borderColor: '#a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Giai đoạn 3: Tài xế đã đến điểm đón! Đưa mã OTP để lên xe</span>
                      </span>
                    )}
                    {rideStage === 'IN_PROGRESS' && (
                      <span className="hud-state-tag in-progress" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Route className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <span>Giai đoạn 4: Đang di chuyển đến điểm đến ({Math.round(((driverStepIndex + 1) / (routeInfo.polyline?.length || 42)) * 100)}%)</span>
                      </span>
                    )}
                    {rideStage === 'COMPLETED' && (
                      <span className="hud-state-tag completed" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Hoàn thành: Bạn đã đến nơi an toàn!</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {rideStage === 'IN_PROGRESS' && (
                      <span className="metric-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Tốc độ: <strong>{currentSpeedKmh} km/h</strong></span>
                      </span>
                    )}
                    <span className="metric-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Compass className="w-3.5 h-3.5 text-blue-500" />
                      <span>Hướng: <strong>{driverBearing}°</strong></span>
                    </span>
                  </div>
                </div>

                {/* PROGRESS BAR & LOADER FOR SEARCHING */}
                {rideStage === 'SEARCHING' && (
                  <>
                  {!isSimulationMode && (
                    <div style={{ margin: '8px 0', padding: '10px 14px', background: 'rgba(0, 177, 79, 0.08)', borderRadius: '12px', border: '1px solid rgba(0, 177, 79, 0.25)', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: '#00b14f', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00b14f', display: 'inline-block' }} />
                        <span>ĐANG KẾT NỐI TÀI XẾ THỰC TẾ TRỰC TUYẾN (LIVE MODE)</span>
                      </div>
                      <div style={{ color: themeMode === 'dark' ? '#cbd5e1' : '#475569', lineHeight: 1.4 }}>
                        Tín hiệu cuốc xe đã phát đi qua Event Bus. Mở thêm 1 tab đăng nhập vai trò <strong>Tài xế (HUD)</strong> để nhận cuốc thực tế, hoặc gạt sang <strong>Giả lập</strong> trên thanh tiêu đề để tự động ghép đôi tài xế mẫu.
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${searchProgress}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #00b14f)',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                      <div className="price-sub" style={{ marginTop: '4px' }}>
                        Đang quét 4 tài xế trong bán kính 1km xung quanh {(locationsList.find((l) => l.id === pickupId) || locationsList[0]).name.split(',')[0]}...
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader text="searching" />
                    </div>
                  </div>
                  </>
                )}

                {/* DRIVER INFO & ACTIONS (ARRIVING / ARRIVED / IN_PROGRESS) */}
                {(rideStage === 'ARRIVING' || rideStage === 'ARRIVED' || rideStage === 'IN_PROGRESS' || rideStage === 'COMPLETED') && (
                  <div className="driver-sheet-card">
                    <div className="driver-sheet-left">
                      <div className="driver-avatar-circle">
                        <User className="w-5 h-5 text-slate-700" />
                        <div className="driver-verified-check">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{assignedDriverInfo?.name || activeRide?.driver?.name || 'Trần Minh Tài'}</span>
                          <span style={{ fontSize: '0.76rem', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <img src={iconStar3D} alt="Rating" style={{ width: 14, height: 14, objectFit: 'contain' }} /> 4.98 (1.4k+)
                          </span>
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
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => handleSendAiChat(`Tài xế đang ở đâu rồi?`)}
                        title="Nhắn tin với tài xế"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.href);
                          alert('Đã sao chép liên kết lộ trình di chuyển!');
                        }}
                        title="Chia sẻ lộ trình chuyến đi"
                      >
                        <Share2 className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP BOX (WHEN ARRIVED OR ARRIVING) */}
                {(rideStage === 'ARRIVING' || rideStage === 'ARRIVED') && activeRide?.otp_code && (
                  <div className="otp-display-box">
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>MÃ OTP XÁC NHẬN LÊN XE</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
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
                        <div className="step-circle">{isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}</div>
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
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store className="w-5 h-5 text-emerald-600" />
                <span>Thực đơn & Quán ăn</span>
              </div>
              <span className="oop-tag">{restaurants.length} đối tác quán</span>
            </div>

            {/* Uiverse Category Filter Chips */}
            <div className="uiv-category-scroll">
              {FOOD_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`uiv-category-chip ${foodCategoryFilter === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    setFoodCategoryFilter(cat.id);
                    const filtered = cat.id === 'ALL' ? restaurants : restaurants.filter((r) => r.categoryCode === cat.id);
                    if (filtered.length > 0 && !filtered.find((r) => r.id === selectedRestaurant?.id)) {
                      setSelectedRestaurant(filtered[0]);
                    }
                  }}
                >
                  {cat.icon3d && <img src={cat.icon3d} alt={cat.label} style={{ width: 18, height: 18, objectFit: 'contain' }} />}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Restaurant Selector Chips */}
            <div className="toggle-row" style={{ marginTop: 0, marginBottom: '14px' }}>
              {(foodCategoryFilter === 'ALL'
                ? restaurants
                : restaurants.filter((r) => r.categoryCode === foodCategoryFilter)
              ).map((rest) => (
                <button
                  key={rest.id}
                  type="button"
                  className={`chip-toggle ${selectedRestaurant?.id === rest.id ? 'active' : ''}`}
                  onClick={() => setSelectedRestaurant(rest)}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{rest.name}</span>
                  <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {rest.rating}
                  </span>
                </button>
              ))}
            </div>

            {/* Uiverse Restaurant Banner */}
            {selectedRestaurant && (
              <div className="uiv-restaurant-banner">
                <div className="uiv-restaurant-banner-left">
                  <div className="uiv-restaurant-icon-circle">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                      {selectedRestaurant.name}
                    </div>
                    <div className="uiv-restaurant-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#d97706', fontWeight: 700 }}>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {selectedRestaurant.rating}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> ~{selectedRestaurant.prepTimeMinutes || 12} phút
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Navigation className="w-3.5 h-3.5 text-slate-400" /> {selectedRestaurant.distanceKm || 1.4} km
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!merchantOnline ? (
                    <span className="badge-soa" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
                      🔴 Tạm đóng cửa
                    </span>
                  ) : (
                    <span className="uiv-restaurant-badge">{selectedRestaurant.badge || 'Quán chất lượng ★'}</span>
                  )}
                </div>
              </div>
            )}

            {!merchantOnline && (
              <div className="info-box" style={{ background: '#fef2f2', borderColor: '#fca5a5', marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Power className="w-4 h-4 text-red-600" /> Quán hiện đang tạm ngưng nhận đơn mới
                </div>
                <div className="price-sub" style={{ marginTop: '2px' }}>
                  Chủ quán đang tạm tắt ứng dụng để chuẩn bị nguyên liệu. Bạn có thể quay lại sau ít phút hoặc chọn quán khác.
                </div>
              </div>
            )}

            {/* Uiverse Dish Cards with Custom Semantic SVG Icons */}
            {selectedRestaurant && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedRestaurant.menu.map((dish) => {
                  const { icon, bg, border } = renderDishIcon(dish.iconCode);
                  const itemInCart = cart.find((c) => c.id === dish.id);
                  const isDishAvailable = menuStockStatus[dish.id] !== false;

                  return (
                    <div
                      key={dish.id}
                      className="uiv-dish-card"
                      style={!isDishAvailable ? { opacity: 0.65, filter: 'grayscale(0.3)' } : {}}
                    >
                      <div className="uiv-dish-main">
                        <div className="uiv-dish-media-wrapper">
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="uiv-dish-photo-img"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fb = e.currentTarget.parentElement?.querySelector('.fallback-icon-box');
                                if (fb) fb.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`uiv-dish-icon-box ${dish.image ? 'fallback-icon-box' : ''}`}
                            style={{
                              background: bg,
                              borderColor: border,
                              display: dish.image ? 'none' : 'flex'
                            }}
                          >
                            {icon}
                          </div>
                        </div>
                        <div className="uiv-dish-info">
                          <div className="uiv-dish-title-row">
                            <span className="uiv-dish-title">{dish.name}</span>
                            {isDishAvailable ? (
                              renderDishBadge(dish.badge)
                            ) : (
                              <span
                                className="badge-soa"
                                style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5', fontSize: '0.72rem' }}
                              >
                                Hôm nay tạm hết
                              </span>
                            )}
                          </div>
                          {dish.desc && <div className="uiv-dish-desc">{dish.desc}</div>}
                          <div className="uiv-dish-meta-row">
                            {dish.calories && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#ea580c', fontWeight: 600 }}>
                                <Flame className="w-3 h-3" /> {dish.calories} kcal
                              </span>
                            )}
                            {dish.prepTime && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Clock className="w-3 h-3" /> {dish.prepTime} phút
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="uiv-dish-action">
                        <span className="uiv-dish-price">{dish.price.toLocaleString('vi-VN')} đ</span>
                        {isDishAvailable && merchantOnline ? (
                          <button
                            type="button"
                            className="uiv-dish-add-btn"
                            onClick={() => addToCart(dish)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm</span>
                            {itemInCart && <span className="uiv-count-pill">{itemInCart.quantity}</span>}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="uiv-dish-add-btn"
                            style={{
                              opacity: 0.6,
                              cursor: 'not-allowed',
                              background: '#f1f5f9',
                              borderColor: '#cbd5e1',
                              color: '#64748b'
                            }}
                            disabled
                            title={!merchantOnline ? 'Quán đang đóng cửa' : 'Món này đã hết hôm nay'}
                          >
                            <span>{!merchantOnline ? 'Đóng cửa' : 'Tạm hết'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" id="customer-cart-section">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={iconCart3D} alt="Cart" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                <span>Giỏ hàng của bạn</span>
              </div>
              <span className="oop-tag">{cart.length} món</span>
            </div>

            {cart.length === 0 ? (
              <div className="price-sub" style={{ padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <img src={iconCart3D} alt="Cart" style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.7 }} />
                <span style={{ fontWeight: 600, color: '#64748b' }}>Giỏ hàng đang trống. Hãy chọn món ăn từ thực đơn bên trái.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                {cart.map((item) => {
                  const { icon, bg, border } = renderDishIcon(item.iconCode);
                  return (
                    <div key={item.id} className="uiv-dish-card" style={{ padding: '10px 12px', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div className="cart-item-thumb-box">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="cart-item-photo"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fb = e.currentTarget.nextElementSibling;
                                if (fb) fb.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: bg,
                              borderColor: border,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              display: item.image ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {icon}
                          </div>
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div className="price-sub">
                            {item.price.toLocaleString('vi-VN')}đ / phần
                          </div>
                        </div>
                      </div>

                      <div className="uiv-stepper">
                        <button
                          type="button"
                          className="uiv-stepper-btn"
                          onClick={() => updateCartQty(item.id, -1)}
                          title="Giảm 1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="uiv-stepper-count">{item.quantity}</span>
                        <button
                          type="button"
                          className="uiv-stepper-btn"
                          onClick={() => updateCartQty(item.id, 1)}
                          title="Tăng 1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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

            {paymentMethod === 'WALLET' && walletBalance < foodFinalTotal && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '10px 14px', margin: '8px 0', color: '#b91c1c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Số dư ví không đủ ({Math.max(0, walletBalance).toLocaleString('vi-VN')} đ / {foodFinalTotal.toLocaleString('vi-VN')} đ). Hãy nạp thêm hoặc đổi sang Tiền mặt.</span>
              </div>
            )}

            <div style={{ position: 'relative', height: '54px', margin: '12px 0 8px', borderRadius: '14px', overflow: 'hidden' }}>
              <FlyingButton
                theme={themeMode}
                size="medium"
                altitude={25}
                hoverTime={1.5}
                jets={2}
                thrusters
                trigger="click"
                carryCursor={false}
                smoke={0.25}
                turbulence={0.5}
                wobble={0.5}
                ramp={false}
                thrustColor="#ff5722"
                smokeColor={themeMode === 'dark' ? "#333333" : "#fbe9e7"}
                onClick={handlePlaceFoodOrder}
              >
                🔥 Đặt món nóng ngay • {foodFinalTotal.toLocaleString('vi-VN')} đ
              </FlyingButton>
            </div>

            {activeFoodOrder && (
              <div className="info-box" style={{ marginTop: '14px' }}>
                {!isSimulationMode && activeFoodOrder.state !== 'DELIVERED' && (
                  <div style={{ marginBottom: '10px', padding: '10px 14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                      <span>ĐÃ GỬI ĐƠN SANG QUÁN ĂN THỰC TẾ (LIVE MODE)</span>
                    </div>
                    <div style={{ color: themeMode === 'dark' ? '#cbd5e1' : '#475569', lineHeight: 1.4 }}>
                      Chủ quán đang xem đơn trên bảng Kanban. Khi quán bấm "Nhận đơn", "Nấu món" hoặc "Giao hàng", trạng thái đơn của bạn sẽ cập nhật theo thời gian thực!
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Đơn hàng: {activeFoodOrder.order_id}</strong>
                    <div className="price-sub">Tài xế giao: {activeFoodOrder.shipper?.name || 'Nguyễn Văn Minh'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {activeFoodOrder.state !== 'DELIVERED' && (
                      <Loader text="cooking" />
                    )}
                    <span className="oop-tag">
                      {activeFoodOrder.state === 'DELIVERED' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#00b14f' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã giao xong
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                          <Bike className="w-3.5 h-3.5 animate-bounce" /> Đang giao hàng
                        </span>
                      )}
                    </span>
                  </div>
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

      {/* MOBILE FLOATING CART BAR (FOOD ORDERING) */}
      {activeTab === 'FOOD' && cart.length > 0 && (
        <div
          className="mobile-floating-cart-bar"
          onClick={() => {
            const el = document.getElementById('customer-cart-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="mobile-cart-badge">
              <img src={iconCart3D} alt="Cart" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span className="mobile-cart-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.94rem' }}>
                {foodFinalTotal.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>
                {cart.length} món ăn • Nhấn để xem giỏ & thanh toán
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontWeight: 700, fontSize: '0.86rem' }}>
            <span>Thanh toán</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      )}

      {/* MÀN HÌNH TÀI XẾ: GRABDRIVER OPERATING PORTAL */}
      {activeTab === 'PARTNER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. MASTER STATUS & DISPATCH CONTROLS */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: driverOnline ? '#ecfdf5' : '#f1f5f9',
                    border: `2px solid ${driverOnline ? '#10b981' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Bike className={`w-7 h-7 ${driverOnline ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      {currentUser.name}
                    </h2>
                    <span className="badge-soa" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                      GrabDriver Pro ★
                    </span>
                  </div>
                  <div className="price-sub" style={{ marginTop: '2px' }}>
                    {currentUser.vehicle || 'Honda SH 150i ABS (59-X3 888.99)'} • CCCD: {currentUser.cccd || '079201009876'}
                  </div>
                </div>
              </div>

              {/* ONLINE / OFFLINE TOGGLE & SOUND */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDriverSoundEnabled(!driverSoundEnabled)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Bật/Tắt âm thanh chuông báo"
                >
                  <Volume2 className={`w-4 h-4 ${driverSoundEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Chuông: {driverSoundEnabled ? 'Bật' : 'Tắt'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: driverOnline ? '#00b14f' : '#ef4444' }}>
                      {driverOnline ? 'ĐANG TRỰC TUYẾN' : 'ĐANG TẠM NGHỈ'}
                    </div>
                    <div className="price-sub" style={{ fontSize: '0.72rem' }}>
                      {driverOnline ? 'Sẵn sàng nhận cuốc trong 3km' : 'Tạm dừng nhận chuyến'}
                    </div>
                  </div>
                  <MotionSwitch
                    isOn={driverOnline}
                    onToggle={() => {
                      const next = !driverOnline;
                      setDriverOnline(next);
                      if (next && driverSoundEnabled) {
                        playSoundChime('DRIVER');
                      }
                    }}
                    activeColor="#00b14f"
                    inactiveColor="#94a3b8"
                    leftIcon={<Power className="w-4 h-4 text-slate-500" />}
                    rightIcon={<Zap className="w-4 h-4 text-emerald-600" />}
                    title="Gạt công tắc để Bật / Tắt trạng thái nhận cuốc"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div className="price-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio className={`w-4 h-4 ${driverOnline ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                <span>
                  {driverOnline
                    ? 'Tổng đài điều phối đang kết nối GPS. Sẵn sàng nhận cuốc trong bán kính 3km.'
                    : 'Bạn đang tắt nhận chuyến. Khách hàng sẽ không thể ghép nối với bạn.'}
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSimulateIncomingRide}
                style={{ fontSize: '0.82rem', padding: '5px 12px', color: '#1d4ed8' }}
              >
                🧪 Thử nghiệm cuốc xe mới (Phát chuông Ting!)
              </button>
            </div>
          </div>

          {/* 2. DRIVER EARNINGS HUD */}
          <div className="grid-4" style={{ gap: '12px' }}>
            <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderColor: '#bbf7d0' }}>
              <div className="price-sub" style={{ color: '#166534', fontWeight: 600 }}>Thu nhập hôm nay</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
                {driverTodayIncome.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#166534' }}>+12% so với hôm qua</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div className="price-sub">Số cuốc hoàn thành</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {driverCompletedRidesCount} chuyến
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mục tiêu ngày: 8 chuyến</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div className="price-sub">Đánh giá sao</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> 4.96 ★
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>128 lượt đánh giá 5★</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div className="price-sub">Tỷ lệ nhận cuốc</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
                98.5%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tỷ lệ hủy: 0.5% (Tối ưu)</div>
            </div>
          </div>

          {/* DRIVER LIVE NAVIGATION MAP (GRABDRIVER HUD) */}
          <div className="card" style={{ padding: '18px' }}>
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass className="w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Bản đồ Điều hướng GPS Trực tuyến (GrabDriver Live HUD)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="badge-soa"
                  style={{
                    background: driverOnline ? '#ecfdf5' : '#f1f5f9',
                    color: driverOnline ? '#047857' : '#64748b',
                    borderColor: driverOnline ? '#a7f3d0' : '#cbd5e1'
                  }}
                >
                  {driverOnline ? '🟢 GPS: Tín hiệu mạnh (±3m)' : '🔴 GPS: Tạm dừng'}
                </span>
                <span className="oop-tag" style={{ color: '#2563eb' }}>
                  🧭 {driverBearing}° | ⚡ {currentSpeedKmh || 0} km/h
                </span>
              </div>
            </div>

            {/* Map Canvas */}
            <div
              style={{
                height: '360px',
                width: '100%',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                position: 'relative'
              }}
            >
              <div ref={driverMapContainerRef} style={{ height: '100%', width: '100%' }} />
            </div>

            <div
              style={{
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.8rem',
                color: '#64748b'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radar className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {activeRide
                    ? `Đang điều hướng theo lộ trình: ${activeRide.pickupName || 'Điểm đón'} &rarr; ${activeRide.dropoffName || 'Điểm trả'}`
                    : driverOnline
                    ? 'Vùng xanh: Bán kính trực tuyến 1.2km quanh xe. Các điểm 🔥 là khu vực tập trung nhu cầu cao.'
                    : 'Bản đồ đang ở trạng thái nghỉ. Bật Trực tuyến để bắt đầu quét khách.'}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                Phương tiện: {currentUser.vehicle || 'Honda SH 150i (59-X3 888.99)'}
              </div>
            </div>
          </div>

          {/* 3. INCOMING RIDE OFFER CARD (15s COUNTDOWN ALERT) */}
          {incomingRideOffer && (
            <div
              className="card"
              style={{
                border: '2px solid #3b82f6',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell className="w-5 h-5 text-blue-600 animate-bounce" />
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a8a' }}>
                    🚨 CUỐC XE MỚI ĐẾN TỔNG ĐÀI!
                  </span>
                </div>
                <div
                  style={{
                    background: '#1d4ed8',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '99px',
                    fontSize: '0.85rem'
                  }}
                >
                  Tự động hủy sau {offerCountdown}s
                </div>
              </div>

              {/* Countdown Progress Bar */}
              <div style={{ height: '6px', background: '#bfdbfe', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(offerCountdown / 15) * 100}%`,
                    background: '#2563eb',
                    transition: 'width 1s linear'
                  }}
                />
              </div>

              <div className="grid-2" style={{ gap: '14px', marginBottom: '16px' }}>
                <div>
                  <div className="price-sub" style={{ color: '#1e40af' }}>Lộ trình di chuyển</div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0f172a', marginTop: '2px' }}>
                    📍 {incomingRideOffer.pickupName}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0f172a', marginTop: '2px' }}>
                    🏁 {incomingRideOffer.dropoffName}
                  </div>
                  <div className="price-sub" style={{ marginTop: '4px' }}>
                    Khoảng cách: ~{incomingRideOffer.distanceKm} km • Khách hàng: {incomingRideOffer.customerName} ({incomingRideOffer.customerPhone})
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="price-sub" style={{ color: '#1e40af' }}>Thu nhập tài xế thực nhận (80%)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00b14f' }}>
                    {incomingRideOffer.fare.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="price-sub">
                    Giá khách trả: {incomingRideOffer.customerFare?.toLocaleString('vi-VN')} đ (Thanh toán: Ví RideEatPay)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAcceptRideOffer}
                  style={{
                    flex: 2,
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    background: '#00b14f',
                    borderColor: '#00b14f'
                  }}
                >
                  <Check className="w-5 h-5" /> CHẤP NHẬN CUỐC ({offerCountdown}s)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDeclineRideOffer}
                  style={{ flex: 1, padding: '12px', fontWeight: 600, color: '#dc2626' }}
                >
                  Bỏ qua cuốc
                </button>
              </div>
            </div>
          )}

          {/* 4. ACTIVE TRIP LIFECYCLE (ARRIVING -> ARRIVED -> IN_PROGRESS -> COMPLETED) */}
          {activeRide ? (
            <div className="card" style={{ padding: '20px', border: '1px solid #10b981' }}>
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bike className="w-5 h-5 text-emerald-600" />
                    <span>Cuốc xe đang thực hiện: #{activeRide.ride_id}</span>
                  </div>
                  <div className="price-sub" style={{ marginTop: '2px' }}>
                    Khách hàng: <strong>{activeRide.customerName || 'Nguyễn Văn A'}</strong> ({activeRide.customerPhone || '0901***888'})
                  </div>
                </div>
                <span
                  className="badge-soa"
                  style={{
                    background:
                      activeRide.state === 'COMPLETED'
                        ? '#dcfce7'
                        : activeRide.state === 'IN_PROGRESS'
                        ? '#eff6ff'
                        : '#fef3c7',
                    color:
                      activeRide.state === 'COMPLETED'
                        ? '#15803d'
                        : activeRide.state === 'IN_PROGRESS'
                        ? '#1d4ed8'
                        : '#b45309'
                  }}
                >
                  {activeRide.state === 'ARRIVING'
                    ? 'Đang tới điểm đón'
                    : activeRide.state === 'ARRIVED'
                    ? 'Đã tới nơi đón'
                    : activeRide.state === 'IN_PROGRESS'
                    ? 'Đang chở khách'
                    : 'Hoàn thành'}
                </span>
              </div>

              <div className="grid-2" style={{ gap: '14px', marginBottom: '16px' }}>
                <div className="info-box" style={{ background: '#f8fafc' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>ĐIỂM ĐÓN KHÁCH</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>📍 {activeRide.pickupName || 'Chợ Bến Thành, Quận 1'}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748b', marginTop: '10px' }}>ĐIỂM ĐẾN TRẢ KHÁCH</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>🏁 {activeRide.dropoffName || 'Vinhomes Landmark 81, Bình Thạnh'}</div>
                </div>

                <div className="info-box" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="price-sub">Thu nhập chuyến xe</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00b14f' }}>
                        {activeRide.fare?.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="price-sub">Mã OTP của khách</div>
                      <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '2px' }}>
                        {activeRide.otp_code || '8899'}
                      </div>
                    </div>
                  </div>

                  {activeRide.state === 'ARRIVED' && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #a7f3d0' }}>
                      <label className="form-label" style={{ color: '#065f46' }}>
                        Nhập mã OTP 4 số từ khách để khởi hành:
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input mono"
                          placeholder="Nhập 4 số OTP..."
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ width: '140px' }}
                          onClick={handleDriverAdvanceTrip}
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  )}

                  {otpVerifyMessage && (
                    <div style={{ marginTop: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#059669' }}>
                      {otpVerifyMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTON TO ADVANCE STAGE */}
              <div>
                {activeRide.state === 'ARRIVING' && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={handleDriverAdvanceTrip}
                  >
                    📍 Đã đến điểm đón khách (Báo cho khách hàng)
                  </button>
                )}
                {activeRide.state === 'ARRIVED' && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', background: '#2563eb', borderColor: '#2563eb' }}
                    onClick={handleDriverAdvanceTrip}
                  >
                    🚀 Khách đã lên xe &rarr; Bắt đầu chuyến đi
                  </button>
                )}
                {activeRide.state === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', background: '#00b14f', borderColor: '#00b14f' }}
                    onClick={handleDriverAdvanceTrip}
                  >
                    🏁 Đã tới nơi & Hoàn thành chuyến xe (+{activeRide.fare?.toLocaleString('vi-VN')}đ)
                  </button>
                )}
                {activeRide.state === 'COMPLETED' && (
                  <div style={{ textAlign: 'center', padding: '10px', color: '#00b14f', fontWeight: 700 }}>
                    ✓ Chuyến xe đã hoàn tất! Tiền đã cộng vào ví của bạn.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <Compass className="w-10 h-10 text-slate-300" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: '#334155' }}>
                {driverOnline
                  ? 'Đang trực tuyến chờ cuốc xe mới từ khách hàng...'
                  : 'Bạn đang ở chế độ Tạm nghỉ. Bật trực tuyến phía trên để nhận cuốc xe.'}
              </div>
              <div className="price-sub" style={{ marginTop: '4px' }}>
                Khi khách hàng đặt xe, màn hình sẽ rung chuông và hiển thị thông báo tiếp nhận 15 giây.
              </div>
            </div>
          )}
        </div>
      )}

      {/* MÀN HÌNH CHỦ QUÁN: GRABMERCHANT OPERATING PORTAL */}
      {activeTab === 'MERCHANT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. MASTER RESTAURANT CONTROL BAR */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: merchantOnline ? '#fffbeb' : '#f1f5f9',
                    border: `2px solid ${merchantOnline ? '#f59e0b' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Store className={`w-7 h-7 ${merchantOnline ? 'text-amber-600' : 'text-slate-400'}`} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      {currentUser.name}
                    </h2>
                    <span className="badge-soa" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                      GrabMerchant Official ★
                    </span>
                  </div>
                  <div className="price-sub" style={{ marginTop: '2px' }}>
                    📍 {currentUser.address || selectedRestaurant?.address || '120 Nguyễn Thị Minh Khai, Quận 1, TP.HCM'}
                  </div>
                  <div className="price-sub" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    💳 Quyết toán: {currentUser.bankInfo || 'Vietcombank - 0071009988776 (NGUYEN VAN CHU QUAN)'}
                  </div>
                </div>
              </div>

              {/* MASTER STORE TOGGLE & SOUND */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMerchantSoundEnabled(!merchantSoundEnabled)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Bật/Tắt chuông báo đơn mới"
                >
                  <Volume2 className={`w-4 h-4 ${merchantSoundEnabled ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>Chuông: {merchantSoundEnabled ? 'Bật' : 'Tắt'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: merchantOnline ? '#00b14f' : '#dc2626' }}>
                      {merchantOnline ? 'QUÁN ĐANG MỞ CỬA' : 'QUÁN TẠM ĐÓNG CỬA'}
                    </div>
                    <div className="price-sub" style={{ fontSize: '0.72rem' }}>
                      {merchantOnline ? 'Sẵn sàng phục vụ khách' : 'Tạm ngưng nhận món'}
                    </div>
                  </div>
                  <MotionSwitch
                    isOn={merchantOnline}
                    onToggle={() => {
                      const next = !merchantOnline;
                      setMerchantOnline(next);
                      if (next && merchantSoundEnabled) {
                        playSoundChime('MERCHANT');
                      }
                    }}
                    activeColor="#00b14f"
                    inactiveColor="#94a3b8"
                    leftIcon={<Power className="w-4 h-4 text-slate-500" />}
                    rightIcon={<Store className="w-4 h-4 text-emerald-600" />}
                    title="Gạt công tắc để Mở / Đóng cửa quán ăn"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div className="price-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {merchantOnline
                    ? 'Quán đang mở cửa nhận đơn hàng GrabFood. Thực đơn đang sẵn sàng phục vụ thực khách.'
                    : 'Quán đang tạm ngưng nhận đơn mới. Khách hàng trên ứng dụng sẽ thấy quán đang đóng cửa.'}
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSimulateMerchantOrder}
                style={{ fontSize: '0.82rem', padding: '5px 12px', color: '#b45309' }}
              >
                🧪 Mô phỏng đơn hàng mới (Kêu chuông Ting Ting!)
              </button>
            </div>
          </div>

          {/* 2. MERCHANT FINANCIAL & ORDER METRICS */}
          <div className="grid-4" style={{ gap: '12px' }}>
            <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', borderColor: '#fde047' }}>
              <div className="price-sub" style={{ color: '#854d0e', fontWeight: 600 }}>Doanh thu hôm nay</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a16207', margin: '4px 0' }}>
                {merchantTodayRevenue.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#854d0e' }}>Đã đối soát & sẵn sàng rút</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div className="price-sub">Số đơn đã giao</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {merchantCompletedOrdersCount} đơn
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tỷ lệ hoàn thành: 100%</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div className="price-sub">Đánh giá quán</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> 5.0 ★
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Huy hiệu Quán Ưa Thích</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div className="price-sub">Thời gian chuẩn bị</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', margin: '4px 0' }}>
                12 phút
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Bếp phản hồi nhanh chóng</div>
            </div>
          </div>

          {/* 3. ORDER KANBAN & IN-STOCK MENU MANAGEMENT */}
          <div className="grid-2" style={{ gap: '16px' }}>
            {/* CỘT TRÁI: QUẢN LÝ ĐƠN HÀNG (KANBAN) */}
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                  <span>Đơn đặt món GrabFood ({merchantOrders.length})</span>
                </div>
                <span className="badge-soa">Thời gian thực</span>
              </div>

              {/* Mobile / Responsive Filter Chips */}
              <div className="uiv-category-scroll" style={{ marginBottom: '12px', marginTop: '0' }}>
                {[
                  { key: 'ALL', label: `Tất cả (${merchantOrders.length})` },
                  { key: 'CONFIRMED', label: `Đơn mới (${merchantOrders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PENDING').length})` },
                  { key: 'PREPARING', label: `Bếp nấu (${merchantOrders.filter((o) => o.status === 'PREPARING').length})` },
                  { key: 'READY', label: `Chờ shipper (${merchantOrders.filter((o) => o.status === 'READY' || o.status === 'READY_FOR_PICKUP').length})` },
                  { key: 'DELIVERED', label: `Đã giao (${merchantOrders.filter((o) => o.status === 'DELIVERED').length})` }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`uiv-category-chip ${merchantFilterStatus === f.key ? 'active' : ''}`}
                    onClick={() => setMerchantFilterStatus(f.key)}
                  >
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              {(() => {
                const displayedOrders = merchantOrders.filter((o) => {
                  if (merchantFilterStatus === 'ALL') return true;
                  if (merchantFilterStatus === 'CONFIRMED') return o.status === 'CONFIRMED' || o.status === 'PENDING';
                  if (merchantFilterStatus === 'READY') return o.status === 'READY' || o.status === 'READY_FOR_PICKUP';
                  return o.status === merchantFilterStatus;
                });

                if (displayedOrders.length === 0) {
                  return (
                    <div className="price-sub" style={{ padding: '28px', textAlign: 'center' }}>
                      Không có đơn hàng nào trong trạng thái này.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {displayedOrders.map((ord) => {
                      const isConfirmed = ord.status === 'CONFIRMED' || ord.status === 'PENDING';
                      const isPreparing = ord.status === 'PREPARING';
                      const isReady = ord.status === 'READY' || ord.status === 'READY_FOR_PICKUP';
                      const isDelivered = ord.status === 'DELIVERED';

                      return (
                        <div
                          key={ord.orderId}
                          style={{
                            background: isDelivered ? '#f8fafc' : '#ffffff',
                            border: `1px solid ${isConfirmed ? '#f59e0b' : isPreparing ? '#3b82f6' : isReady ? '#10b981' : '#e2e8f0'}`,
                            borderRadius: '12px',
                            padding: '14px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a' }}>
                                #{ord.orderId}
                              </span>
                              <span className="price-sub" style={{ marginLeft: '8px' }}>
                                ({ord.orderTime || 'Vừa xong'})
                              </span>
                            </div>
                            <span
                              className="badge-soa"
                              style={{
                                background: isConfirmed ? '#fef3c7' : isPreparing ? '#eff6ff' : isReady ? '#ecfdf5' : '#f1f5f9',
                                color: isConfirmed ? '#b45309' : isPreparing ? '#1d4ed8' : isReady ? '#047857' : '#64748b',
                                borderColor: isConfirmed ? '#fde68a' : isPreparing ? '#bfdbfe' : isReady ? '#a7f3d0' : '#cbd5e1'
                              }}
                            >
                              {isConfirmed ? '🔔 Đơn mới cần nhận' : isPreparing ? '🍳 Bếp đang nấu' : isReady ? '🛵 Chờ shipper lấy' : '✓ Đã hoàn thành'}
                            </span>
                          </div>

                          <div className="price-sub" style={{ marginBottom: '6px' }}>
                            Khách hàng: <strong>{ord.customerName}</strong> ({ord.customerPhone})
                          </div>

                          {/* Items list */}
                          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', marginBottom: '10px' }}>
                            {ord.items.map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0' }}>
                                <span>
                                  {it.qty}x {it.name}
                                </span>
                                <span style={{ fontWeight: 600 }}>{(it.price * it.qty).toLocaleString('vi-VN')} đ</span>
                              </div>
                            ))}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                              <span>Tổng đơn thu khách:</span>
                              <span style={{ color: '#00b14f' }}>{ord.total.toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>

                          {/* Shipper & Pickup Pin */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', marginBottom: '10px' }}>
                            <span>
                              Shipper: <strong>{ord.shipper?.name || 'Trần Minh Tài'}</strong> ({ord.shipper?.plate || '59-X3 888.99'})
                            </span>
                            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>
                              Mã PIN lấy món: {ord.pickupPin || '5812'}
                            </span>
                          </div>

                          {/* Kanban Action Buttons */}
                          <div>
                            {isConfirmed && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ width: '100%', padding: '8px', background: '#f59e0b', borderColor: '#f59e0b' }}
                                onClick={() => handleUpdateOrderStatus(ord.orderId, 'PREPARING')}
                              >
                                🍳 Nhận đơn & Báo bếp nấu món
                              </button>
                            )}
                            {isPreparing && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ width: '100%', padding: '8px', background: '#3b82f6', borderColor: '#3b82f6' }}
                                onClick={() => handleUpdateOrderStatus(ord.orderId, 'READY')}
                              >
                                🍽️ Món đã nấu xong &rarr; Gọi Shipper vào lấy
                              </button>
                            )}
                            {isReady && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ width: '100%', padding: '8px', background: '#00b14f', borderColor: '#00b14f' }}
                                onClick={() => handleUpdateOrderStatus(ord.orderId, 'DELIVERED')}
                              >
                                📦 Đã bàn giao cho Shipper &rarr; Hoàn tất đơn
                              </button>
                            )}
                            {isDelivered && (
                              <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                                ✓ Đơn hàng đã giao thành công và tiền đã cộng vào ví quán.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* CỘT PHẢI: QUẢN LÝ THỰC ĐƠN & BẬT/TẮT TÌNH TRẠNG CÒN MÓN */}
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Utensils className="w-5 h-5 text-emerald-600" />
                  <span>Quản lý thực đơn ({selectedRestaurant?.menu?.length || 0} món)</span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '6px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: 'auto',
                    background: '#00b14f',
                    borderColor: '#00b14f'
                  }}
                  onClick={() => setShowAddDishModal(true)}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Thêm món mới</span>
                </button>
              </div>
              <div className="price-sub" style={{ marginBottom: '14px' }}>
                Bật/Tắt trạng thái từng món ăn. Khi gạt sang "Tạm hết hôm nay", khách hàng sẽ không thể đặt món đó.
              </div>

              {selectedRestaurant && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedRestaurant.menu.map((dish) => {
                    const isAvailable = menuStockStatus[dish.id] !== false;

                    return (
                      <div
                        key={dish.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          background: isAvailable ? 'var(--bg-card)' : 'var(--bg-subtle)',
                          opacity: isAvailable ? 1 : 0.75
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {dish.name}
                            </div>
                            <div className="price-sub" style={{ marginTop: '2px' }}>
                              Giá bán: <strong>{dish.price.toLocaleString('vi-VN')} đ</strong> • Chuẩn bị: {dish.prepTime || 12}p
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            className="badge-soa"
                            style={{
                              background: isAvailable ? '#ecfdf5' : '#fee2e2',
                              color: isAvailable ? '#047857' : '#b91c1c',
                              borderColor: isAvailable ? '#a7f3d0' : '#fca5a5',
                              fontSize: '0.75rem'
                            }}
                          >
                            {isAvailable ? '🟢 Còn món' : '🔴 Tạm hết hôm nay'}
                          </span>

                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleToggleDishStock(dish.id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: isAvailable ? '#fee2e2' : '#ecfdf5',
                              color: isAvailable ? '#b91c1c' : '#047857',
                              borderColor: isAvailable ? '#fca5a5' : '#a7f3d0'
                            }}
                          >
                            {isAvailable ? 'Đánh dấu Hết món' : 'Mở bán lại'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

            <div className="form-label">Nạp tiền nhanh & Cân đối ví</div>
            <div className="toggle-row">
              <button className="btn-secondary" onClick={() => handleTopUpWallet(100000)}>+ 100.000 đ</button>
              <button className="btn-secondary" onClick={() => handleTopUpWallet(200000)}>+ 200.000 đ</button>
              <button className="btn-secondary" onClick={() => handleTopUpWallet(500000)}>+ 500.000 đ</button>
              <button className="btn-secondary" onClick={() => setWalletBalance(500000)} style={{ color: '#00b14f', fontWeight: 700 }} title="Đặt lại số dư ví mẫu ban đầu">🔄 Khôi phục 500k</button>
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
                      style={{ padding: '5px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      onClick={() => handleViewInvoice(tx)}
                    >
                      <Receipt className="w-3.5 h-3.5 text-blue-600" />
                      <span>Hóa đơn VAT</span>
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
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={iconCrown3D} alt="VIP" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TicketPercent className="w-4 h-4 text-emerald-600" />
                      <span className="badge-soa" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{v.code}</span>
                      <span style={{ fontWeight: 600 }}>{v.title}</span>
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
              <div style={{ margin: '8px 0 14px' }}>
                <StarRating
                  value={ratingStars}
                  onChange={setRatingStars}
                  name="service-tab-rating"
                  size="2.2rem"
                />
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
              <Star className="w-4 h-4 fill-white" />
              <span>Gửi đánh giá & Nhận 5 điểm thưởng</span>
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
                    <span style={{ color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rev.stars}.0
                    </span>
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
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Server className="w-4 h-4 text-purple-600" />
                    <span>{svc.name}</span>
                  </div>
                  <span className="oop-tag">:{svc.port}</span>
                </div>
                <div className="price-sub">{svc.boundedContext}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>Nhật ký hoạt động hệ thống</span>
              </div>
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
        <img src={iconAi3D} alt="AI" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        <span>{aiOpen ? 'Đóng Trợ lý AI' : 'Trợ lý AI RideEat'}</span>
      </button>

      {aiOpen && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Trợ lý AI</span>
              <button
                type="button"
                onClick={() => setShowAiKeyModal(true)}
                style={{
                  background: aiKey ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                  border: `1px solid ${aiKey ? '#34d399' : '#fbbf24'}`,
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                title="Cài đặt khóa Gemini API"
              >
                <KeyRound className="w-3 h-3 text-emerald-300" />
                <span>{aiKey ? 'Gemini Flash ✓' : 'Cài Key'}</span>
              </button>
            </div>
            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setAiOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="ai-chat-messages">
            {showAiKeyModal && (
              <div className="ai-key-modal-overlay">
                <div className="ai-key-modal-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      <span>Cài đặt Gemini API Key</span>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      onClick={() => setShowAiKeyModal(false)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="price-sub" style={{ margin: 0, fontSize: '0.75rem' }}>
                    Sử dụng mô hình <strong>gemini-3.5-flash</strong> từ Google AI Studio (Free Tier) để xử lý hội thoại theo thời gian thực.
                  </p>

                  <input
                    type="password"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '8px 10px' }}
                    placeholder="Dán API Key (AIzaSy...)..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                  />

                  {keyTestMsg && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: keyTestStatus === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
                        color: keyTestStatus === 'SUCCESS' ? '#059669' : '#dc2626',
                        border: `1px solid ${keyTestStatus === 'SUCCESS' ? '#a7f3d0' : '#fecaca'}`
                      }}
                    >
                      {keyTestMsg}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.76rem' }}
                      onClick={handleTestAiKey}
                      disabled={keyTestStatus === 'TESTING'}
                    >
                      {keyTestStatus === 'TESTING' ? 'Đang test...' : 'Kiểm tra Key'}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.76rem' }}
                      onClick={handleSaveAiKey}
                    >
                      Lưu Key
                    </button>
                  </div>
                </div>
              </div>
            )}

            {aiMessages.map((m, idx) => {
              const text = m.text || '';
              const showPhoBtn = m.role === 'bot' && text.includes('Phở Thìn');
              const showComBtn = m.role === 'bot' && (text.includes('Cơm Tấm') || text.includes('Ba Ghiền'));
              const showBunBtn = m.role === 'bot' && (text.includes('Bún Bò') || text.includes('Đông Ba'));
              const showKatinatBtn = m.role === 'bot' && (text.includes('Katinat') || text.includes('Trà Sữa'));
              const showBurgerBtn = m.role === 'bot' && (text.includes('Crispy Bro') || text.includes('Burger') || text.includes('Gà Rán'));
              const showGreenBtn = m.role === 'bot' && (text.includes('Green Bowl') || text.includes('Salad') || text.includes('Detox'));
              const showBikeBtn = m.role === 'bot' && (text.includes('Xe máy') || text.includes('RideBike'));
              const showCarBtn = m.role === 'bot' && (text.includes('Ô tô') || text.includes('RideCar'));

              return (
                <div key={idx} className={`ai-msg ${m.role}`}>
                  <div>{text}</div>
                  {m.role === 'bot' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '4px' }}>
                      {showPhoBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('FOOD');
                            setFoodCategoryFilter('NOODLE');
                          }}
                        >
                          <Soup className="w-3 h-3" />
                          <span>Xem Phở Thìn</span>
                        </button>
                      )}
                      {showComBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('FOOD');
                            setFoodCategoryFilter('RICE');
                          }}
                        >
                          <Beef className="w-3 h-3" />
                          <span>Xem Cơm Ba Ghiền</span>
                        </button>
                      )}
                      {showBunBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('FOOD');
                            setFoodCategoryFilter('CENTRAL');
                          }}
                        >
                          <CookingPot className="w-3 h-3" />
                          <span>Xem Bún Bò Huế</span>
                        </button>
                      )}
                      {showKatinatBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('FOOD');
                            setFoodCategoryFilter('DRINK');
                          }}
                        >
                          <Coffee className="w-3 h-3" />
                          <span>Xem Katinat</span>
                        </button>
                      )}
                      {showBurgerBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('FOOD');
                            setFoodCategoryFilter('FASTFOOD');
                          }}
                        >
                          <Sandwich className="w-3 h-3" />
                          <span>Xem Burger Crispy</span>
                        </button>
                      )}
                      {showGreenBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('FOOD');
                            setFoodCategoryFilter('HEALTHY');
                          }}
                        >
                          <Salad className="w-3 h-3" />
                          <span>Xem Green Bowl</span>
                        </button>
                      )}
                      {showBikeBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('RIDE');
                            setSelectedVehicleCode('BIKE');
                          }}
                        >
                          <Bike className="w-3 h-3" />
                          <span>Chọn Xe máy</span>
                        </button>
                      )}
                      {showCarBtn && (
                        <button
                          type="button"
                          className="ai-action-chip"
                          onClick={() => {
                            setActiveTab('RIDE');
                            setSelectedVehicleCode('CAR');
                          }}
                        >
                          <Car className="w-3 h-3" />
                          <span>Chọn Ô tô 4 chỗ</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {aiLoading && (
              <div className="ai-msg bot" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bot className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span>Trợ lý Gemini đang soạn câu trả lời...</span>
                </div>
                <div style={{ padding: '2px 0 4px 6px' }}>
                  <Loader text="thinking" />
                </div>
              </div>
            )}
          </div>

          <div className="ai-chat-footer">
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                type="button"
                className="chip-toggle"
                onClick={() => handleSendAiChat('Tư vấn giá xe cho lộ trình hiện tại')}
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hỏi giá xe</span>
              </button>
              <button
                type="button"
                className="chip-toggle"
                onClick={() => handleSendAiChat('Gợi ý cho mình các món ăn ngon đang bán chạy?')}
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                <span>Gợi ý món ăn</span>
              </button>
              <button
                type="button"
                className="chip-toggle"
                onClick={() => handleSendAiChat('Hôm nay mình muốn ăn món Eat Clean giảm cân thanh đạm?')}
              >
                <Salad className="w-3.5 h-3.5 text-emerald-600" />
                <span>Món Healthy</span>
              </button>
              <button
                type="button"
                className="chip-toggle"
                onClick={() => handleSendAiChat('Hôm nay có những mã voucher giảm giá nào?')}
              >
                <TicketPercent className="w-3.5 h-3.5 text-blue-600" />
                <span>Mã giảm giá</span>
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
                style={{ width: '84px' }}
                onClick={() => handleSendAiChat()}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi</span>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PartyPopper className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Chuyến đi đã hoàn thành!</h3>
              <p className="price-sub" style={{ marginTop: '2px' }}>
                Bạn cảm thấy chuyến đi với tài xế <strong>{assignedDriverInfo?.name || 'Trần Minh Tài'}</strong> thế nào?
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
              <StarRating
                value={ratingStars}
                onChange={setRatingStars}
                name="trip-completed-rating"
                size="2.4rem"
              />
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
                  <Plus className="w-3 h-3 text-emerald-600" /> {tag}
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
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                <span>Xem hóa đơn VAT</span>
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
                <span>Gửi (+5.000đ vào ví)</span>
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
                <Printer className="w-4 h-4 text-slate-700" />
                <span>In hóa đơn</span>
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

      {/* MODAL THÊM MÓN ĂN MỚI CHO QUÁN (GRABMERCHANT DISH CREATOR) */}
      {showAddDishModal && (
        <div className="modal-backdrop" onClick={() => setShowAddDishModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CookingPot className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Thêm món ăn mới vào thực đơn</h3>
                  <p className="price-sub" style={{ margin: 0, fontSize: '0.78rem' }}>
                    Quán: <strong>{selectedRestaurant?.name || 'Gian hàng ẩm thực'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowAddDishModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewDish}>
              <div className="form-group">
                <label className="form-label">Tên món ăn <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Cơm Tấm Sườn Cọng Nướng Muối Ớt..."
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2" style={{ gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Đơn giá bán (VNĐ) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="75000"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    min="1000"
                    step="1000"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Biểu tượng món (Icon)</label>
                  <select
                    className="form-select"
                    value={newDishIconCode}
                    onChange={(e) => setNewDishIconCode(e.target.value)}
                  >
                    <option value="cooking-pot">🍲 Món nấu / Cơm đặc sản (Cooking Pot)</option>
                    <option value="soup">🍜 Phở / Món nước / Hủ tiếu (Soup)</option>
                    <option value="drumstick">🍗 Gà rán / Gà nướng (Drumstick)</option>
                    <option value="beef">🥩 Bò bít tết / Bò tái lăn (Beef)</option>
                    <option value="fish">🐟 Cá / Hải sản tươi (Fish)</option>
                    <option value="sandwich">🥪 Bánh mì / Burger (Sandwich)</option>
                    <option value="salad">🥗 Salad healthy / Món chay (Salad)</option>
                    <option value="coffee">☕ Cà phê / Thức uống đậm đà (Coffee)</option>
                    <option value="cup-soda">🥤 Trà sữa / Nước giải khát (Soda)</option>
                  </select>
                </div>
              </div>

              <div className="grid-3" style={{ gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Chuẩn bị (phút)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newDishPrepTime}
                    onChange={(e) => setNewDishPrepTime(e.target.value)}
                    min="1"
                    max="60"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lượng calo (kcal)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newDishCalories}
                    onChange={(e) => setNewDishCalories(e.target.value)}
                    min="10"
                    max="2000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nhãn nổi bật (Badge)</label>
                  <select
                    className="form-select"
                    value={newDishBadge}
                    onChange={(e) => setNewDishBadge(e.target.value)}
                  >
                    <option value="MỚI">✨ MỚI</option>
                    <option value="BESTSELLER">🔥 BESTSELLER</option>
                    <option value="THANH NHIỆT">❄️ THANH NHIỆT</option>
                    <option value="ĐẶC BIỆT">⭐ ĐẶC BIỆT</option>
                    <option value="GIẢM 20%">🏷️ GIẢM 20%</option>
                    <option value="NONE">(Không có nhãn)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hình ảnh món ăn thực tế (URL hoặc chọn mẫu ảnh gợi ý)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newDishImage}
                    onChange={(e) => setNewDishImage(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {newDishImage && (
                    <img
                      src={newDishImage}
                      alt="Preview"
                      style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Gợi ý mẫu:</span>
                  {[
                    { label: '🍜 Phở bò', url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', icon: 'soup' },
                    { label: '🥩 Cơm sườn', url: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80', icon: 'beef' },
                    { label: '🍗 Gà rán', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80', icon: 'drumstick' },
                    { label: '🍔 Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', icon: 'sandwich' },
                    { label: '🥗 Salad', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', icon: 'salad' },
                    { label: '🥤 Trà sữa', url: 'https://images.unsplash.com/photo-1558857563-b37df2dd4364?auto=format&fit=crop&w=600&q=80', icon: 'cup-soda' },
                    { label: '🥐 Bánh tươi', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80', icon: 'cake' }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="badge-soa"
                      style={{
                        cursor: 'pointer',
                        background: newDishImage === preset.url ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        color: newDishImage === preset.url ? 'var(--primary)' : 'var(--text-primary)',
                        borderColor: newDishImage === preset.url ? 'var(--primary)' : 'var(--border-color)',
                        fontSize: '0.72rem'
                      }}
                      onClick={() => {
                        setNewDishImage(preset.url);
                        setNewDishIconCode(preset.icon);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Mô tả hương vị / Thành phần món ăn</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Thịt nướng than hoa thơm lừng ăn kèm nước mắm gia truyền..."
                  value={newDishDesc}
                  onChange={(e) => setNewDishDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowAddDishModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1.5, background: '#00b14f', borderColor: '#00b14f' }}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Lưu & Mở bán món ăn ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </ClickSpark>
  );
}
