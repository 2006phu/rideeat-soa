# 🛵 Kế Hoạch Chi Tiết Dự Án SOA — App Đặt Xe & Giao Đồ Ăn
> **Nhóm:** 2–3 người | **Scope:** Full-stack (Backend + Web + Mobile)

---

## ✅ Công Nghệ Đã Chốt (đã cập nhật)

| Lớp | Công nghệ đã chọn | Lý do |
|---|---|---|
| **Backend** | FastAPI (Python) | Dễ học, tự sinh Swagger, hiệu năng cao |
| **Database** | PostgreSQL | Mạnh, hỗ trợ JSON, phổ biến |
| **Web Admin** | React.js | Cộng đồng lớn, nhiều thư viện |
| **Mobile** | React Native | Dùng chung JS với Web, nhanh |
| **Message Queue** | **Apache Kafka** | Event streaming mạnh, publish-subscribe |
| **Cache / Session** | Redis | Cache nhanh, lưu session, cart tạm |
| **API Gateway** | Nginx (reverse proxy) | Nhẹ, dễ cấu hình, SSL termination |
| **Bản đồ** | ~~Google Maps~~ → **OpenStreetMap + Nominatim** | ✅ Miễn phí hoàn toàn |
| **Auth** | **Firebase Authentication** | ✅ Email/password + Google Sign-In + JWT verify |
| **Push Notification** | **Firebase Cloud Messaging (FCM)** | Push đến iOS/Android |
| **File Storage** | **Firebase Storage** | Lưu ảnh avatar, GPLX, ảnh món ăn |
| **Thanh toán** | Mock Payment (giả lập) | Đủ dùng cho demo |
| **Deploy** | Docker + Docker Compose | Dễ cài, đủ demo |
| **Giao tiếp service** | REST API (JSON) | Phổ biến, dễ test bằng Swagger |
| **Realtime** | WebSocket (FastAPI) | Theo dõi xe/đơn hàng thời gian thực |
| **API Docs** | Swagger UI (tích hợp FastAPI) | Tự động sinh, không cần viết tay |
| **Monitoring** | Prometheus + Grafana | Giám sát health các service |
| **API Testing** | Postman + Newman | Test tự động các endpoint |

---

## 🔥 Công Nghệ Phức Tạp Từ Đề Cương — Áp Dụng Được Không?

> Dựa trên bảng công nghệ của giảng viên, đây là những gì **có thể tích hợp** vào dự án:

| STT | Công nghệ (từ đề cương) | Áp dụng vào đâu? | Độ khó | Ưu tiên |
|---|---|---|---|---|
| **Kafka** | Event bus: `ride.created`, `order.created`, `payment.done` → Notif Service | ⭐⭐⭐ | ✅ PHẢI LÀM |
| **Redis** | Cache menu, session, giỏ hàng, GPS driver (GEORADIUS) | ⭐⭐ | ✅ PHẢI LÀM |
| **Firebase Auth** | Đăng nhập Email/Password + Google Sign-In, verify JWT | ⭐⭐ | ✅ PHẢI LÀM |
| **Firebase Storage** | Upload ảnh avatar, ảnh món ăn, ảnh GPLX tài xế | ⭐ | ✅ PHẢI LÀM |
| **FCM (Firebase Cloud Messaging)** | Push notification đến tài xế khi có chuyến mới | ⭐⭐ | ✅ PHẢI LÀM |
| **OpenStreetMap + Nominatim** | Geocoding địa chỉ → toạ độ, tìm đường, tính khoảng cách | ⭐⭐ | ✅ PHẢI LÀM |
| **Docker Compose** | Đóng gói & chạy toàn bộ 9 service cùng lúc | ⭐⭐ | ✅ PHẢI LÀM |
| **Nginx Reverse Proxy** | API Gateway, SSL termination, load balancing | ⭐⭐ | ✅ PHẢI LÀM |
| **OpenAPI + Swagger** | Tự sinh từ FastAPI, docs cho từng service | ⭐ | ✅ PHẢI LÀM |
| **Postman + Newman** | Test automation toàn bộ API endpoint | ⭐⭐ | 🔵 NÊN LÀM |
| **Prometheus + Grafana** | Monitor CPU/RAM/request mỗi service, dashboard | ⭐⭐⭐ | 🔵 NÊN LÀM |
| **GitHub Actions** | CI/CD: tự động test + build Docker image khi push code | ⭐⭐⭐ | ✅ PHẢI LÀM |
| **ELK Stack** (Elasticsearch + Logstash + Kibana) | Centralized logging cho tất cả service | ⭐⭐⭐⭐ | ✅ PHẢI LÀM |
| **OpenTelemetry** | Distributed tracing — theo dõi request xuyên nhiều service | ⭐⭐⭐⭐ | ✅ PHẢI LÀM |
| **Google Gemini API** | Chatbot hỗ trợ khách hàng / gợi ý món ăn bằng AI | ⭐⭐⭐ | ✅ PHẢI LÀM |
| **QR Code** | Mã QR xác nhận lên xe / nhận đơn hàng | ⭐ | ✅ PHẢI LÀM |

