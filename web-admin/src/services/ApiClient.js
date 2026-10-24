/**
 * ============================================================================
 * RideEat SOA - Object-Oriented Frontend Service & Domain Layer (ApiClient.js)
 * ============================================================================
 * Applies the 4 Pillars of OOP (Encapsulation, Inheritance, Polymorphism,
 * Abstraction) and Design Patterns (Strategy, Decorator, Observer, Singleton,
 * Circuit Breaker Fallback) on the Frontend Client Tier.
 * ============================================================================
 */

const DEFAULT_GATEWAY_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Observer Pattern: Client-side Event Bus for real-time SOA & Kafka telemetry
 */
export class ClientEventBus {
  #listeners = new Map();

  subscribe(eventType, callback) {
    if (!this.#listeners.has(eventType)) {
      this.#listeners.set(eventType, new Set());
    }
    this.#listeners.get(eventType).add(callback);
    return () => this.#listeners.get(eventType)?.delete(callback);
  }

  publish(eventType, payload) {
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: eventType,
      ...payload
    };
    if (this.#listeners.has(eventType)) {
      this.#listeners.get(eventType).forEach((cb) => cb(event));
    }
    if (this.#listeners.has('*')) {
      this.#listeners.get('*').forEach((cb) => cb(event));
    }
    return event;
  }
}

export const soaEventBus = new ClientEventBus();

/**
 * ============================================================================
 * POLYMORPHIC VEHICLE HIERARCHY (Client-Side Domain Twin of ride-service)
 * Demonstrates Inheritance & Polymorphism for instant interactive calculation
 * ============================================================================
 */
export class AbstractVehicle {
  constructor(code, name, icon, baseFare, perKmRate, perMinuteRate, capacity) {
    if (new.target === AbstractVehicle) {
      throw new Error('AbstractVehicle cannot be instantiated directly');
    }
    this.code = code;
    this.name = name;
    this.icon = icon;
    this.baseFare = baseFare;
    this.perKmRate = perKmRate;
    this.perMinuteRate = perMinuteRate;
    this.capacity = capacity;
  }

  calculateBaseFare(distanceKm, durationMinutes) {
    return this.baseFare + distanceKm * this.perKmRate + durationMinutes * this.perMinuteRate;
  }
}

export class BikeVehicle extends AbstractVehicle {
  constructor() {
    super('BIKE', 'RideEat Bike (Xe Máy)', '🛵', 12000, 4800, 400, 1);
  }
}

export class Car4SeatVehicle extends AbstractVehicle {
  constructor() {
    super('CAR_4', 'RideEat Car 4 Chỗ', '🚗', 25000, 10500, 900, 4);
  }
}

export class Car7SeatVehicle extends AbstractVehicle {
  constructor() {
    super('CAR_7', 'RideEat SUV 7 Chỗ', '🚙', 32000, 13200, 1100, 7);
  }
  calculateBaseFare(distanceKm, durationMinutes) {
    // Polymorphic override: luggage & group comfort surcharge 5%
    return super.calculateBaseFare(distanceKm, durationMinutes) * 1.05;
  }
}

export class LuxuryLimousineVehicle extends AbstractVehicle {
  constructor() {
    super('LUXURY', 'RideEat Luxury VIP', '🚘', 65000, 21000, 1800, 4);
  }
  calculateBaseFare(distanceKm, durationMinutes) {
    // Polymorphic override: VIP lounge & concierge service fee
    return super.calculateBaseFare(distanceKm, durationMinutes) * 1.15 + 15000;
  }
}

export const VEHICLE_CATALOG = [
  new BikeVehicle(),
  new Car4SeatVehicle(),
  new Car7SeatVehicle(),
  new LuxuryLimousineVehicle()
];

/**
 * ============================================================================
 * BASE API CLIENT (Abstract / Base Class with Encapsulation & Circuit Fallback)
 * ============================================================================
 */
export class BaseApiClient {
  #baseUrl;
  #authToken;
  #timeoutMs;
  #serviceName;

