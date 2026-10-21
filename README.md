# 🚀 RideEat Super-App — Hệ Thống Đặt Xe Công Nghệ, Giao Đồ Ăn & Ví Điện Tử (SOA + Deep OOP)

![Architecture](https://img.shields.io/badge/Architecture-SOA%209%20Microservices-10b981?style=for-the-badge)
![OOP](https://img.shields.io/badge/Paradigm-Strict%20OOP%20%2B%20DDD%20%2B%20SOLID-3b82f6?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-f59e0b?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Leaflet%20OSM-8b5cf6?style=for-the-badge)

**RideEat** là dự án cuối kỳ môn **Kiến Trúc Hướng Dịch Vụ (Service-Oriented Architecture - SOA)** được xây dựng kết hợp sâu sắc với **Lập Trình Hướng Đối Tượng (Object-Oriented Programming - OOP)**. Hệ thống mô phỏng trọn vẹn một siêu ứng dụng thực tế tương tự Grab / Be / ShopeeFood với **9 Microservices độc lập**, **Nginx API Gateway**, **Apache Kafka Event Bus**, **Redis Geo-Spatial & Cart Cache**, **PostgreSQL Multi-Schema**, **Prometheus + Grafana Observability** và **Giao diện Web Super-App trực quan**.

---

## 🌟 Điểm Nổi Bật Của Dự Án (Key Highlights)

1. **9 Microservices Độc Lập (Bounded Contexts chuẩn SOA):**
   - `auth-service (:8001)` — Xác thực đa chiến lược (JWT, OTP, Refresh Token) & Phân quyền RBAC.
   - `user-service (:8002)` — Hồ sơ người dùng đa hình (`CustomerProfile`, `DriverProfile`, `MerchantProfile`) & Duyệt KYC tài xế.
   - `ride-service (:8003)` — Đặt xe công nghệ, Tính giá đa hình (`Bike`, `Car 4`, `Car 7`, `Luxury`), Máy trạng thái chuyến đi & Xác thực QR/OTP 6 số.
   - `food-service (:8004)` — Nhà hàng, Thực đơn cấu trúc cây (`Composite Pattern`), Giỏ hàng Redis, Theo dõi đơn hàng & **AI Food Recommender**.
   - `map-service (:8005)` — Định tuyến Haversine + Hệ số giao thông đô thị, Tính ETA, Tạo Polyline bản đồ & Tìm tài xế gần nhất theo bán kính.
   - `payment-service (:8006)` — Ví điện tử đóng gói (`Wallet.__balance`), Thanh toán đa cổng (`Wallet`, `VNPay`, `MoMo`, `Cash`), Hóa đơn điện tử & Hoàn tiền tự động (Saga).
   - `rating-service (:8007)` — Đánh giá 5 sao đa hình & Tính điểm uy tín trung bình có trọng số Bayes (`BayesianWeightedAverageStrategy`).
   - `promo-service (:8008)` — Chiến dịch khuyến mãi, Chiến lược tính giảm giá & Chuỗi quy tắc kiểm duyệt (`Specification Pattern`).
   - `notification-service (:8009)` — Tiêu thụ sự kiện Kafka & Đẩy thông báo đa kênh thời gian thực (`WebSocket`, `Email`, `SMS`).
2. **Thiết Kế Hướng Đối Tượng (OOP) Từ Core Framework Đến Frontend:**
   - Gói thư viện lõi `services/shared/` cung cấp đầy đủ `BaseEntity`, `AggregateRoot`, `ValueObject`, `DomainEvent`, `IRepository[T]`, `BaseController`, `CircuitBreaker`, `ServiceRegistry`.
   - Giao diện `web-admin` được kiến trúc theo lớp OOP (`BaseApiClient` và 7 lớp dịch vụ con) tích hợp cơ chế **Automatic Demo Simulation Fallback** giúp giao diện luôn hoạt động mượt mà ngay cả khi chạy độc lập.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
rideeat-soa/
├── docker-compose.yml              # Orchestration cho toàn bộ 15 containers (Infra + 9 Services + Gateway + UI + Monitoring)
├── .env.example                    # Biến môi trường mẫu
├── nginx/
│   └── nginx.conf                  # Cấu hình Nginx API Gateway (:8080), Rate Limiting & WebSocket Upgrade
├── monitoring/
│   ├── init-db.sql                 # Khởi tạo 9 PostgreSQL Schemas độc lập cho 9 Microservices
│   ├── prometheus.yml              # Cấu hình Prometheus thu thập metrics mỗi 10s
│   └── grafana-dashboard.json      # Bảng điều khiển Grafana giám sát toàn hệ thống
├── postman/
│   └── rideeat-collection.json     # Bộ kiểm thử Postman v2.1 cho cả 9 dịch vụ kèm kịch bản pm.test()
├── .github/workflows/
│   └── ci-cd.yml                   # Pipeline CI/CD tự động kiểm tra Lint, Build React, Docker Compose & Newman
├── docs/
│   └── OOP_SOA_ARCHITECTURE.md     # Tài liệu phân tích chuyên sâu 4 trụ cột OOP, SOLID & 7 Design Patterns
├── services/                       # Mã nguồn Backend Python FastAPI của 9 Microservices & Shared OOP Kernel
│   ├── shared/                     # Core OOP Domain, Repository, EventBus, Resilience, Security
│   ├── auth-service/               # Port 8001
│   ├── user-service/               # Port 8002
│   ├── ride-service/               # Port 8003
│   ├── food-service/               # Port 8004
│   ├── map-service/                # Port 8005
│   ├── payment-service/            # Port 8006
│   ├── rating-service/             # Port 8007
│   ├── promo-service/              # Port 8008
│   └── notification-service/       # Port 8009
└── web-admin/                      # Ứng dụng Frontend React 18 + Vite + Leaflet OpenStreetMap (:3000)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Hệ Thống

### Cách 1: Chạy Toàn Bộ Hệ Sinh Thái Bằng Docker Compose (Khuyên dùng)

```bash
# Bước 1: Di chuyển vào thư mục dự án
cd rideeat-soa

# Bước 2: Khởi tạo file cấu hình môi trường
cp .env.example .env

# Bước 3: Khởi chạy toàn bộ 9 Microservices, API Gateway, Web Admin, DB, Kafka & Monitoring
docker compose up --build -d
```

Sau khi khởi chạy thành công, truy cập các cổng dịch vụ:
- 🌐 **Giao diện Siêu Ứng Dụng & Quản Trị (`web-admin`)**: [http://localhost:3000](http://localhost:3000)
- 🛡️ **Nginx API Gateway**: [http://localhost:8080/health](http://localhost:8080/health)
- 📈 **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
- 📊 **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) *(Tài khoản: `admin` / `rideeat_admin`)*
- 📘 **Swagger UI của từng Microservice**: `http://localhost:8001/docs` đến `http://localhost:8009/docs`

### Cách 2: Chạy Nhanh Giao Diện Web Admin (Chế Độ Interactive Demo & Live Hybrid)

```bash
cd rideeat-soa/web-admin
npm install
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để trải nghiệm đầy đủ 5 phân hệ:
1. **🛵 Đặt Xe & Bản Đồ GPS**: Chọn điểm đón/đến tại TP.HCM, xem đường đi trên OpenStreetMap, so sánh giá đa hình giữa 4 dòng xe, bật/tắt phụ phí trời mưa/giờ cao điểm/bảo hiểm, nhận mã QR & OTP 6 số.
2. **🍔 Đặt Đồ Ăn & AI Gợi Ý**: Khám phá thực đơn Composite, nhận gợi ý món ăn bằng AI theo thời tiết & khung giờ, thêm giỏ hàng, áp mã Voucher và theo dõi tiến trình giao hàng.
3. **💳 Ví & Thanh Toán**: Nạp tiền vào Ví đóng gói `WalletEntity`, chuyển đổi chiến lược thanh toán (`Wallet`, `VNPay`, `MoMo`, `Cash`) và xem Hóa đơn điện tử.
4. **👨‍✈️ Cổng Tài Xế & Nhà Hàng**: Duyệt KYC tài xế, bật trạng thái trực tuyến, nhập mã OTP 6 số để xác thực đón khách và cập nhật điểm uy tín Bayesian.
5. **📊 Giám Sát SOA & OOP**: Theo dõi trạng thái 9 Microservices, luồng sự kiện Apache Kafka trực tiếp và ma trận kiến trúc OOP.

---

## 🧪 Kiểm Thử API Với Postman / Newman

Import file `postman/rideeat-collection.json` vào Postman hoặc chạy tự động bằng Newman CLI:

```bash
npx newman run postman/rideeat-collection.json
```

Xem chi tiết phân tích kiến trúc OOP & SOA tại: [docs/OOP_SOA_ARCHITECTURE.md](./docs/OOP_SOA_ARCHITECTURE.md).