---

## 🏗️ Kiến Trúc Tổng Thể (SOA — đã cập nhật)

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│      React Native (Mobile)          React.js (Web Admin)         │
└─────────────────────┬───────────────────────────┬────────────────┘
                      │ HTTP / WebSocket           │
┌─────────────────────▼───────────────────────────▼────────────────┐
│               API GATEWAY — Nginx Reverse Proxy                  │
│    Rate Limiting | SSL | Route đến đúng service                  │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
 [1]    [2]    [3]    [4]    [5]    [6]    [7]    [8]
Auth   User   Ride   Food   Map   Payment  Promo  Notif
Svc    Svc    Svc    Svc    Svc    Svc     Svc    Svc
(Firebase)         (WS)   (WS)  (OSM)

              ▼ Apache Kafka (Event Bus) ▲
  Ride Svc ──► [ride.created]    ──► Notif Svc (FCM)
  Ride Svc ──► [ride.completed]  ──► Payment Svc
  Food Svc ──► [order.created]   ──► Notif Svc (FCM)
  Food Svc ──► [order.completed] ──► Payment Svc
  Payment  ──► [payment.success] ──► Notif Svc (FCM)
  User Svc ──► [driver.approved] ──► Notif Svc (FCM)

┌──────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  PostgreSQL (mỗi service 1 schema riêng)                        │
│  Redis (cache, session, GPS GEORADIUS, cart)                    │
│  Firebase Storage (ảnh avatar, ảnh món, GPLX)                  │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│                     OBSERVABILITY LAYER                          │
│  Prometheus + Grafana (metrics)   Swagger UI (API docs)         │
│  Postman / Newman (API testing)                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📋 Bảng Nghiệp Vụ Chi Tiết — Công Nghệ & Thiết Kế

---

### 🔐 NV1 — Xác Thực & Quản Lý Tài Khoản
**Service:** `auth-service` | **Port:** `8001` | **Dùng Firebase Authentication**

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Đăng ký Email/Password | **Firebase Auth** (createUserWithEmailAndPassword) | Firebase quản lý, không lưu password trong DB |
| Đăng nhập Email/Password | **Firebase Auth** (signInWithEmailAndPassword) | Trả về Firebase ID Token |
| Đăng nhập Google | **Firebase Auth** + Google Sign-In | OAuth flow qua Firebase, không cần authlib |
| Xác thực OTP | **Firebase Auth** (Phone Auth) | Xác minh SĐT qua SMS tự động |
| Verify token ở Backend | `firebase-admin` SDK (Python) | FastAPI middleware verify Firebase ID Token |
| Phân quyền (RBAC) | FastAPI Dependency + PostgreSQL | Lưu `role` vào DB sau khi xác thực Firebase |
| Khoá tài khoản | Firebase Admin SDK `disable_user()` + DB flag | Admin gọi API → Firebase vô hiệu hoá |