  constructor(serviceName, basePath = '', baseUrl = DEFAULT_GATEWAY_URL, timeoutMs = 2800) {
    this.#serviceName = serviceName;
    this.#baseUrl = `${baseUrl}${basePath}`;
    this.#authToken = localStorage.getItem('rideeat_jwt_token') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.rideeat-demo-jwt';
    this.#timeoutMs = timeoutMs;
  }

  get serviceName() {
    return this.#serviceName;
  }

  setAuthToken(token) {
    this.#authToken = token;
    if (token) {
      localStorage.setItem('rideeat_jwt_token', token);
    }
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.#authToken ? { Authorization: `Bearer ${this.#authToken}` } : {}),
      'X-Client-Architecture': 'RideEat-OOP-WebAdmin'
    };
  }

  async request(endpoint, options = {}, fallbackFactory = null) {
    const url = `${this.#baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...(options.headers || {})
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      soaEventBus.publish('API_CALL', {
        service: this.#serviceName,
        method: options.method || 'GET',
        endpoint,
        mode: 'LIVE_BACKEND',
        latencyMs
      });
      return { ...(data.data || data), _mode: 'LIVE_BACKEND', _latencyMs: latencyMs };
    } catch (error) {
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - startTime);

      if (typeof fallbackFactory === 'function') {
        const fallbackData = await fallbackFactory();
        soaEventBus.publish('API_CALL', {
          service: this.#serviceName,
          method: options.method || 'GET',
          endpoint,
          mode: 'DEMO_SIMULATION',
          latencyMs: Math.max(12, Math.min(latencyMs, 48))
        });
        return { ...fallbackData, _mode: 'DEMO_SIMULATION' };
      }
      throw error;
    }
  }
}

/**
 * 1. AuthApiService (:8001) - Authentication & RBAC
 */
export class AuthApiService extends BaseApiClient {
  constructor() {
    super('auth-service:8001', '/api/auth');
  }

  async login(identifier, password, role = 'CUSTOMER') {
    return this.request(
      '/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, secret: password, auth_type: 'password', role })
      },
      () => {
        const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
          JSON.stringify({ sub: identifier, role, iat: Date.now() })
        )}.sig`;
        this.setAuthToken(token);
        soaEventBus.publish('KAFKA_EVENT', {
          topic: 'auth.events',
          service: 'auth-service',
          eventName: 'UserAuthenticatedEvent',
          payload: { identifier, role, strategy: 'PasswordAuthStrategy' }
        });
        return {
          access_token: token,
          user: {
            id: role === 'DRIVER' ? 'drv-partner-001' : 'usr-customer-001',
            full_name: role === 'DRIVER' ? 'Trần Minh Tài (Tài Xế 5★)' : 'Nguyễn Văn A (Hạng Vàng)',
            email: identifier,
            role
          }
        };
      }
    );
  }

  async googleOAuthExchange({ idToken, code, role = 'CUSTOMER' }) {
    return this.request(
      '/google/exchange',
      {
        method: 'POST',
        body: JSON.stringify({
          id_token: idToken || undefined,
          code: code || undefined,
          role: role.toLowerCase()
        })
      },
      () => {
        const token = `jwt-google-exchange-${Date.now()}`;
        this.setAuthToken(token);
        soaEventBus.publish('KAFKA_EVENT', {
          topic: 'auth.events',
          service: 'auth-service:8001',
          eventName: 'GoogleOAuthExchangedEvent',
          payload: { role: role.toLowerCase(), provider: 'google.com' }
        });
        return {
          access_token: token,
          refresh_token: `refresh-${Date.now()}`,
          token_type: 'bearer',
          expires_in: 86400,
          role: role.toLowerCase()
        };
      }
    );
  }

  async refreshToken(refreshToken) {
    return this.request(
      '/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken })
      },
      () => ({
        access_token: `jwt-refreshed-${Date.now()}`,
        refresh_token: `refresh-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 86400
      })
    );
  }

  async firebaseLogin({ email, fullName, role = 'CUSTOMER', idToken = null, firebaseUid = null }) {
    const resolvedUid = firebaseUid || `fb-${btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;
    return this.request(
      '/firebase-login',
      {
        method: 'POST',
        body: JSON.stringify({
          id_token: idToken,
          firebase_uid: resolvedUid,
          email,
          full_name: fullName,
          role: role.toLowerCase()
        })
      },
      () => {
        const token = `eyJhbGciOiJSUzI1NiIsImtpZCI6ImZpcmViYXNlLXJpZGVhdGUifQ.${btoa(
          JSON.stringify({
            iss: 'https://securetoken.google.com/rideate-project',
            aud: 'rideate-project',
            sub: resolvedUid,
            email,
            role,
            iat: Date.now()
          })
        )}.firebase_sig`;
        this.setAuthToken(token);
        soaEventBus.publish('KAFKA_EVENT', {
          topic: 'user.registered',
          service: 'auth-service:8001',
          eventName: 'FirebaseOAuthLogin (rideate-project)',
          payload: { email, firebase_uid: resolvedUid, role, provider: 'google.com' }
        });
        return {
          access_token: token,
          user: {
            id: resolvedUid,
            firebase_uid: resolvedUid,
            full_name: fullName,
            email,
            role,
            provider: 'firebase'
          }
        };
      }
    );
  }
}

/**
 * 2. MapApiService (:8005) - Geo-Spatial Haversine, Routing & Nearby Drivers
 */
export class MapApiService extends BaseApiClient {
  constructor() {
    super('map-service:8005', '/api/map');
  }

  static haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c * 1.28).toFixed(2); // 1.28 urban road winding factor
  }

  static calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    const brng = toDeg(Math.atan2(y, x));
    return Math.round((brng + 360) % 360);
  }

  generateNearbyDrivers(pickup) {
    const offsets = [
      { dLat: 0.0035, dLng: 0.0028, name: 'Trần Minh Tài', plate: '59-X3 888.99', vehicle: 'Honda SH 150i', rating: 4.98 },
      { dLat: -0.0028, dLng: 0.0038, name: 'Lê Hoàng Nam', plate: '59-S1 234.56', vehicle: 'Yamaha Grande', rating: 4.95 },
      { dLat: 0.0042, dLng: -0.0035, name: 'Nguyễn Văn Phúc', plate: '50-F2 678.90', vehicle: 'Honda AirBlade', rating: 4.92 },
      { dLat: -0.0038, dLng: -0.0028, name: 'Vũ Quốc Bảo', plate: '59-K4 999.88', vehicle: 'Toyota Vios', rating: 4.97 }
    ];
    return offsets.map((o, idx) => ({
      id: `drv-radar-${idx + 1}`,
      name: o.name,
      plate: o.plate,
      vehicle: o.vehicle,
      rating: o.rating,
      lat: +(pickup.lat + o.dLat).toFixed(6),
      lng: +(pickup.lng + o.dLng).toFixed(6)
    }));
  }

  generateApproachRoute(driverPos, pickup, steps = 28) {
    const polyline = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Slight urban turn curve
      const curveOffset = Math.sin(t * Math.PI) * 0.0018;
      polyline.push([
        +(driverPos.lat + (pickup.lat - driverPos.lat) * t + curveOffset).toFixed(6),
        +(driverPos.lng + (pickup.lng - driverPos.lng) * t - curveOffset * 0.5).toFixed(6)
      ]);
    }
    return polyline;
  }

  async calculateRoute(origin, destination, vehicleType = 'BIKE') {
    return this.request(
      '/route',
      {
        method: 'POST',
        body: JSON.stringify({ origin, destination, vehicle_type: vehicleType })
      },
      () => {
        const distanceKm = MapApiService.haversineKm(
          origin.lat,
          origin.lng,
          destination.lat,
          destination.lng
        );
        const speedKmh = vehicleType === 'BIKE' ? 28 : 24;
        const durationMinutes = Math.max(4, Math.round((distanceKm / speedKmh) * 60));

        // Generate high-density smooth curved waypoints for Leaflet Polyline (64 steps)
        const steps = 64;
        const polyline = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          // Compound S-curve to mimic urban avenue turnings
          const s1 = Math.sin(t * Math.PI) * 0.0035;
          const s2 = Math.sin(t * Math.PI * 2) * 0.0012;
          const curveLat = s1 + s2;
          const curveLng = -s1 * 0.65 + s2 * 0.4;
          polyline.push([
            +(origin.lat + (destination.lat - origin.lat) * t + curveLat).toFixed(6),
            +(origin.lng + (destination.lng - origin.lng) * t + curveLng).toFixed(6)
          ]);
        }

        return {
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          polyline,
          algorithm: 'HaversineRoadFactorEngine + GeoPolylineBuilder'
        };
      }
    );
  }
}

