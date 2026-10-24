# 🚀 RideEat Super-App — Hệ Thống Đặt Xe Công Nghệ, Giao Đồ Ăn & Ví Điện Tử (SOA + Strict OOP)

![Architecture](https://img.shields.io/badge/Architecture-SOA%209%20Microservices-10b981?style=for-the-badge)
![OOP](https://img.shields.io/badge/Paradigm-Strict%20OOP%20%2B%20DDD%20%2B%20SOLID-3b82f6?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-f59e0b?style=for-the-badge)
![Kafka](https://img.shields.io/badge/Message_Broker-Apache%20Kafka%20KRaft-red?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Google%20OAuth2%20%2B%20JWT%20RBAC-orange?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20GitHub%20Pages-8b5cf6?style=for-the-badge)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions%20100%25%20Green-success?style=for-the-badge)

**RideEat** là hệ thống siêu ứng dụng phục vụ đồ án môn **Kiến Trúc Hướng Dịch Vụ (Service-Oriented Architecture - SOA)** kết hợp **Lập Trình Hướng Đối Tượng (Object-Oriented Programming - OOP & SOLID)**. Hệ thống mô phỏng một nền tảng vận tải và giao đồ ăn công nghệ hoàn chỉnh tương tự Grab / Be với **9 Microservices độc lập**, **Nginx API Gateway**, **Apache Kafka Event Streaming (KRaft)**, **Redis 7 (Cache & Geo Spatial)**, **PostgreSQL (Multi-Schema)**, **Google OAuth2 Backend Token Exchange** và **Giao diện Web Super-App React 18** đã triển khai tự động lên **GitHub Pages**.

🔗 **Trang Web Trực Tuyến Live:** [https://2006phu.github.io/rideeat-soa/](https://2006phu.github.io/rideeat-soa/)

---

## 🌟 Điểm Nổi Bật Của Hệ Thống

1. **9 Microservices Độc Lập (Chuẩn Bounded Contexts SOA):**
   - 🔐 `auth-service (:8001)` — Xác thực PBKDF2-HMAC-SHA256, Google OAuth2 Backend Token Exchange (`/api/auth/google/exchange`), Refresh Token Rotation, RBAC 4 vai trò.
   - 👤 `user-service (:8002)` — Quản lý hồ sơ người dùng đa hình (`CustomerProfile`, `DriverProfile`, `MerchantProfile`), định danh KYC và tạo mã QR xác thực.
   - 🛵 `ride-service (:8003)` — Đặt xe công nghệ, Tính giá đa hình (Xe máy, 4 chỗ, 7 chỗ, VIP Limousine), máy trạng thái hữu hạn FSM (`searching` $\rightarrow$ `accepted` $\rightarrow$ `in_progress` $\rightarrow$ `completed`) & xác thực OTP/QR.
   - 🍔 `food-service (:8004)` — Danh mục quán ăn, thực đơn Composite, Giỏ hàng Redis, máy trạng thái FSM đơn hàng (`pending` $\rightarrow$ `confirmed` $\rightarrow$ `preparing` $\rightarrow$ `delivering` $\rightarrow$ `completed`).
   - 🗺️ `map-service (:8005)` — Định tuyến đường đi thực tế, tính cước theo khoảng cách & ETA qua OSRM và công thức Haversine, tra cứu địa danh Landmark fallback.
   - 💳 `payment-service (:8006)` — Ví điện tử đóng gói bảo mật (`Wallet.balance`), sổ cái giao dịch, Factory 5 cổng thanh toán (`WALLET`, `VNPAY`, `MOMO`, `CREDIT_CARD`, `CASH`), xuất hóa đơn điện tử VAT 8%.
   - ⭐ `rating-service (:8007)` — Đánh giá chất lượng 1..5 sao có kiểm soát biến bất biến, tính điểm uy tín tài xế và quán ăn theo thuật toán Bayesian có trọng số, cache Redis.
   - 🎟️ `promo-service (:8008)` — Quản lý mã giảm giá đa hình (`PercentageDiscountStrategy` kèm chặn trần, `FixedAmountDiscountStrategy`), hệ thống thăng hạng khách hàng thân thiết Loyalty Tier (Bronze, Silver, Gold, Platinum).
   - 🔔 `notification-service (:8009)` — Lắng nghe sự kiện Kafka thời gian thực và đẩy thông báo đa kênh qua Composite Dispatcher (WebSocket, FCM Push, SMTP Email).

2. **Kiến Trúc OOP & SOLID Toàn Diện (Không Rò Rỉ API Key / Không AI-Slop):**
   - **4 Trụ cột OOP**: Đóng gói (Encapsulation), Kế thừa (Inheritance), Đa hình (Polymorphism), Trừu tượng (Abstraction).
   - **Mẫu Thiết Kế (Design Patterns)**: Strategy, Factory, Decorator, Adapter, Composite, Observer, State Machine.
   - **Bảo Mật Phía Client**: Không bao giờ để lộ private keys hay hiển thị popup đòi API key ở trình duyệt. Mọi xác thực Google đều đi qua Backend Token Exchange an toàn.
   - **Anti-AI-Slop UI**: Thiết kế tinh giản, hiện đại theo phong cách Vercel / Linear với bảng màu Slate/Zinc trung tính và điểm nhấn Emerald Green sắc nét.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
rideeat-soa/
├── docker-compose.yml              # Điều phối 15 containers (Postgres, Redis, Kafka, 9 Services, Gateway, UI, Prometheus, Grafana)
├── .env.example                    # File mẫu cấu hình biến môi trường
├── config/
│   └── firebase/
│       ├── serviceAccountKey.json  # File chứng thư bảo mật Firebase Admin SDK backend
│       └── serviceAccountKey.example.json
├── nginx/
│   └── nginx.conf                  # Cấu hình Nginx API Gateway (:8080), Rate Limiting & WebSocket Proxy
├── monitoring/
│   ├── init-db.sql                 # Script SQL khởi tạo 9 schema độc lập trong PostgreSQL
│   ├── prometheus.yml              # Thu thập metrics từ 9 service mỗi 10s
│   └── grafana-dashboard.json      # Bảng điều khiển Grafana giám sát hiệu năng
├── postman/
│   └── rideeat-collection.json     # Bộ kiểm thử tự động Postman v2.1 cho 9 Microservices
├── scripts/
│   ├── setup-wizard.ps1            # 🚀 Interactive Setup Wizard (PowerShell cho Windows)
│   ├── setup-wizard.sh             # 🚀 Interactive Setup Wizard (Bash cho Linux/macOS/WSL)
│   └── start_ngrok.ps1             # Script mở cổng API Gateway ra Internet
├── services/                       # Mã nguồn Backend 9 Microservices & Thư viện OOP Core
│   ├── common/                     # OOP Kernel: Contracts, Base Service, Repository, Kafka Bus, Redis, Security
│   ├── auth-service/               # Port 8001
│   ├── user-service/               # Port 8002
│   ├── ride-service/               # Port 8003
│   ├── food-service/               # Port 8004
│   ├── map-service/                # Port 8005
│   ├── payment-service/            # Port 8006
│   ├── rating-service/             # Port 8007
│   ├── promo-service/              # Port 8008
│   └── notification-service/       # Port 8009
├── tests/                          # Bộ kiểm thử tự động toàn diện (31 tests)
│   ├── test_oop_core.py            # Test Runner tổng hợp
│   ├── test_auth_service.py        # Kiểm thử Xác thực & Phân quyền RBAC
│   ├── test_domain_services.py     # Kiểm thử Nghiệp vụ lõi Ride, Food, Map
│   └── test_integration_services.py # Kiểm thử Tích hợp Payment, Promo, Rating, Notification
└── web-admin/                      # Giao diện Super-App React 18 + Vite (:3000)
```

---

## ⚡ Hướng Dẫn Khởi Chạy Nhanh (1-Click Setup Wizard)

### Cách 1: Sử dụng Interactive Setup Wizard (Khuyên Dùng)

#### Trên Windows (PowerShell):
```powershell
.\scripts\setup-wizard.ps1
```

#### Trên Linux / macOS / WSL (Bash):
```bash
chmod +x ./scripts/setup-wizard.sh
./scripts/setup-wizard.sh
```

Menu Wizard sẽ hướng dẫn bạn từng bước:
1. `[1]` Khởi chạy toàn bộ hệ thống bằng Docker Compose (9 services + Postgres + Redis + Kafka + Web Admin).
2. `[2]` Chạy toàn bộ 31 bài kiểm thử tự động (OOP Core & Domain Architecture).
3. `[3]` Khởi chạy môi trường phát triển Frontend Web Admin (React Vite).
4. `[4]` Mở ứng dụng Live trên GitHub Pages.
5. `[5]` Kiểm tra cú pháp Docker Compose & Postman Collection.
6. `[6]` Dọn dẹp & dừng toàn bộ containers.

---

### Cách 2: Chạy Thủ Công Bằng Docker Compose

1. **Chuẩn bị cấu hình:**
   ```bash
   cp .env.example .env
   ```
2. **Khởi động toàn bộ cụm dịch vụ:**
   ```bash
   docker compose up --build -d
   ```
3. **Địa chỉ truy cập các thành phần:**
   - 🌐 **Web Super-App Dashboard:** [http://localhost:3000](http://localhost:3000)
   - 🚪 **Nginx API Gateway:** [http://localhost:8080/health](http://localhost:8080/health)
   - 📈 **Prometheus Metrics:** [http://localhost:9090](http://localhost:9090)
   - 📊 **Grafana Monitoring:** [http://localhost:3001](http://localhost:3001) *(Tài khoản: `admin` / `rideeat_admin`)*
   - 🔐 **Swagger UI Auth Service:** [http://localhost:8001/docs](http://localhost:8001/docs)
   - 🛵 **Swagger UI Ride Service:** [http://localhost:8003/docs](http://localhost:8003/docs)
   - 🍔 **Swagger UI Food Service:** [http://localhost:8004/docs](http://localhost:8004/docs)
   - 💳 **Swagger UI Payment Service:** [http://localhost:8006/docs](http://localhost:8006/docs)

---

## 🧪 Kiểm Thử Tự Động (Automated Verification)

### 1. Bộ Kiểm Thử Kiến Trúc OOP & Nghiệp Vụ (Python)
Chạy bộ kiểm thử tự động bao quát toàn bộ 9 microservices:
```bash
python tests/test_oop_core.py -v
```
*Kết quả: **31/31 tests PASS (100%)** trong ~2.1 giây.*

### 2. Kiểm Thử API Bằng Postman Newman CLI
Bộ sưu tập API chuẩn Postman v2.1 tích hợp kiểm tra mã trạng thái HTTP, hợp đồng dữ liệu JSON và lưu trữ JWT token tự động:
```bash
npx newman run postman/rideeat-collection.json
```

---

## 🌐 Triển Khai Trực Tuyến & CI/CD Pipeline

Hệ thống được cấu hình **GitHub Actions Workflow** tự động chạy kiểm thử và triển khai mỗi khi có commit lên nhánh `main`:
- 🧪 **Job 1 (Backend OOP Tests):** Chạy linting và 31 unit tests trên Python 3.11.
- ⚛️ **Job 2 (Web Admin Build):** Đóng gói mã nguồn React 18 / Vite thành production bundle.
- 🐳 **Job 3 (Docker & Postman Verification):** Xác thực cú pháp `docker-compose.yml` và schema `postman/rideeat-collection.json`.
- 🚀 **Job 4 (GitHub Pages Deployment):** Tự động deploy web tĩnh lên [https://2006phu.github.io/rideeat-soa/](https://2006phu.github.io/rideeat-soa/).

---

## 📖 Tài Liệu Kiến Trúc Chi Tiết
Xem phân tích chuyên sâu về kiến trúc và các mẫu thiết kế OOP tại:  
👉 [docs/OOP_SOA_ARCHITECTURE.md](./docs/OOP_SOA_ARCHITECTURE.md)