**Luồng xác thực với Firebase:**
```
Mobile/Web → Firebase SDK đăng nhập
  → Firebase trả về ID Token (JWT)
  → Client gửi ID Token trong header: Authorization: Bearer <token>
  → Nginx chuyển đến service
  → FastAPI middleware: firebase_admin.verify_id_token(token)
  → Nếu valid → xử lý request
  → Nếu invalid → 401 Unauthorized
```

**Thiết kế DB:**
```sql
Table: users
- id UUID (= Firebase UID)
- email / phone (UNIQUE)
- role ENUM('customer','driver','restaurant','admin')
- is_active BOOLEAN
- created_at TIMESTAMP
-- Không lưu password (Firebase quản lý)
```

---

### 👤 NV2 — Quản Lý Hồ Sơ Người Dùng
**Service:** `user-service` | **Port:** `8002`

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Xem/cập nhật hồ sơ | FastAPI + PostgreSQL | Middleware verify Firebase token |
| Upload ảnh đại diện | **Firebase Storage** | Client upload thẳng lên Firebase Storage, lưu URL vào DB |
| Quản lý địa chỉ | PostgreSQL (bảng `addresses`) | Hỗ trợ nhiều địa chỉ / user |
| Đăng ký làm tài xế | FastAPI + **Firebase Storage** | Upload GPLX, CMND → Firebase Storage → DB lưu URL |
| Admin duyệt tài xế | PostgreSQL + **Kafka** event | Publish `driver.approved` → Notif Service |
| Đăng ký nhà hàng đối tác | FastAPI + PostgreSQL | Upload ảnh quán qua Firebase Storage |
| **QR Code xác nhận xe** | Python `qrcode` library | Sinh QR = `ride_id`, tài xế scan để bắt đầu chuyến |

**Thiết kế DB:**
```sql
Table: driver_profiles
- user_id (FK = Firebase UID)
- vehicle_type ENUM('motorbike','car4','car7')
- license_plate, license_image_url (Firebase Storage URL)
- status ENUM('pending','approved','rejected')

Table: addresses
- id, user_id, label, lat, lng, full_address
```

---

### 🚗 NV3 — Đặt Xe (Ride Service)
**Service:** `ride-service` | **Port:** `8003`

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Chọn loại xe & tính giá | FastAPI + **OpenStreetMap OSRM** | Tính khoảng cách + thời gian, giá = km × đơn giá |
| Đặt xe ngay | FastAPI + **Redis Geo** | Tìm tài xế online gần nhất trong 5km |
| Đặt xe theo lịch | FastAPI + PostgreSQL | Lưu `scheduled_at`, cron job nhắc |
| Theo dõi thời gian thực | **WebSocket** (FastAPI) | Tài xế push GPS mỗi 3 giây → khách nhận |
| Xác nhận lên xe | **QR Code** / OTP 4 số | Khách scan QR hoặc đọc mã OTP |
| Huỷ chuyến | FastAPI + **Kafka** | Publish `ride.cancelled` → Notif Service |
| Hoàn tất chuyến | FastAPI + **Kafka** | Publish `ride.completed` → Payment Service |
| Chia sẻ hành trình | FastAPI + WebSocket | Tạo link chia sẻ public, người thân theo dõi |

**Kafka Topics:**
```
ride.created    → Notif Service (FCM đến tài xế)
ride.accepted   → Notif Service (FCM đến khách)
ride.completed  → Payment Service
ride.cancelled  → Notif Service
```

**Thiết kế DB:**
```sql
Table: rides
- id (UUID), customer_id, driver_id
- pickup_lat, pickup_lng, pickup_address
- dropoff_lat, dropoff_lng, dropoff_address
- vehicle_type, estimated_price, final_price
- status ENUM('searching','accepted','in_progress','completed','cancelled')
- scheduled_at TIMESTAMP (NULL = đặt ngay)
- qr_code_url (Firebase Storage), created_at
```