/**
 * 3. RideApiService (:8003) - Polymorphic Fare Calculation, State Machine & QR/OTP
 */
export class RideApiService extends BaseApiClient {
  constructor() {
    super('ride-service:8003', '/api/rides');
  }

  async estimatePolymorphicFare({
    pickup,
    dropoff,
    distanceKm,
    durationMinutes,
    weather = 'CLEAR',
    isPeakHour = false,
    includeInsurance = true,
    priorityDispatch = false,
    voucherDiscount = 0
  }) {
    return this.request(
      '/estimate',
      {
        method: 'POST',
        body: JSON.stringify({
          pickup,
          dropoff,
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          weather,
          is_peak_hour: isPeakHour,
          include_insurance: includeInsurance,
          priority_dispatch: priorityDispatch
        })
      },
      () => {
        // Strategy Pattern Multiplier
        let surgeMultiplier = 1.0;
        let strategyName = 'NormalPricingStrategy';
        if (weather === 'RAIN' && isPeakHour) {
          surgeMultiplier = 1.45;
          strategyName = 'RainyWeatherPricingStrategy + SurgePricingStrategy';
        } else if (weather === 'RAIN') {
          surgeMultiplier = 1.25;
          strategyName = 'RainyWeatherPricingStrategy';
        } else if (isPeakHour) {
          surgeMultiplier = 1.2;
          strategyName = 'SurgePricingStrategy (Peak Hour)';
        }

        // Decorator Pattern Add-ons
        const insuranceFee = includeInsurance ? 3000 : 0;
        const priorityFee = priorityDispatch ? 10000 : 0;
        const decorators = [];
        if (includeInsurance) decorators.push('InsuranceFeeDecorator (+3.000đ)');
        if (priorityDispatch) decorators.push('PriorityDispatchDecorator (+10.000đ)');

        const estimates = VEHICLE_CATALOG.map((vehicle) => {
          const rawBase = vehicle.calculateBaseFare(distanceKm, durationMinutes);
          const afterStrategy = Math.round(rawBase * surgeMultiplier);
          const totalBeforePromo = afterStrategy + insuranceFee + priorityFee;
          const finalFare = Math.max(10000, Math.round((totalBeforePromo - voucherDiscount) / 1000) * 1000);

          return {
            vehicleCode: vehicle.code,
            vehicleName: vehicle.name,
            icon: vehicle.icon,
            capacity: vehicle.capacity,
            className: vehicle.constructor.name,
            baseCalculated: Math.round(rawBase),
            surgeMultiplier,
            strategyName,
            decorators,
            insuranceFee,
            priorityFee,
            voucherDiscount,
            finalFare
          };
        });

        return { estimates, strategyName, surgeMultiplier, decorators };
      }
    );
  }

