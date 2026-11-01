import React from 'react';
import styled from 'styled-components';
import { motion } from 'motion/react';
import {
  Bike,
  Wallet,
  ArrowRight,
  ChevronRight,
  Award,
  MapPin,
  Gift,
  Flame,
  Sparkles,
  Calendar,
  Package
} from 'lucide-react';

// Import authentic 3D icons (matching Grab Super-App)
import iconBike from '../assets/icons3d/bike.png';
import iconCar from '../assets/icons3d/car.png';
import iconFood from '../assets/icons3d/food.png';
import iconExpress from '../assets/icons3d/express.png';
import iconRideLater from '../assets/icons3d/ridelater.png';
import iconCrown3D from '../assets/icons3d/crown3d.png';
import iconWallet3D from '../assets/icons3d/wallet3d.png';
import iconGift3D from '../assets/icons3d/gift3d.png';
import iconStar3D from '../assets/icons3d/star3d.png';
import iconAi3D from '../assets/icons3d/ai.png';

const CustomerHome3D = ({
  currentUser,
  walletBalance,
  setActiveTab,
  setSelectedVehicleCode,
  setFoodCategoryFilter,
  setDeliveryMode,
  setScheduledRide,
  setShowAiChatModal,
  rideStage,
  pickupLocation,
  dropoffLocation,
  foodCart,
  themeMode
}) => {
  const isOngoingRide = rideStage && rideStage !== 'IDLE' && rideStage !== 'COMPLETED' && rideStage !== 'CANCELLED';

  // Chốt 5 nghiệp vụ cốt lõi theo đúng yêu cầu: Bike, Car, Food, Giao hàng, Ride later
  const services = [
    {
      id: 'bike',
      name: 'Bike',
      sub: 'Xe máy GrabBike',
      badge: 'Nhanh 3p',
      badgeColor: '#00b14f',
      img: iconBike,
      action: () => {
        setDeliveryMode?.(false);
        setScheduledRide?.(false);
        setSelectedVehicleCode?.('BIKE');
        setActiveTab('RIDE');
      }
    },
    {
      id: 'car',
      name: 'Car',
      sub: 'Ô tô GrabCar',
      badge: '4-7 chỗ',
      badgeColor: '#00b14f',
      img: iconCar,
      action: () => {
        setDeliveryMode?.(false);
        setScheduledRide?.(false);
        setSelectedVehicleCode?.('CAR');
        setActiveTab('RIDE');
      }
    },
    {
      id: 'food',
      name: 'Food',
      sub: 'Đồ ăn GrabFood',
      badge: 'Hot 15p',
      badgeColor: '#ea580c',
      img: iconFood,
      action: () => {
        setActiveTab('FOOD');
      }
    },
    {
      id: 'express',
      name: 'Giao hàng',
      sub: 'GrabExpress siêu tốc',
      badge: 'Giao 30p',
      badgeColor: '#f97316',
      img: iconExpress,
      action: () => {
        setDeliveryMode?.(true);
        setScheduledRide?.(false);
        setSelectedVehicleCode?.('BIKE');
        setActiveTab('RIDE');
      }
    },
    {
      id: 'ridelater',
      name: 'Ride later',
      sub: 'Đặt trước lịch xe',
      badge: 'Đúng giờ',
      badgeColor: '#3b82f6',
      img: iconRideLater,
      action: () => {
        setDeliveryMode?.(false);
        setScheduledRide?.(true);
        setActiveTab('RIDE');
      }
    }
  ];

  return (
    <StyledWrapper themeMode={themeMode}>
      {/* 1. HERO WELCOME CARD */}
      <motion.div
        className="hero-welcome-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="hero-left">
          <div className="badge-welcome">
            <span className="dot-pulse" />
            <span>Super-App Mobility & Delivery</span>
          </div>
          <h2 className="hero-greeting">
            Xin chào, <strong>{currentUser?.name || 'Khách hàng'}</strong> 👋
          </h2>
          <p className="hero-subtext">
            Chạm vào biểu tượng 3D để mở ngay nghiệp vụ bạn cần
          </p>

          <div className="hero-chips">
            <div className="loyalty-pill">
              <img src={iconCrown3D} alt="VIP" style={{ width: 20, height: 20, objectFit: 'contain' }} />
              <span>Hạng Vàng VIP (210 / 500 điểm)</span>
            </div>
            <div className="wallet-pill-hero" onClick={() => setActiveTab('WALLET')}>
              <img src={iconWallet3D} alt="Wallet" style={{ width: 20, height: 20, objectFit: 'contain' }} />
              <span>Số dư: <strong>{walletBalance?.toLocaleString('vi-VN')} đ</strong></span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="promo-highlight-box">
            <div className="promo-badge">Ưu đãi hôm nay</div>
            <div className="promo-code">RIDEEAT50</div>
            <div className="promo-desc">Giảm ngay 50% (Tối đa 30.000đ) cho tất cả dịch vụ Bike, Car & Food</div>
            <button
              type="button"
              className="btn-use-promo"
              onClick={() => setActiveTab('PROMO')}
            >
              <img src={iconGift3D} alt="Gift" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span>Kho ưu đãi</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. ONGOING RIDE TRACKER (IF ACTIVE) */}
      {isOngoingRide && (
        <motion.div
          className="ongoing-tracker-card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setActiveTab('RIDE')}
        >
          <div className="tracker-icon-box">
            <Bike className="w-5 h-5 text-emerald-600 animate-bounce" />
          </div>
          <div className="tracker-details">
            <div className="tracker-header">
              <span className="tracker-status-tag">CHUYẾN ĐI ĐANG DIỄN RA</span>
              <span className="tracker-stage">{rideStage}</span>
            </div>
            <div className="tracker-route">
              <span className="route-pickup">{pickupLocation?.name || 'Điểm đón'}</span>
              <span className="route-arrow">➔</span>
              <span className="route-dropoff">{dropoffLocation?.name || 'Điểm đến'}</span>
            </div>
          </div>
          <button className="btn-tracker-action" onClick={() => setActiveTab('RIDE')}>
            <span>Xem trực tiếp</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* 3. SECTION HEADER */}
      <div className="section-title-bar">
        <div>
          <h3 className="section-main-title">Dịch vụ chính RideEat</h3>
          <p className="section-sub-title">Chọn dịch vụ di chuyển, ẩm thực hoặc giao hàng nhanh chóng</p>
        </div>
        <div className="ai-helper-btn" onClick={() => setShowAiChatModal?.(true)}>
          <img src={iconAi3D} alt="AI" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          <span>Hỏi Trợ lý AI</span>
        </div>
      </div>

      {/* 4. AUTHENTIC 3D ICONS GRID (5 CORE SERVICES) */}
      <div className="grab-3d-grid-container">
        <div className="grab-3d-grid">
          {services.map((srv, idx) => (
            <motion.div
              key={srv.id}
              className="grab-3d-item"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              whileHover={{ y: -8, scale: 1.06 }}
              whileTap={{ y: 2, scale: 0.95 }}
              onClick={srv.action}
              title={`Mở dịch vụ: ${srv.name}`}
            >
              {/* Badge (e.g. Hot 15p, Nhanh 3p, Giao 30p) */}
              {srv.badge && (
                <span
                  className="grab-3d-badge"
                  style={{
                    backgroundColor: srv.badgeColor,
                    boxShadow: `0 2px 6px ${srv.badgeColor}55`
                  }}
                >
                  {srv.badge}
                </span>
              )}

              {/* 3D Icon Image Stage */}
              <div className="grab-3d-stage">
                <img
                  src={srv.img}
                  alt={srv.name}
                  className="grab-3d-img"
                  draggable={false}
                />
                <div className="grab-3d-shadow" />
              </div>

              {/* Title & Sub */}
              <span className="grab-3d-title">{srv.name}</span>
              <span className="grab-3d-sub">{srv.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 5. FAST SHORTCUTS FOOTER */}
      <div className="dashboard-shortcuts-row">
        <div className="shortcut-card" onClick={() => setActiveTab('WALLET')}>
          <div className="shortcut-icon wallet" style={{ background: 'transparent' }}>
            <img src={iconWallet3D} alt="Wallet" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          </div>
          <div className="shortcut-info">
            <span className="shortcut-label">Ví & Thẻ RidePay</span>
            <span className="shortcut-val">Nạp rút tức thì • 0đ phí</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="shortcut-card" onClick={() => setActiveTab('PROMO')}>
          <div className="shortcut-icon promo" style={{ background: 'transparent' }}>
            <img src={iconGift3D} alt="Gift" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          </div>
          <div className="shortcut-info">
            <span className="shortcut-label">Ưu đãi của tôi</span>
            <span className="shortcut-val">4 voucher sẵn sàng dùng</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="shortcut-card" onClick={() => setActiveTab('RATING')}>
          <div className="shortcut-icon rating" style={{ background: 'transparent' }}>
            <img src={iconStar3D} alt="Rating" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          </div>
          <div className="shortcut-info">
            <span className="shortcut-label">Đánh giá & Góp ý</span>
            <span className="shortcut-val">Chia sẻ trải nghiệm tài xế & món ăn</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 1. HERO CARD */
  .hero-welcome-card {
    background: ${({ themeMode }) =>
      themeMode === 'dark'
        ? 'linear-gradient(135deg, #111827 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)'};
    border: 1px solid ${({ themeMode }) =>
      themeMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 177, 79, 0.15)'};
    border-radius: 24px;
    padding: 24px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 820px) {
    .hero-welcome-card {
      flex-direction: column;
      align-items: stretch;
      padding: 20px;
    }
  }

  .badge-welcome {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 177, 79, 0.12);
    color: #00b14f;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 12px;
    border-radius: 99px;
    margin-bottom: 10px;
  }

  .dot-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #00b14f;
    box-shadow: 0 0 8px #00b14f;
  }

  .hero-greeting {
    font-size: 1.55rem;
    font-weight: 800;
    margin: 0 0 6px 0;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#0f172a')};
    letter-spacing: -0.02em;
  }

  .hero-subtext {
    font-size: 0.92rem;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#cbd5e1' : '#64748b')};
    margin: 0 0 16px 0;
  }

  .hero-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .loyalty-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: ${({ themeMode }) => (themeMode === 'dark' ? '#1f2937' : '#ffffff')};
    border: 1px solid ${({ themeMode }) => (themeMode === 'dark' ? '#374151' : '#e2e8f0')};
    border-radius: 99px;
    font-size: 0.82rem;
    font-weight: 600;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#1e293b')};
  }

  .wallet-pill-hero {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: ${({ themeMode }) => (themeMode === 'dark' ? '#1f2937' : '#ffffff')};
    border: 1px solid ${({ themeMode }) => (themeMode === 'dark' ? '#374151' : '#e2e8f0')};
    border-radius: 99px;
    font-size: 0.82rem;
    font-weight: 600;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#1e293b')};
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .wallet-pill-hero:hover {
    border-color: #00b14f;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 177, 79, 0.15);
  }

  .promo-highlight-box {
    background: ${({ themeMode }) =>
      themeMode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)'};
    backdrop-filter: blur(8px);
    border: 1px dashed rgba(0, 177, 79, 0.4);
    border-radius: 18px;
    padding: 16px 20px;
    max-width: 320px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
  }

  .promo-badge {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #ef4444;
    letter-spacing: 0.5px;
  }

  .promo-code {
    font-size: 1.25rem;
    font-weight: 800;
    color: #00b14f;
    letter-spacing: 0.5px;
    margin: 2px 0 4px 0;
  }

  .promo-desc {
    font-size: 0.8rem;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#cbd5e1' : '#64748b')};
    line-height: 1.35;
    margin-bottom: 12px;
  }

  .btn-use-promo {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: #00b14f;
    color: #ffffff;
    border: none;
    border-radius: 99px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-use-promo:hover {
    background: #009643;
    transform: translateY(-1px);
  }

  /* 2. ONGOING TRACKER CARD */
  .ongoing-tracker-card {
    background: ${({ themeMode }) =>
      themeMode === 'dark' ? '#064e3b' : '#ecfdf5'};
    border: 1.5px solid #10b981;
    border-radius: 20px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.15);
  }

  .ongoing-tracker-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.25);
  }

  .tracker-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(16, 185, 129, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tracker-details {
    flex: 1;
  }

  .tracker-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  .tracker-status-tag {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #059669;
  }

  .tracker-stage {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    background: #10b981;
    color: #ffffff;
  }

  .tracker-route {
    font-size: 0.88rem;
    font-weight: 600;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#1e293b')};
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .route-arrow {
    color: #10b981;
    font-weight: 700;
  }

  .btn-tracker-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #10b981;
    color: #ffffff;
    border: none;
    border-radius: 99px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* 3. SECTION HEADER */
  .section-title-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 6px;
  }

  .section-main-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#0f172a')};
    margin: 0 0 4px 0;
    letter-spacing: -0.01em;
  }

  .section-sub-title {
    font-size: 0.86rem;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#cbd5e1' : '#64748b')};
    margin: 0;
  }

  .ai-helper-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: ${({ themeMode }) => (themeMode === 'dark' ? '#1e293b' : '#ffffff')};
    border: 1px solid ${({ themeMode }) => (themeMode === 'dark' ? '#334155' : '#cbd5e1')};
    border-radius: 99px;
    font-size: 0.82rem;
    font-weight: 700;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#1e293b')};
    cursor: pointer;
    transition: all 0.2s;
  }

  .ai-helper-btn:hover {
    border-color: #00b14f;
    box-shadow: 0 3px 10px rgba(0, 177, 79, 0.15);
  }

  /* 4. AUTHENTIC 3D ICONS GRID (5 CORE SERVICES) */
  .grab-3d-grid-container {
    background: ${({ themeMode }) => (themeMode === 'dark' ? '#111827' : '#ffffff')};
    border: 1px solid ${({ themeMode }) => (themeMode === 'dark' ? '#1f2937' : '#e2e8f0')};
    border-radius: 28px;
    padding: 28px 24px 24px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  }

  .grab-3d-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 24px 18px;
    align-items: start;
    max-width: 960px;
    margin: 0 auto;
  }

  @media (max-width: 860px) {
    .grab-3d-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px 14px;
    }
  }

  @media (max-width: 520px) {
    .grab-3d-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 16px 10px;
    }
  }

  .grab-3d-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 14px 10px 16px;
    border-radius: 22px;
    cursor: pointer;
    position: relative;
    user-select: none;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .grab-3d-item:hover {
    background: ${({ themeMode }) => (themeMode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc')};
  }

  /* Badge in top right corner of item */
  .grab-3d-badge {
    position: absolute;
    top: 6px;
    right: 12px;
    color: #ffffff;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 99px;
    z-index: 5;
    letter-spacing: 0.2px;
    white-space: nowrap;
  }

  /* 3D Icon Stage */
  .grab-3d-stage {
    position: relative;
    width: 84px;
    height: 84px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .grab-3d-img {
    width: 76px;
    height: 76px;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.12));
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .grab-3d-item:hover .grab-3d-img {
    transform: scale(1.12) translateY(-4px);
    filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.18));
  }

  .grab-3d-shadow {
    position: absolute;
    bottom: 2px;
    width: 54px;
    height: 10px;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0) 70%);
    border-radius: 50%;
    z-index: 0;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  .grab-3d-item:hover .grab-3d-shadow {
    transform: scale(0.85);
    opacity: 0.4;
  }

  .grab-3d-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#1e293b')};
    margin-top: 2px;
    text-align: center;
    line-height: 1.25;
  }

  .grab-3d-sub {
    font-size: 0.78rem;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#cbd5e1' : '#64748b')};
    text-align: center;
    margin-top: 3px;
    line-height: 1.25;
  }

  /* 5. DASHBOARD SHORTCUTS */
  .dashboard-shortcuts-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  @media (max-width: 860px) {
    .dashboard-shortcuts-row {
      grid-template-columns: 1fr;
    }
  }

  .shortcut-card {
    background: ${({ themeMode }) => (themeMode === 'dark' ? '#111827' : '#ffffff')};
    border: 1px solid ${({ themeMode }) => (themeMode === 'dark' ? '#1f2937' : '#e2e8f0')};
    border-radius: 18px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .shortcut-card:hover {
    transform: translateY(-2px);
    border-color: #00b14f;
    box-shadow: 0 4px 16px rgba(0, 177, 79, 0.1);
  }

  .shortcut-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .shortcut-icon.wallet {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
  }

  .shortcut-icon.promo {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }

  .shortcut-icon.rating {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
  }

  .shortcut-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .shortcut-label {
    font-size: 0.9rem;
    font-weight: 700;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#ffffff' : '#1e293b')};
  }

  .shortcut-val {
    font-size: 0.78rem;
    color: ${({ themeMode }) => (themeMode === 'dark' ? '#cbd5e1' : '#64748b')};
  }
`;

export default CustomerHome3D;
