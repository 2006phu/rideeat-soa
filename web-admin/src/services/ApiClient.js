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

  // Resamples a road polyline into smooth, uniform distance steps for realistic pacing
  static resamplePolyline(points, targetCount = 42) {
    if (!points || points.length < 2) return points || [];
    const cumDist = [0];
    for (let i = 0; i < points.length - 1; i++) {
      const d = MapApiService.haversineKm(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
      cumDist.push(cumDist[i] + d);
    }
    const totalDist = cumDist[cumDist.length - 1];
    if (totalDist <= 0.001) return points;

    const resampled = [];
    let segIdx = 0;
    for (let s = 0; s <= targetCount; s++) {
      const targetD = (s / targetCount) * totalDist;
      while (segIdx < cumDist.length - 2 && cumDist[segIdx + 1] < targetD) {
        segIdx++;
      }
      const segStartD = cumDist[segIdx];
      const segEndD = cumDist[segIdx + 1];
      const segLen = segEndD - segStartD;
      const t = segLen > 0 ? (targetD - segStartD) / segLen : 0;
      const p1 = points[segIdx];
      const p2 = points[segIdx + 1];
      resampled.push([
        +(p1[0] + (p2[0] - p1[0]) * t).toFixed(6),
        +(p1[1] + (p2[1] - p1[1]) * t).toFixed(6)
      ]);
    }
    return resampled;
  }

  // Realistic nearby driver positions pinned to actual street pavements
  generateNearbyDrivers(pickup) {
    // If near Landmark 81
    if (Math.abs(pickup.lat - 10.7950) < 0.015 && Math.abs(pickup.lng - 106.7218) < 0.015) {
      return [
        { id: 'drv-radar-1', name: 'Trần Minh Tài', plate: '59-X3 888.99', vehicle: 'Honda SH 150i ABS', rating: 4.98, lat: 10.7915, lng: 106.7183, street: 'Nguyễn Hữu Cảnh (The Manor)' },
        { id: 'drv-radar-2', name: 'Lê Hoàng Nam', plate: '59-S1 234.56', vehicle: 'Yamaha Grande', rating: 4.95, lat: 10.7995, lng: 106.7230, street: 'Điện Biên Phủ (Tân Cảng)' },
        { id: 'drv-radar-3', name: 'Nguyễn Văn Phúc', plate: '50-F2 678.90', vehicle: 'Honda AirBlade', rating: 4.92, lat: 10.8015, lng: 106.7140, street: 'Ngã 4 Hàng Xanh' },
        { id: 'drv-radar-4', name: 'Vũ Quốc Bảo', plate: '59-K4 999.88', vehicle: 'Toyota Vios', rating: 4.97, lat: 10.7965, lng: 106.7250, street: 'Cầu Sài Gòn' }
      ];
    }
    // If near Ben Thanh
    if (Math.abs(pickup.lat - 10.7726) < 0.015 && Math.abs(pickup.lng - 106.6980) < 0.015) {
      return [
        { id: 'drv-radar-1', name: 'Trần Minh Tài', plate: '59-X3 888.99', vehicle: 'Honda SH 150i ABS', rating: 4.98, lat: 10.7735, lng: 106.6995, street: 'Lê Lợi' },
        { id: 'drv-radar-2', name: 'Lê Hoàng Nam', plate: '59-S1 234.56', vehicle: 'Yamaha Grande', rating: 4.95, lat: 10.7712, lng: 106.7020, street: 'Hàm Nghi' },
        { id: 'drv-radar-3', name: 'Nguyễn Văn Phúc', plate: '50-F2 678.90', vehicle: 'Honda AirBlade', rating: 4.92, lat: 10.7760, lng: 106.6965, street: 'Nam Kỳ Khởi Nghĩa' },
        { id: 'drv-radar-4', name: 'Vũ Quốc Bảo', plate: '59-K4 999.88', vehicle: 'Toyota Vios', rating: 4.97, lat: 10.7730, lng: 106.7015, street: 'Pasteur' }
      ];
    }
    // If near Nguyen Hue
    if (Math.abs(pickup.lat - 10.7744) < 0.015 && Math.abs(pickup.lng - 106.7035) < 0.015) {
      return [
        { id: 'drv-radar-1', name: 'Trần Minh Tài', plate: '59-X3 888.99', vehicle: 'Honda SH 150i ABS', rating: 4.98, lat: 10.7735, lng: 106.7065, street: 'Tôn Đức Thắng' },
        { id: 'drv-radar-2', name: 'Lê Hoàng Nam', plate: '59-S1 234.56', vehicle: 'Yamaha Grande', rating: 4.95, lat: 10.7710, lng: 106.7040, street: 'Hàm Nghi' },
        { id: 'drv-radar-3', name: 'Nguyễn Văn Phúc', plate: '50-F2 678.90', vehicle: 'Honda AirBlade', rating: 4.92, lat: 10.7765, lng: 106.7020, street: 'Đồng Khởi' },
        { id: 'drv-radar-4', name: 'Vũ Quốc Bảo', plate: '59-K4 999.88', vehicle: 'Toyota Vios', rating: 4.97, lat: 10.7780, lng: 106.7040, street: 'Lê Thánh Tôn' }
      ];
    }
    // If near Sala Thu Thiem
    if (Math.abs(pickup.lat - 10.7719) < 0.015 && Math.abs(pickup.lng - 106.7224) < 0.015) {
      return [
        { id: 'drv-radar-1', name: 'Trần Minh Tài', plate: '59-X3 888.99', vehicle: 'Honda SH 150i ABS', rating: 4.98, lat: 10.7740, lng: 106.7250, street: 'Mai Chí Thọ' },
        { id: 'drv-radar-2', name: 'Lê Hoàng Nam', plate: '59-S1 234.56', vehicle: 'Yamaha Grande', rating: 4.95, lat: 10.7700, lng: 106.7200, street: 'Nguyễn Cơ Thạch' },
        { id: 'drv-radar-3', name: 'Nguyễn Văn Phúc', plate: '50-F2 678.90', vehicle: 'Honda AirBlade', rating: 4.92, lat: 10.7780, lng: 106.7160, street: 'Cầu Ba Son' },
        { id: 'drv-radar-4', name: 'Vũ Quốc Bảo', plate: '59-K4 999.88', vehicle: 'Toyota Vios', rating: 4.97, lat: 10.7750, lng: 106.7280, street: 'Trần Não' }
      ];
    }
    // Default street-anchored offsets
    return [
      { id: 'drv-radar-1', name: 'Trần Minh Tài', plate: '59-X3 888.99', vehicle: 'Honda SH 150i ABS', rating: 4.98, lat: +(pickup.lat + 0.0020).toFixed(6), lng: +(pickup.lng + 0.0015).toFixed(6), street: 'Đường phố nội bộ' },
      { id: 'drv-radar-2', name: 'Lê Hoàng Nam', plate: '59-S1 234.56', vehicle: 'Yamaha Grande', rating: 4.95, lat: +(pickup.lat - 0.0022).toFixed(6), lng: +(pickup.lng + 0.0018).toFixed(6), street: 'Đường phố nội bộ' },
      { id: 'drv-radar-3', name: 'Nguyễn Văn Phúc', plate: '50-F2 678.90', vehicle: 'Honda AirBlade', rating: 4.92, lat: +(pickup.lat + 0.0018).toFixed(6), lng: +(pickup.lng - 0.0022).toFixed(6), street: 'Đường phố nội bộ' },
      { id: 'drv-radar-4', name: 'Vũ Quốc Bảo', plate: '59-K4 999.88', vehicle: 'Toyota Vios', rating: 4.97, lat: +(pickup.lat - 0.0019).toFixed(6), lng: +(pickup.lng - 0.0020).toFixed(6), street: 'Đường phố nội bộ' }
    ];
  }

  // 1. Direct OSRM Real-Road Shortest Path query (OpenStreetMap Road Network)
  static async fetchOsrmRoute(origin, destination, vehicleType = 'BIKE') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const best = data.routes[0];
          const distKm = +(best.distance / 1000).toFixed(2);
          const durMin = Math.max(2, Math.round(best.duration / 60));
          const rawPoly = (best.geometry?.coordinates || []).map((pt) => [
            +pt[1].toFixed(6),
            +pt[0].toFixed(6)
          ]);
          if (rawPoly.length >= 2) {
            const polyline = MapApiService.resamplePolyline(rawPoly, 42);
            return {
              distance_km: distKm,
              duration_minutes: durMin,
              polyline,
              algorithm: 'OSRM Contraction-Hierarchies Shortest Path (OpenStreetMap)'
            };
          }
        }
      }
    } catch {
      // OSRM failed or timed out, will fall back to A* Graph Engine
    } finally {
      clearTimeout(timeoutId);
    }
    return null;
  }

  // 2. In-Memory A* Shortest Path Graph Engine on HCMC Urban Road Network (Resilient Fallback)
  static aStarGraphRoute(origin, destination, vehicleType = 'BIKE') {
    // 16 major urban intersection nodes in Ho Chi Minh City
    const NODES = {
      BEN_THANH: { id: 'BEN_THANH', name: 'Chợ Bến Thành', lat: 10.7726, lng: 106.6980 },
      LE_LOI_PASTEUR: { id: 'LE_LOI_PASTEUR', name: 'Lê Lợi & Pasteur', lat: 10.7745, lng: 106.7005 },
      NGUYEN_HUE: { id: 'NGUYEN_HUE', name: 'Phố Đi Bộ Nguyễn Huệ', lat: 10.7744, lng: 106.7035 },
      TON_DUC_THANG: { id: 'TON_DUC_THANG', name: 'Tôn Đức Thắng & Bến Bạch Đằng', lat: 10.7785, lng: 106.7065 },
      LE_DUAN_TON_DUC_THANG: { id: 'LE_DUAN_TON_DUC_THANG', name: 'Lê Duẩn & Tôn Đức Thắng', lat: 10.7845, lng: 106.7042 },
      NGUYEN_HUU_CANH_BA_SON: { id: 'NGUYEN_HUU_CANH_BA_SON', name: 'Nguyễn Hữu Cảnh (Chân Cầu Ba Son)', lat: 10.7850, lng: 106.7082 },
      NGUYEN_HUU_CANH_MANOR: { id: 'NGUYEN_HUU_CANH_MANOR', name: 'Nguyễn Hữu Cảnh (The Manor)', lat: 10.7915, lng: 106.7183 },
      LANDMARK_81: { id: 'LANDMARK_81', name: 'Vinhomes Landmark 81 Gate', lat: 10.7950, lng: 106.7218 },
      DIEN_BIEN_PHU_HANG_XANH: { id: 'DIEN_BIEN_PHU_HANG_XANH', name: 'Ngã 4 Hàng Xanh', lat: 10.8016, lng: 106.7118 },
      CAU_SAI_GON: { id: 'CAU_SAI_GON', name: 'Cầu Sài Gòn', lat: 10.7995, lng: 106.7250 },
      CAU_BA_SON_THU_THIEM: { id: 'CAU_BA_SON_THU_THIEM', name: 'Cầu Ba Son (Bờ Thủ Thiêm)', lat: 10.7785, lng: 106.7145 },
      SALA_MAI_CHI_THO: { id: 'SALA_MAI_CHI_THO', name: 'Khu Đô Thị Sala (Mai Chí Thọ)', lat: 10.7719, lng: 106.7224 },
      TRAN_NAO_THU_THIEM: { id: 'TRAN_NAO_THU_THIEM', name: 'Trần Não & Mai Chí Thọ', lat: 10.7850, lng: 106.7290 },
      DH_KHTN: { id: 'DH_KHTN', name: 'ĐH KHTN (Nguyễn Văn Cừ, Q5)', lat: 10.7629, lng: 106.6822 },
      TRAN_HUNG_DAO: { id: 'TRAN_HUNG_DAO', name: 'Trần Hưng Đạo & Nguyễn Thái Học', lat: 10.7665, lng: 106.6925 },
      HOANG_VAN_THU: { id: 'HOANG_VAN_THU', name: 'Hoàng Văn Thụ & Phan Đăng Lưu', lat: 10.7985, lng: 106.6780 },
      TAN_SON_NHAT: { id: 'TAN_SON_NHAT', name: 'Sân Bay Tân Sơn Nhất', lat: 10.8185, lng: 106.6588 }
    };

    // Real street adjacency list with street paths
    const EDGES = [
      { from: 'BEN_THANH', to: 'LE_LOI_PASTEUR', dist: 0.35 },
      { from: 'LE_LOI_PASTEUR', to: 'NGUYEN_HUE', dist: 0.38 },
      { from: 'NGUYEN_HUE', to: 'TON_DUC_THANG', dist: 0.55 },
      { from: 'TON_DUC_THANG', to: 'LE_DUAN_TON_DUC_THANG', dist: 0.72 },
      { from: 'LE_DUAN_TON_DUC_THANG', to: 'NGUYEN_HUU_CANH_BA_SON', dist: 0.52 },
      { from: 'NGUYEN_HUU_CANH_BA_SON', to: 'NGUYEN_HUU_CANH_MANOR', dist: 1.35 },
      { from: 'NGUYEN_HUU_CANH_MANOR', to: 'LANDMARK_81', dist: 0.65 },
      { from: 'NGUYEN_HUU_CANH_MANOR', to: 'DIEN_BIEN_PHU_HANG_XANH', dist: 1.45 },
      { from: 'DIEN_BIEN_PHU_HANG_XANH', to: 'CAU_SAI_GON', dist: 1.55 },
      { from: 'CAU_SAI_GON', to: 'LANDMARK_81', dist: 0.85 },
      { from: 'NGUYEN_HUU_CANH_BA_SON', to: 'CAU_BA_SON_THU_THIEM', dist: 1.10 },
      { from: 'CAU_BA_SON_THU_THIEM', to: 'SALA_MAI_CHI_THO', dist: 1.25 },
      { from: 'SALA_MAI_CHI_THO', to: 'TRAN_NAO_THU_THIEM', dist: 1.65 },
      { from: 'TRAN_NAO_THU_THIEM', to: 'CAU_SAI_GON', dist: 1.40 },
      { from: 'BEN_THANH', to: 'TRAN_HUNG_DAO', dist: 0.88 },
      { from: 'TRAN_HUNG_DAO', to: 'DH_KHTN', dist: 1.25 },
      { from: 'LE_DUAN_TON_DUC_THANG', to: 'HOANG_VAN_THU', dist: 3.40 },
      { from: 'HOANG_VAN_THU', to: 'TAN_SON_NHAT', dist: 2.25 }
    ];

    // Build bidirectional adjacency map
    const adj = {};
    Object.keys(NODES).forEach((k) => (adj[k] = []));
    EDGES.forEach((e) => {
      adj[e.from].push({ to: e.to, dist: e.dist });
      adj[e.to].push({ to: e.from, dist: e.dist });
    });

    // Find nearest graph node to coordinate
    const findNearest = (coord) => {
      let bestKey = Object.keys(NODES)[0];
      let bestDist = Infinity;
      Object.keys(NODES).forEach((k) => {
        const d = MapApiService.haversineKm(coord.lat, coord.lng, NODES[k].lat, NODES[k].lng);
        if (d < bestDist) {
          bestDist = d;
          bestKey = k;
        }
      });
      return bestKey;
    };

    const startNode = findNearest(origin);
    const destNode = findNearest(destination);

    // A* Algorithm Search
    const openSet = [startNode];
    const cameFrom = {};
    const gScore = {};
    const fScore = {};
    Object.keys(NODES).forEach((k) => {
      gScore[k] = Infinity;
      fScore[k] = Infinity;
    });
    gScore[startNode] = 0;
    fScore[startNode] = MapApiService.haversineKm(
      NODES[startNode].lat,
      NODES[startNode].lng,
      NODES[destNode].lat,
      NODES[destNode].lng
    );

    while (openSet.length > 0) {
      // Node in openSet with lowest fScore
      let current = openSet[0];
      let lowestF = fScore[current];
      for (let i = 1; i < openSet.length; i++) {
        if (fScore[openSet[i]] < lowestF) {
          lowestF = fScore[openSet[i]];
          current = openSet[i];
        }
      }

      if (current === destNode) {
        // Reconstruct path
        const pathKeys = [current];
        while (cameFrom[current]) {
          current = cameFrom[current];
          pathKeys.unshift(current);
        }

        // Build continuous dense road polyline
        const rawPoints = [];
        rawPoints.push([origin.lat, origin.lng]);
        pathKeys.forEach((k) => rawPoints.push([NODES[k].lat, NODES[k].lng]));
        rawPoints.push([destination.lat, destination.lng]);

        // Interpolate smooth road steps
        const polyline = MapApiService.resamplePolyline(rawPoints, 42);

        const distKm = +(gScore[destNode] + 0.6).toFixed(2);
        const speedKmh = vehicleType === 'BIKE' ? 28 : 24;
        const durMin = Math.max(3, Math.round((distKm / speedKmh) * 60));

        return {
          distance_km: distKm,
          duration_minutes: durMin,
          polyline,
          algorithm: 'A* Shortest Path Graph Engine (HCMC Road Network)'
        };
      }

      openSet.splice(openSet.indexOf(current), 1);
      (adj[current] || []).forEach((neighbor) => {
        const tentativeG = gScore[current] + neighbor.dist;
        if (tentativeG < gScore[neighbor.to]) {
          cameFrom[neighbor.to] = current;
          gScore[neighbor.to] = tentativeG;
          fScore[neighbor.to] =
            tentativeG +
            MapApiService.haversineKm(
              NODES[neighbor.to].lat,
              NODES[neighbor.to].lng,
              NODES[destNode].lat,
              NODES[destNode].lng
            );
          if (!openSet.includes(neighbor.to)) {
            openSet.push(neighbor.to);
          }
        }
      });
    }

    // Direct fallback if no graph path found
    return {
      distance_km: MapApiService.haversineKm(origin.lat, origin.lng, destination.lat, destination.lng),
      duration_minutes: 8,
      polyline: [[origin.lat, origin.lng], [destination.lat, destination.lng]],
      algorithm: 'Haversine Direct Connector'
    };
  }

  // Unified calculateRoute: Real-time OSRM with A* Shortest Path Graph Fallback
  async calculateRoute(origin, destination, vehicleType = 'BIKE') {
    // 1. Try real-time OSRM OpenStreetMap routing first (Best road-accuracy)
    const osrmRes = await MapApiService.fetchOsrmRoute(origin, destination, vehicleType);
    if (osrmRes) return osrmRes;

    // 2. Fall back to internal A* Shortest Path Graph Engine on HCMC street network
    return MapApiService.aStarGraphRoute(origin, destination, vehicleType);
  }

  // Calculate real road approach route from driver to pickup location
  async calculateApproachRoute(driverPos, pickup, vehicleType = 'BIKE') {
    const route = await this.calculateRoute(driverPos, pickup, vehicleType);
    if (route && route.polyline) {
      return {
        ...route,
        polyline: MapApiService.resamplePolyline(route.polyline, 22)
      };
    }
    return route;
  }

  // Legacy synchronous fallback helper
  generateApproachRoute(driverPos, pickup, steps = 24) {
    const poly = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      poly.push([
        +(driverPos.lat + (pickup.lat - driverPos.lat) * t).toFixed(6),
        +(driverPos.lng + (pickup.lng - driverPos.lng) * t).toFixed(6)
      ]);
    }
    return poly;
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