  async bookRide(bookingPayload) {
    return this.request(
      '/book',
      {
        method: 'POST',
        body: JSON.stringify(bookingPayload)
      },
      () => {
        const otpCode = String(Math.floor(100000 + Math.random() * 900000));
        const rideId = `RIDE-${Date.now().toString().slice(-6)}`;
        const qrSignature = `RIDEEAT|${rideId}|OTP:${otpCode}|FARE:${bookingPayload.fare}|DRV:59-X3-888.99`;

        soaEventBus.publish('KAFKA_EVENT', {
          topic: 'ride.events',
          service: 'ride-service',
          eventName: 'RideRequestedEvent',
          payload: {
            rideId,
            vehicleType: bookingPayload.vehicleCode,
            fare: bookingPayload.fare,
            otpCode
          }
        });

        return {
          ride_id: rideId,
          state: 'DRIVER_ASSIGNED',
          otp_code: otpCode,
          qr_payload: qrSignature,
          driver: {
            id: 'drv-partner-001',
            name: 'Trần Minh Tài',
            rating: 4.96,
            phone: '0912.345.678',
            license_plate: bookingPayload.vehicleCode === 'BIKE' ? '59-X3 888.99' : '51K-999.88',
            vehicle_model: bookingPayload.vehicleCode === 'BIKE' ? 'Honda SH 150i ABS' : 'VinFast VF8 Eco'
          }
        };
      }
    );
  }
}

