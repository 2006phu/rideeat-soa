# 🚀 RideEat Super-App — Hệ Thống Đặt Xe Công Nghệ, Giao Đồ Ăn & Ví Điện Tử (SOA + Strict OOP)

![Architecture](https://img.shields.io/badge/Architecture-SOA%209%20Microservices-10b981?style=for-the-badge)
![OOP](https://img.shields.io/badge/Paradigm-Strict%20OOP%20%2B%20DDD%20%2B%20SOLID-3b82f6?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-f59e0b?style=for-the-badge)
![Kafka](https://img.shields.io/badge/Message_Broker-Apache%20Kafka%20KRaft-red?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Security-Firebase%20Admin%20SDK-orange?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20GitHub%20Pages-8b5cf6?style=for-the-badge)

**RideEat** là đồ án môn **Kiến Trúc Hướng Dịch Vụ (Service-Oriented Architecture - SOA)** kết hợp **Lập Trình Hướng Đối Tượng (Object-Oriented Programming - OOP)**. Hệ thống mô phỏng siêu ứng dụng hoàn chỉnh như Grab / Be với **9 Microservices độc lập**, **Nginx API Gateway**, **Apache Kafka Event Streaming**, **Redis 7 (Cache & Geo Spatial)**, **PostgreSQL (Multi-Schema)**, **Firebase Admin SDK Authentication** và **Giao diện Web React đa phân quyền** đã được triển khai tự động lên **GitHub Pages**.

🔗 **Trang Web Trực Tuyến:** [https://2006phu.github.io/rideeat-soa/](https://2006phu.github.io/rideeat-soa/)

---

## 🌟 Điểm Nổi Bật Của Hệ Thống

1. **9 Microservices Độc Lập (Chuẩn Bounded Contexts SOA):**
   - 🔐 `auth-service (:8001)` — Xác thực Firebase OAuth (Google Sign-In), JWT, kiểm soát quyền truy cập RBAC (Khách hàng, Tài xế, Nhà hàng, Admin).
   - 👤 `user-service (:8002)` — Quản lý hồ sơ người dùng đa hình (`CustomerProfile`, `DriverProfile`, `MerchantProfile`), định danh KYC và tạo mã QR xác thực.
   - 🛵 `ride-service (:8003)` — Đặt xe công nghệ, Tính giá đa hình (Xe máy, Ô tô 4 chỗ, SUV 7 chỗ, VIP), máy trạng thái chuyến đi & xác thực mã OTP lên xe.
   - 🍔 `food-service (:8004)` — Danh mục quán ăn, thực đơn cấu trúc Composite, Giỏ hàng Redis, Theo dõi tiến độ nấu món & Trợ lý gợi ý món ngon.
   - 🗺️ `map-service (:8005)` — Định tuyến đường đi thực tế, tính cước theo khoảng cách & ETA, tìm tài xế gần nhất qua Redis Geo-Spatial.
   - 💳 `payment-service (:8006)` — Ví điện tử đóng gói bảo mật (`Wallet.__balance`), thanh toán đa cổng (Ví RideEat, VNPay QR, Tiền mặt), xuất hóa đơn điện tử.
   - ⭐ `rating-service (:8007)` — Đánh giá chất lượng 5 sao, tính điểm uy tín tài xế và quán ăn theo thuật toán Bayes.
   - 🎟️ `promo-service (:8008)` — Quản lý mã giảm giá, tính chiết khấu theo chiến lược (`PercentageStrategy`, `FixedAmountStrategy`).
   - 🔔 `notification-service (:8009)` — Lắng nghe sự kiện Kafka thời gian thực và đẩy thông báo đa kênh (In-app WebSocket, Email, FCM).

2. **Chế Độ Chạy Thật 100% (Strict Real Mode — Không Dùng Mock/Fallback Giả Lập):**
   - **Firebase Thật:** Kết nối trực tiếp với **Firebase Admin SDK** thông qua file chứng thư số [`config/firebase/serviceAccountKey.json`](./config/firebase/serviceAccountKey.json). Mọi token được ký và kiểm tra chữ ký RSA-256 (`RS256`).
   - **Kafka Thật:** Sử dụng cụm **Apache Kafka KRaft 3.6** với `aiokafka`. Toàn bộ giao tiếp bất đồng bộ giữa các service (Đặt xe, Giao món, Thanh toán) chạy qua các Topic Kafka thực tế.
   - **Giao diện phân quyền thực tế:** Mở web bắt buộc qua **Màn hình Đăng nhập / Đăng ký** hoặc **Đăng nhập Google qua Firebase**. Mỗi vai trò chỉ thấy đúng các chức năng thực tế của mình. Xe tự động lăn bánh trên bản đồ Leaflet theo thời gian thực.

---

## 📂 Cấu Trúc Thư Mục

```text
rideeat-soa/
├── docker-compose.yml              # Điều phối 15 containers (Postgres, Redis, Kafka, 9 Services, Gateway, UI, Monitoring)
├── .env.example                    # File mẫu cấu hình biến môi trường
├── config/
│   └── firebase/
│       ├── serviceAccountKey.json  # File chứng thư bảo mật Firebase Admin SDK (đã cấu hình cho project rideate-project)
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
│   └── start_ngrok.ps1             # Script mở cổng API Gateway ra Internet kết nối với GitHub Pages
├── services/                       # Mã nguồn Backend 9 Microservices & Thư viện OOP Core
│   ├── common/                     # OOP Kernel: Domain Base, Repository, Kafka Bus, Firebase Auth, Redis
│   ├── auth-service/               # Port 8001
│   ├── user-service/               # Port 8002
│   ├── ride-service/               # Port 8003
│   ├── food-service/               # Port 8004
│   ├── map-service/                # Port 8005
│   ├── payment-service/            # Port 8006
│   ├── rating-service/             # Port 8007
│   ├── promo-service/              # Port 8008
│   └── notification-service/       # Port 8009
└── web-admin/                      # Giao diện Frontend React 18 + Vite + Leaflet OpenStreetMap (:3000)
```

---

## 🛠️ Hướng Dẫn Khởi Động & Chạy Thật Hệ Thống

### Bước 1: Chuẩn bị chứng thư Firebase
Đảm bảo file `serviceAccountKey.json` đã được đặt tại đường dẫn:
```text
config/firebase/serviceAccountKey.json
```
*(File này được gắn tự động vào container `auth-service` trong `docker-compose.yml` để kích hoạt Firebase Admin SDK thật).*

---

### Bước 2: Tạo file biến môi trường
Mở Terminal/PowerShell tại thư mục `rideeat-soa` và chạy:
```bash
cp .env.example .env
```

---

### Bước 3: Khởi động hệ thống thật với Docker Compose
Đảm bảo phần mềm **Docker Desktop** trên máy bạn đang mở. Sau đó chạy lệnh:
```bash
docker compose up --build -d
```
Lệnh này sẽ tự động tải các image, khởi tạo cơ sở dữ liệu PostgreSQL, Redis, Kafka KRaft, Nginx Gateway và build 9 container microservices.

---

### Bước 4: Kiểm tra trạng thái các dịch vụ đang chạy
1. **Kiểm tra danh sách container:**
   ```bash
   docker ps
   ```
2. **Kiểm tra cổng API Gateway tập trung:**
   - [http://localhost:8080/health](http://localhost:8080/health)
3. **Truy cập tài liệu Swagger UI của từng dịch vụ:**
   - 🔐 **Auth Service:** [http://localhost:8001/docs](http://localhost:8001/docs)
   - 👤 **User Service:** [http://localhost:8002/docs](http://localhost:8002/docs)
   - 🛵 **Ride Service:** [http://localhost:8003/docs](http://localhost:8003/docs)
   - 🍔 **Food Service:** [http://localhost:8004/docs](http://localhost:8004/docs)
   - 🗺️ **Map Service:** [http://localhost:8005/docs](http://localhost:8005/docs)
   - 💳 **Payment Service:** [http://localhost:8006/docs](http://localhost:8006/docs)
   - ⭐ **Rating Service:** [http://localhost:8007/docs](http://localhost:8007/docs)
   - 🎟️ **Promo Service:** [http://localhost:8008/docs](http://localhost:8008/docs)
   - 🔔 **Notification Service:** [http://localhost:8009/docs](http://localhost:8009/docs)
4. **Kiểm tra các Topic Kafka thật trong container:**
   ```bash
   docker exec -it rideeat-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
   ```
5. **Giám sát Prometheus & Grafana:**
   - 📈 **Prometheus:** [http://localhost:9090](http://localhost:9090)
   - 📊 **Grafana:** [http://localhost:3001](http://localhost:3001) *(Đăng nhập: `admin` / `rideeat_admin`)*

---

### Bước 5: Mở kết nối Ngrok ra Internet (để nối với GitHub Pages)
Nếu bạn muốn sử dụng trang web trực tuyến trên **GitHub Pages** ([https://2006phu.github.io/rideeat-soa/](https://2006phu.github.io/rideeat-soa/)) gửi request về trực tiếp backend đang chạy trên máy của bạn:

Mở một cửa sổ PowerShell mới và chạy:
```powershell
.\scripts\start_ngrok.ps1
```
Script sẽ cung cấp một đường link HTTPS công khai (ví dụ `https://xxxx.ngrok-free.app`) trỏ về cổng `:8080` của API Gateway trên máy bạn.

---

### Bước 6: Trải nghiệm người dùng trên Giao diện Web
Truy cập [http://localhost:3000](http://localhost:3000) (hoặc [https://2006phu.github.io/rideeat-soa/](https://2006phu.github.io/rideeat-soa/)):
1. **Màn hình Đăng nhập:**
   - Đăng nhập bằng Email/Mật khẩu hoặc chọn nhanh 1 trong 4 tài khoản mẫu (**Khách hàng**, **Tài xế**, **Chủ quán**, **Admin**).
   - Hoặc bấm **🔥 Đăng nhập bằng Google (Firebase Auth)** để xác thực bằng tài khoản Google thật.
2. **Phân hệ Khách hàng:**
   - **🛵 Đặt xe:** Chọn điểm đón/đến tại TP.HCM, xem lộ trình trên bản đồ OpenStreetMap, chọn loại xe (Xe máy, 4 chỗ, 7 chỗ), áp mã giảm giá, bấm đặt xe và theo dõi xe tự động lăn bánh theo thời gian thực.
   - **🍔 Đặt đồ ăn:** Xem menu quán, thêm món vào giỏ, đặt món và theo dõi đơn hàng tự động cập nhật trạng thái nấu/giao.
   - **💳 Ví & Thanh toán:** Nạp tiền vào ví, đổi cổng thanh toán (VNPay, Ví, Tiền mặt) và xem lịch sử giao dịch.
   - **🤖 Trợ lý AI:** Chat trực tiếp với AI để hỏi giá xe, gợi ý món ăn theo khẩu vị hoặc tìm mã giảm giá.
3. **Phân hệ Tài xế:** Bật/tắt nhận cuốc, xem chuyến xe đang cần đón, nhập mã OTP khách đưa để bắt đầu chuyến đi.
4. **Phân hệ Chủ quán ăn:** Xác nhận đơn đặt món mới và quản lý trạng thái các món trong thực đơn.
5. **Phân hệ Quản trị viên:** Giám sát trạng thái 9 Microservices và luồng sự kiện Kafka toàn hệ thống.

---

## 🧪 Kiểm Thử Tự Động Với Postman & Unit Tests

* **Chạy bộ kiểm thử kiến trúc OOP & Microservices:**
  ```bash
  python tests/test_oop_core.py -v
  ```
* **Chạy kiểm thử 9 API Microservices bằng Newman CLI:**
  ```bash
  npx newman run postman/rideeat-collection.json
  ```

---

## 📖 Tài Liệu Chi Tiết Về Kiến Trúc OOP & SOA
Xem phân tích chuyên sâu về 4 Tính chất OOP (Đóng gói, Kế thừa, Đa hình, Trừu tượng), nguyên lý SOLID và 7 Design Patterns tại:  
👉 [docs/OOP_SOA_ARCHITECTURE.md](./docs/OOP_SOA_ARCHITECTURE.md)