---

### 🍔 NV4 — Đặt Đồ Ăn (Food Service)
**Service:** `food-service` | **Port:** `8004`

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Tìm nhà hàng theo vị trí | FastAPI + **OpenStreetMap Nominatim** + PostgreSQL | Tìm nhà hàng trong bán kính, sort theo khoảng cách |
| Xem thực đơn | FastAPI + **Redis cache** | Cache menu 10 phút |
| Giỏ hàng | **Redis** (Hash, TTL 30 phút) | Không lưu DB, expire tự động |
| Đặt đơn | FastAPI + PostgreSQL + **Kafka** | Publish `order.created` → Nhà hàng + Notif |
| Nhà hàng xác nhận | **WebSocket** + Kafka | Realtime đến nhà hàng |
| Ghép tài xế giao hàng | Kafka consumer + **Redis Geo** | Tương tự Ride Service |
| Theo dõi đơn realtime | **WebSocket** | Trạng thái: nấu → lấy hàng → đang giao |
| Hoàn tất giao | FastAPI + **Kafka** | Publish `order.completed` → Payment |

**Kafka Topics:**
```
order.created    → Notif Service (FCM đến nhà hàng)
order.confirmed  → Notif Service (FCM đến khách)
order.completed  → Payment Service
order.cancelled  → Notif Service + Payment (refund)
```

**Thiết kế DB:**
```sql
Table: restaurants
- id, user_id, name, address, lat, lng
- open_time, close_time, is_open BOOLEAN
- banner_url (Firebase Storage URL)

Table: menu_items
- id, restaurant_id, name, description, price
- image_url (Firebase Storage), category, is_available

Table: orders
- id, customer_id, restaurant_id, driver_id
- items JSONB [{item_id, name, qty, price}]
- subtotal, delivery_fee, discount, total
- delivery_address, status, created_at
```

---

### 🗺️ NV5 — Bản Đồ & Định Tuyến (Map Service)
**Service:** `map-service` | **Port:** `8005` | **✅ Miễn phí hoàn toàn**

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Geocoding (địa chỉ → toạ độ) | **Nominatim API** (OpenStreetMap) | `https://nominatim.openstreetmap.org/search` |
| Reverse Geocoding (toạ độ → địa chỉ) | **Nominatim API** | `https://nominatim.openstreetmap.org/reverse` |
| Tính khoảng cách & thời gian | **OSRM API** (Open Source Routing Machine) | `https://router.project-osrm.org` miễn phí |
| Vẽ tuyến đường | **Leaflet.js** (frontend) + OSRM | Render bản đồ OpenStreetMap trên app |
| Cập nhật GPS tài xế | **Redis Geo** (GEOADD) | Tài xế push toạ độ mỗi 3 giây |
| Tìm tài xế gần nhất | **Redis GEORADIUS** | Bán kính 5km, sắp xếp theo khoảng cách |

> **Lưu ý:** Nominatim + OSRM hoàn toàn miễn phí, không cần billing account hay thẻ quốc tế.

---

### 💳 NV6 — Thanh Toán (Payment Service)
**Service:** `payment-service` | **Port:** `8006`

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Tạo giao dịch | FastAPI + PostgreSQL + **Kafka consumer** | Nhận event `ride.completed` / `order.completed` |
| Thanh toán tiền mặt | Cập nhật `status = cash_paid` | Không xử lý thêm |
| Thanh toán ví nội bộ | PostgreSQL (bảng `wallets`) | Atomic transaction tránh race condition |
| Mock Payment Gateway | FastAPI giả lập | Random 90% success, 10% failed cho demo |
| Nạp tiền ví | FastAPI + Mock | Cộng số dư, publish `wallet.topup` → Notif |
| Rút tiền (tài xế) | FastAPI + PostgreSQL | Trừ ví, ghi lịch sử |
| Hoàn tiền | FastAPI + Kafka | Publish `payment.refunded` → Notif |
| Xuất hoá đơn PDF | Python `reportlab` | Sinh PDF gửi qua email |