/**
 * 4. FoodApiService (:8004) - Composite Menu, Redis Cart, Order State Machine & AI Recommender
 */
export class FoodApiService extends BaseApiClient {
  constructor() {
    super('food-service:8004', '/api/food');
  }

  async getRestaurants() {
    return this.request('/restaurants', { method: 'GET' }, () => ({
      restaurants: [
        {
          id: 'rest-pho-thin-01',
          name: 'Phở Thìn Bờ Hồ - Chi Nhánh Quận 1',
          category: 'Món Việt Truyền Thống',
          rating: 4.9,
          prepTimeMinutes: 12,
          distanceKm: 1.4,
          badge: 'Quán Yêu Thích ★',
          menu: [
            { id: 'f-01', name: 'Phở Bò Tái Lăn Đặc Biệt', price: 65000, calories: 580, tags: ['RAIN', 'HOT', 'DINNER', 'MORNING'], image: '🍜' },
            { id: 'f-02', name: 'Phở Gàu Giòn Nước Trong', price: 60000, calories: 520, tags: ['MORNING', 'LIGHT'], image: '🥣' },
            { id: 'f-03', name: 'Combo Phở Tái + Quẩy Giòn + Trà Đá', price: 78000, calories: 690, tags: ['COMBO', 'BESTSELLER'], image: '🥢' }
          ]
        },
        {
          id: 'rest-com-tam-02',
          name: 'Cơm Tấm Phúc Lộc Thọ - Nguyễn Văn Cừ',
          category: 'Cơm Tấm Sài Gòn',
          rating: 4.8,
          prepTimeMinutes: 10,
          distanceKm: 1.8,
          badge: 'Freeship Extra',
          menu: [
            { id: 'f-04', name: 'Cơm Tấm Sườn Bì Chả Trứng Ốp La', price: 58000, calories: 740, tags: ['LUNCH', 'DINNER', 'BESTSELLER'], image: '🍱' },
            { id: 'f-05', name: 'Cơm Đùi Gà Nướng Mật Ong + Canh Khổ Qua', price: 62000, calories: 680, tags: ['LUNCH', 'HIGH_PROTEIN'], image: '🍗' }
          ]
        },
        {
          id: 'rest-tea-coffee-03',
          name: 'Katinat Saigon Kafe - Đồng Khởi',
          category: 'Trà Sữa & Cà Phê Thủ Công',
          rating: 4.92,
          prepTimeMinutes: 8,
          distanceKm: 0.9,
          badge: 'Giao Nhanh 15p',
          menu: [
            { id: 'f-06', name: 'Trà Sữa Chôm Chôm Nướng Kem Phô Mai', price: 55000, calories: 410, tags: ['SUNNY', 'AFTERNOON', 'SWEET'], image: '🧋' },
            { id: 'f-07', name: 'Cà Phê Sữa Đá Sài Gòn Đậm Vị', price: 39000, calories: 210, tags: ['MORNING', 'ENERGY'], image: '☕' },
            { id: 'f-08', name: 'Trà Đào Hồng Đài Hạt Chia Thanh Mát', price: 49000, calories: 180, tags: ['SUNNY', 'HEALTHY'], image: '🍹' }
          ]
        }
      ]
    }));
  }

  async createOrder(orderPayload) {
    return this.request(
      '/orders',
      {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      },
      () => {
        const orderId = `ORD-${Date.now().toString().slice(-6)}`;
        soaEventBus.publish('KAFKA_EVENT', {
          topic: 'food.events',
          service: 'food-service',
          eventName: 'FoodOrderCreatedEvent',
          payload: {
            orderId,
            restaurant: orderPayload.restaurantName,
            totalAmount: orderPayload.finalTotal,
            itemCount: orderPayload.items.length
          }
        });
        return {
          order_id: orderId,
          state: 'CONFIRMED',
          estimated_minutes: 18,
          shipper: {
            name: 'Lê Hoàng Nam (Shipper Pro)',
            phone: '0988.777.666',
            plate: '59-S2 686.86'
          }
        };
      }
    );
  }
}

/**
 * 5. PromoApiService (:8008) - Polymorphic DiscountStrategy + Specification Pattern
 */
export class PromoApiService extends BaseApiClient {
  constructor() {
    super('promo-service:8008', '/api/promos');
  }

  async getVouchers() {
    return this.request('/vouchers', { method: 'GET' }, () => ({
      vouchers: [
        {
          code: 'RIDEEAT50',
          title: 'Giảm 50% (Tối đa 30.000đ)',
          strategyClass: 'PercentageDiscountStrategy',
          specRule: 'MinOrderAmountSpec(>= 40.000đ)',
          type: 'PERCENT',
          value: 50,
          maxDiscount: 30000,
          minOrder: 40000,
          domain: 'ALL'
        },
        {
          code: 'FREESHIP15K',
          title: 'Miễn phí giao đồ ăn 15.000đ',
          strategyClass: 'FreeDeliveryStrategy',
          specRule: 'MinOrderAmountSpec(>= 35.000đ)',
          type: 'FIXED',
          value: 15000,
          maxDiscount: 15000,
          minOrder: 35000,
          domain: 'FOOD'
        },
        {
          code: 'SVUIT25K',
          title: 'Ưu đãi Sinh Viên giảm thẳng 25.000đ',
          strategyClass: 'FixedAmountDiscountStrategy',
          specRule: 'MinOrderAmountSpec(>= 60.000đ) & UserTierSpec',
          type: 'FIXED',
          value: 25000,
          maxDiscount: 25000,
          minOrder: 60000,
          domain: 'ALL'
        }
      ]
    }));
  }

  calculateDiscount(voucher, orderAmount) {
    if (!voucher || orderAmount < voucher.minOrder) {
      return { discountAmount: 0, valid: false, reason: `Đơn tối thiểu ${voucher?.minOrder?.toLocaleString('vi-VN')}đ` };
    }
    let discountAmount = 0;
    if (voucher.type === 'PERCENT') {
      discountAmount = Math.min(Math.round((orderAmount * voucher.value) / 100), voucher.maxDiscount);
    } else {
      discountAmount = Math.min(voucher.value, orderAmount);
    }
    return {
      discountAmount,
      valid: true,
      strategyClass: voucher.strategyClass,
      specRule: voucher.specRule
    };
  }
}

/**
 * 6. PaymentApiService (:8006) - Encapsulated Wallet & PaymentStrategy Factory
 */
export class PaymentApiService extends BaseApiClient {
  constructor() {
    super('payment-service:8006', '/api/payments');
  }

  async processTransaction({ userId, amount, method, referenceId, referenceType, description }) {
    return this.request(
      '/charge',
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          amount,
          method,
          reference_id: referenceId,
          reference_type: referenceType
        })
      },
      () => {
        const strategyMap = {
          WALLET: 'RideEatWalletPaymentStrategy',
          VNPAY: 'VNPayGatewayAdapterStrategy',
          MOMO: 'MoMoEWalletStrategy',
          CASH: 'CashOnDeliveryStrategy'
        };
        const txnId = `TXN-${Date.now().toString().slice(-6)}`;
        const invoiceNo = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        soaEventBus.publish('KAFKA_EVENT', {
          topic: 'payment.events',
          service: 'payment-service',
          eventName: 'PaymentSucceededEvent',
          payload: {
            txnId,
            invoiceNo,
            amount,
            method,
            strategy: strategyMap[method] || 'RideEatWalletPaymentStrategy',
            referenceId
          }
        });

        return {
          transaction_id: txnId,
          invoice_number: invoiceNo,
          amount,
          method,
          strategy_class: strategyMap[method] || 'RideEatWalletPaymentStrategy',
          reference_id: referenceId,
          reference_type: referenceType,
          description,
          status: 'COMPLETED',
          timestamp: new Date().toLocaleString('vi-VN')
        };
      }
    );
  }
}