**Thiết kế DB:**
```sql
Table: wallets
- user_id (UNIQUE), balance DECIMAL, updated_at

Table: transactions
- id, user_id, reference_id (ride_id hoặc order_id)
- type ENUM('payment','refund','topup','withdraw')
- method ENUM('cash','wallet','mock_gateway')
- amount, status ENUM('pending','success','failed')
- created_at
```

---

### 🏪 NV7 — Nhà Hàng & Menu (tích hợp trong Food Service)

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Đăng ký nhà hàng | FastAPI + PostgreSQL | Admin duyệt |
| Upload ảnh bìa & menu | **Firebase Storage** | Client upload trực tiếp, lưu URL |
| Bật/tắt nhận đơn | Redis cache flag + PostgreSQL | Cập nhật real-time |
| Xử lý đơn đến | **Kafka consumer** + WebSocket | Nhà hàng nhận ngay khi có đơn |
| Thống kê doanh thu | PostgreSQL `GROUP BY` | Theo ngày/tháng |

---

### ⭐ NV8 — Đánh Giá & Phản Hồi (Rating Service)
**Service:** `rating-service` | **Port:** `8007`

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Đánh giá tài xế | FastAPI + PostgreSQL | Chỉ mở sau `ride.completed` |
| Đánh giá nhà hàng & món | FastAPI + PostgreSQL | Chỉ mở sau `order.completed` |
| Tính điểm trung bình | PostgreSQL `AVG()` + **Redis cache** | Cache 1 giờ, reset khi có review mới |
| Upload ảnh kèm review | **Firebase Storage** | Ảnh thực tế món ăn |

---

### 🎁 NV9 — Khuyến Mãi & Voucher (Promotion Service)
**Service:** `promo-service` | **Port:** `8008`

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Tạo mã voucher | FastAPI + PostgreSQL | Admin tạo: % hoặc số tiền cố định |
| Áp dụng voucher | FastAPI + **Redis** | Check Redis cache, validate điều kiện |
| Flash Sale | **Redis TTL** | Voucher tự hết hạn theo TTL |
| Tích điểm loyalty | PostgreSQL | +1 điểm / 10.000đ chi tiêu |

---

### 🔔 NV10 — Thông Báo (Notification Service)
**Service:** `notification-service` | **Port:** `8009` | **Kafka Consumer**

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Push Notification | **Firebase Cloud Messaging (FCM)** | Gửi đến iOS/Android qua device token |
| In-app realtime | **WebSocket** | Hiện thông báo ngay trong app |
| Email | **Gmail SMTP** (smtplib Python) | Hoá đơn, xác nhận đăng ký |
| **Kafka consumer topics:** | | |
| `ride.created` | FCM → Tài xế | "Có chuyến mới gần bạn!" |
| `ride.accepted` | FCM → Khách | "Tài xế đang đến!" |
| `order.created` | FCM → Nhà hàng | "Bạn có đơn hàng mới!" |
| `order.confirmed` | FCM → Khách | "Nhà hàng đang nấu!" |
| `payment.success` | FCM → Khách | "Thanh toán thành công!" |
| `driver.approved` | FCM → Tài xế | "Tài khoản tài xế đã được duyệt!" |

---

### 📊 NV11 — Báo Cáo & Monitoring
**Công nghệ: Prometheus + Grafana + Swagger**