/**
 * 7. RatingApiService (:8007) - Reviews, Bayesian Reputation & Fraud Guard
 */
export class RatingApiService extends BaseApiClient {
  constructor() {
    super('rating-service:8007', '/api/ratings');
  }

  async submitReview({ reviewerId, targetId, targetType, referenceId, stars, comment, imageUrl }) {
    return this.request(
      '',
      {
        method: 'POST',
        body: JSON.stringify({
          reviewer_id: reviewerId,
          target_id: targetId,
          target_type: targetType,
          reference_id: referenceId,
          stars,
          comment,
          image_url: imageUrl
        })
      },
      () => {
        soaEventBus.publish('KAFKA_EVENT', {
          topic: 'rating.events',
          service: 'rating-service:8007',
          eventName: 'ReviewCreatedEvent',
          payload: { targetId, targetType, stars, comment }
        });
        return {
          id: `rev-${Date.now().toString().slice(-6)}`,
          reviewer_id: reviewerId,
          target_id: targetId,
          target_type: targetType,
          reference_id: referenceId,
          stars,
          comment,
          created_at: new Date().toISOString()
        };
      }
    );
  }

  async getTargetRatingSummary(targetType, targetId) {
    return this.request(
      `/${targetType}/${targetId}/summary`,
      { method: 'GET' },
      () => ({
        target_type: targetType,
        target_id: targetId,
        average_stars: 4.95,
        total_reviews: 128,
        star_breakdown: { '1': 1, '2': 0, '3': 2, '4': 15, '5': 110 }
      })
    );
  }
}

/**
 * 8. SystemMonitorService - Aggregates Health, Metrics & OOP Architecture Across All 9 Services
 */
export class SystemMonitorService extends BaseApiClient {
  constructor() {
    super('api-gateway:8080', '');
  }

  getMicroservicesCatalog() {
    return [
      {
        id: 'auth-service',
        name: '1. Auth Service',
        port: 8001,
        endpoint: '/api/auth/health',
        boundedContext: 'Identity, JWT & RBAC Security',
        dbSchema: 'auth_schema (PostgreSQL) + Redis Blacklist',
        oopHighlights: [
          'Abstract Base: AuthStrategy (authenticate, validate_credentials)',
          'Subclasses: PasswordAuthStrategy, OTPAuthStrategy, RefreshTokenStrategy',
          'Factory: AuthStrategyFactory + Encapsulated TokenManager'
        ]
      },
      {
        id: 'user-service',
        name: '2. User & Partner Service',
        port: 8002,
        endpoint: '/api/users/health',
        boundedContext: 'Customer, Driver KYC & Merchant Profiles',
        dbSchema: 'user_schema (PostgreSQL)',
        oopHighlights: [
          'Inheritance: BaseUserProfile -> CustomerProfile, DriverProfile, MerchantProfile',
          'Polymorphism: calculate_loyalty_benefits() & check_operational_eligibility()',
          'State Management: Driver KYC Verification & Online Toggle'
        ]
      },
      {
        id: 'ride-service',
        name: '3. Ride Hailing Service',
        port: 8003,
        endpoint: '/api/rides/health',
        boundedContext: 'Mobility, Dispatch, Fare & Trip Lifecycle',
        dbSchema: 'ride_schema (PostgreSQL) + WebSocket',
        oopHighlights: [
          'Vehicle Hierarchy: AbstractVehicle -> BikeVehicle, Car4Seat, Car7Seat, Luxury',
          'Strategy Pattern: NormalPricing, SurgePricing, RainyWeatherPricing',
          'Decorator Pattern: InsuranceFeeDecorator, PriorityDispatchDecorator',
          'State Pattern: Requested -> Assigned -> Arriving -> InProgress -> Completed'
        ]
      },
      {
        id: 'food-service',
        name: '4. Food Delivery Service',
        port: 8004,
        endpoint: '/api/food/health',
        boundedContext: 'Restaurants, Menus, Cart & Order State Machine',
        dbSchema: 'food_schema (PostgreSQL) + Redis Cart',
        oopHighlights: [
          'Composite Pattern: MenuComponent -> MenuItemLeaf & ComboMealComposite',
          'State Pattern: Pending -> Confirmed -> Preparing -> PickingUp -> Delivering -> Delivered',
          'Strategy Pattern: AI Contextual Food Recommendation Engine'
        ]
      },
      {
        id: 'map-service',
        name: '5. Map & Geo-Spatial Service',
        port: 8005,
        endpoint: '/api/map/health',
        boundedContext: 'Routing, ETA, Haversine & Spatial Driver Index',
        dbSchema: 'Redis Geo-Spatial Index + map_schema',
        oopHighlights: [
          'Value Objects: GeoPoint, GeoBounds, RouteSegment (Immutable)',
          'Strategy Pattern: HaversineDistanceCalculator, UrbanTrafficETACalculator',
          'Spatial Index: NearestDriverFinder within configurable radius'
        ]
      },
      {
        id: 'payment-service',
        name: '6. Payment & E-Wallet Service',
        port: 8006,
        endpoint: '/api/payments/health',
        boundedContext: 'Digital Wallet, Ledger, Gateways & Refunds',
        dbSchema: 'payment_schema (PostgreSQL)',
        oopHighlights: [
          'Encapsulation: WalletEntity.__balance private attribute with atomic credit/debit',
          'Strategy + Factory: WalletPayment, VNPayPayment, MoMoPayment, CashPayment',
          'Idempotency & Saga Compensation: Automatic refund on order cancellation'
        ]
      },
      {
        id: 'rating-service',
        name: '7. Rating & Reputation Service',
        port: 8007,
        endpoint: '/api/ratings/health',
        boundedContext: 'Reviews, Bayesian Reputation & Fraud Guard',
        dbSchema: 'rating_schema (PostgreSQL)',
        oopHighlights: [
          'Inheritance: BaseRating -> DriverRating, RestaurantRating, CustomerRating',
          'Strategy Pattern: BayesianWeightedAverageStrategy for fair star ratings',
          'Anti-Spam Guard: Duplicate order review prevention'
        ]
      },
      {
        id: 'promo-service',
        name: '8. Promotion & Voucher Service',
        port: 8008,
        endpoint: '/api/promos/health',
        boundedContext: 'Campaigns, Vouchers & Rule Specifications',
        dbSchema: 'promo_schema (PostgreSQL) + Redis Quota',
        oopHighlights: [
          'Strategy Pattern: PercentageDiscount, FixedAmountDiscount, FreeDelivery',
          'Specification Pattern: MinOrderAmountSpec, TimeWindowSpec, UserTierSpec',
          'Composite Specification: AND / OR rule chaining'
        ]
      },
      {
        id: 'notification-service',
        name: '9. Notification & Event Hub',
        port: 8009,
        endpoint: '/api/notifications/health',
        boundedContext: 'Kafka Event Consumer & Multi-Channel Push',
        dbSchema: 'notification_schema + WebSocket Hub',
        oopHighlights: [
          'Observer Pattern: Kafka DomainEvent Subscriber across ride/food/payment topics',
          'Adapter Pattern: WebSocketChannel, EmailChannel, SMSChannel',
          'Template Method: Standardized localized Vietnamese notification formatting'
        ]
      }
    ];
  }
}

export const apiRegistry = {
  auth: new AuthApiService(),
  map: new MapApiService(),
  ride: new RideApiService(),
  food: new FoodApiService(),
  promo: new PromoApiService(),
  payment: new PaymentApiService(),
  rating: new RatingApiService(),
  monitor: new SystemMonitorService()
};