| Chức năng | Công nghệ / Kỹ thuật | Ghi chú |
|---|---|---|
| Dashboard Admin | React.js + **Recharts** | Gọi API từng service |
| Thống kê chuyến xe & đơn | PostgreSQL `GROUP BY DATE_TRUNC` | Theo ngày/tuần/tháng |
| **Metrics từng service** | **Prometheus** (`prometheus_fastapi_instrumentator`) | Tự động expose `/metrics` |
| **Dashboard hệ thống** | **Grafana** | Visualize CPU, RAM, request/s, error rate |
| **API Documentation** | **Swagger UI** (FastAPI tự sinh) | Mỗi service có `/docs` riêng |
| **API Testing tự động** | **Postman Collection + Newman** | Chạy test suite trước khi demo |
| Xuất báo cáo PDF | Python `reportlab` | PDF doanh thu, hoá đơn |

---

## 🗂️ Cấu Trúc Project

```
rideeat-soa/
├── docker-compose.yml           # Khởi động toàn bộ hệ thống
├── nginx/
│   └── nginx.conf               # API Gateway, reverse proxy, SSL
├── services/
│   ├── auth-service/            # FastAPI + Firebase Admin SDK
│   ├── user-service/            # FastAPI + Firebase Storage
│   ├── ride-service/            # FastAPI + WebSocket + Kafka
│   ├── food-service/            # FastAPI + WebSocket + Kafka
│   ├── map-service/             # FastAPI + Nominatim + OSRM + Redis Geo
│   ├── payment-service/         # FastAPI + Kafka consumer
│   ├── rating-service/          # FastAPI
│   ├── promo-service/           # FastAPI + Redis
│   └── notification-service/   # FastAPI + Kafka consumer + FCM
├── web-admin/                   # React.js + Recharts
├── mobile-app/                  # React Native + Leaflet
├── monitoring/
│   ├── prometheus.yml           # Config scrape targets
│   └── grafana/                 # Dashboard JSON
├── postman/
│   └── rideeat-collection.json  # Postman test collection
└── docs/
    └── api-contracts/           # Swagger export từng service
```

---

## 📅 Kế Hoạch Phân Công (Nhóm 2–3 người)

| Tuần | Người 1 | Người 2 | Người 3 (nếu có) |
|---|---|---|---|
| **1–2** | Auth Service (Firebase) + Docker setup | Thiết kế DB toàn hệ thống + Kafka setup | UI/UX (Figma) + React Native base |
| **3–4** | Ride Service + Map Service (OSM/OSRM) | Food Service + Restaurant Module | Web Admin (React) + Nginx config |
| **5–6** | Payment Service + Kafka consumer | Notification Service (FCM + Kafka) | Mobile App screens (đặt xe, đồ ăn) |
| **7** | Rating + Promo Service | Prometheus + Grafana setup | Postman collection + hoàn thiện UI |
| **8** | Bug fix + Demo prep | Tài liệu SRS/SDD + Swagger export | Báo cáo + slide thuyết trình |

---

## 🔑 Điểm SOA Cần Nhấn Mạnh Khi Báo Cáo

| Nguyên tắc SOA | Thể hiện trong dự án |
|---|---|
| **Loose Coupling** | Mỗi service DB schema riêng, không gọi trực tiếp DB nhau |
| **Service Reusability** | `notification-service` + `map-service` dùng chung cho cả ride & food |
| **Interoperability** | REST API + JSON chuẩn, Swagger UI tự sinh cho mỗi service |
| **Service Composability** | Flow đặt xe = Ride + Map + Payment + Notification phối hợp |
| **Event-Driven Async** | Kafka: service publish event, không chờ response |
| **API Gateway** | Nginx: một điểm vào duy nhất, xác thực tập trung |
| **Scalability** | Scale riêng `ride-service` vào giờ cao điểm |
| **Observability** | Prometheus + Grafana giám sát health từng service |

---

## ❓ Câu Hỏi Còn Lại Cần Hỏi Giảng Viên

> [!IMPORTANT]
> - Yêu cầu tối thiểu bao nhiêu service?
> - Có cần tài liệu SRS / SDD không?
> - Cách chấm điểm: kiến trúc (%), tính năng (%), báo cáo (%)?
> - Có điểm cộng khi tích hợp công nghệ nâng cao (Kafka, Prometheus, Firebase)?
