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
  Sparkles
} from 'lucide-react';

// Import authentic 3D icons (matching Grab Super-App)
import iconBike from '../assets/icons3d/bike.png';
import iconCar from '../assets/icons3d/car.png';
import iconFood from '../assets/icons3d/food.png';
import iconMart from '../assets/icons3d/mart.png';
import iconMall from '../assets/icons3d/mall.png';
import iconCoin from '../assets/icons3d/coin.png';
import iconExpress from '../assets/icons3d/express.png';
import iconDineOut from '../assets/icons3d/dineout.png';
import iconRideLater from '../assets/icons3d/ridelater.png';
import iconMap from '../assets/icons3d/map.png';
import iconVoucher from '../assets/icons3d/voucher.png';
import iconAi from '../assets/icons3d/ai.png';

const CustomerHome3D = ({
  currentUser,
  walletBalance,
  setActiveTab,
  setSelectedVehicleCode,
  setFoodCategoryFilter,
  setShowAiChatModal,
  rideStage,
  pickupLocation,
  dropoffLocation,
  foodCart,
  themeMode
}) => {
  const isOngoingRide = rideStage && rideStage !== 'IDLE' && rideStage !== 'COMPLETED' && rideStage !== 'CANCELLED';

  const services = [
    // HÀNG 1 (TOP ROW IN USER IMAGE)
    {
      id: 'bike',
      name: 'Bike',
      sub: 'Xe máy GrabBike',
      badge: 'Nhanh 3p',
      badgeColor: '#00b14f',
      img: iconBike,
      action: () => {
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
        setSelectedVehicleCode?.('CAR');
        setActiveTab('RIDE');
      }
    },
    {
      id: 'mart',
      name: 'Mart',
      sub: 'Đi chợ siêu thị',
      badge: 'Tươi sống',
      badgeColor: '#10b981',
      img: iconMart,
      action: () => {
        setFoodCategoryFilter?.('HEALTHY');
        setActiveTab('FOOD');
      }
    },
    {
      id: 'mall',
      name: 'Mall',
      sub: 'GrabMall chính hãng',
      badge: 'Chính hãng',
      badgeColor: '#ec4899',
      img: iconMall,
      action: () => {
        setFoodCategoryFilter?.('ALL');
        setActiveTab('FOOD');
      }
    },
    {
      id: 'coins',
      name: 'GrabCoins',
      sub: 'Ví RidePay & Thẻ',
      badge: 'Ưu đãi',
      badgeColor: '#f59e0b',
      img: iconCoin,
      action: () => {
        setActiveTab('WALLET');
      }
    },
    {
      id: 'voucher',
      name: 'Voucher',
      sub: 'Mã giảm tới 50%',
      badge: 'Giảm 50%',
      badgeColor: '#ef4444',
      img: iconVoucher,
      action: () => {
        setActiveTab('PROMO');
      }
    },

    // HÀNG 2 (BOTTOM ROW IN USER IMAGE)
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
      name: 'Express',
      sub: 'Giao hàng siêu tốc',
      badge: 'Giao 30p',
      badgeColor: '#f97316',
      img: iconExpress,
      action: () => {
        setSelectedVehicleCode?.('BIKE');
        setActiveTab('RIDE');
      }
    },
    {
      id: 'dineout',
      name: 'Dine Out',
      sub: 'Ăn tại nhà hàng',
      badge: 'Đặt bàn',
      badgeColor: '#f59e0b',
      img: iconDineOut,
      action: () => {
        setActiveTab('FOOD');
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
        setActiveTab('RIDE');
      }
    },
    {
      id: 'map',
      name: 'Map',
      sub: 'Bản đồ định tuyến',
      badge: 'Live GPS',
      badgeColor: '#ef4444',
      img: iconMap,
      action: () => {
        setActiveTab('RIDE');
      }
    },
    {
      id: 'ai',
      name: 'Trợ lý AI',
      sub: 'Google Gemini 2.5',
      badge: 'AI 24/7',
      badgeColor: '#06b6d4',
      img: iconAi,
      action: () => {
        setShowAiChatModal?.(true);
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
            <span>Super-App Mobility & Food Delivery</span>
          </div>
          <h2 className="hero-greeting">
            Xin chào, <strong>{currentUser?.name || 'Khách hàng'}</strong> 👋
          </h2>
          <p className="hero-subtext">
            Chạm vào biểu tượng 3D để mở ngay nghiệp vụ bạn cần
          </p>

          <div className="hero-chips">
            <div className="loyalty-pill">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Hạng Vàng VIP (210 / 500 điểm)</span>
            </div>
            <div className="wallet-pill-hero" onClick={() => setActiveTab('WALLET')}>
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span>Số dư: <strong>{walletBalance?.toLocaleString('vi-VN')} đ</strong></span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="promo-highlight-box">
            <div className="promo-badge">Ưu đãi hôm nay</div>
            <div className="promo-code">RIDEEAT50</div>
            <div className="promo-desc">Giảm 50% chuyến xe & món ăn</div>
            <button
              type="button"
              className="promo-btn"
              onClick={() => setActiveTab('PROMO')}
            >
              Xem tất cả voucher <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. ONGOING TRIP ALERT (IF ANY) */}
      {isOngoingRide && (
        <motion.div
          className="ongoing-ride-banner"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setActiveTab('RIDE')}
        >
          <div className="ongoing-ride-info">
            <div className="pulse-circle">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="ongoing-title">Chuyến xe của bạn đang tiến hành!</div>
              <div className="ongoing-route">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 inline mr-1" />
                {pickupLocation?.name} → {dropoffLocation?.name}
              </div>
            </div>
          </div>
          <button type="button" className="ongoing-view-btn">
            Mở bản đồ theo dõi <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* 3. SECTION HEADER */}
      <div className="section-header">
        <div>
          <h3 className="section-title">Dịch vụ Siêu ứng dụng</h3>
          <p className="section-subtitle">Chạm vào icon 3D để chuyển đến màn hình nghiệp vụ tương ứng</p>
        </div>
        <div className="quick-guide-tag">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Interactive 3D Grid</span>
        </div>
      </div>

      {/* 4. AUTHENTIC 3D ICONS GRID (MATCHING USER SCREENSHOT) */}
      <div className="grab-3d-grid-container">
        <div className="grab-3d-grid">
          {services.map((srv, idx) => (
            <motion.div
              key={srv.id}
              className="grab-3d-item"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              whileHover={{ y: -8, scale: 1.08 }}
              whileTap={{ y: 2, scale: 0.94 }}
              onClick={srv.action}
              title={`Mở dịch vụ: ${srv.name}`}
            >
              {/* Badge (e.g. Hot, 3p, Giảm 50%) */}
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

              {/* Label */}
              <div className="grab-3d-label">{srv.name}</div>
              <div className="grab-3d-sub">{srv.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 5. BOTTOM PROMO BANNERS */}
      <div className="bottom-promos-row">
        <div className="promo-banner-card" onClick={() => setActiveTab('PROMO')}>
          <div className="banner-icon-box bg-emerald-50 text-emerald-600">
            <Gift className="w-6 h-6" />
          </div>
          <div className="banner-info">
            <div className="banner-title">Mã giảm 50% chuyến xe đầu tiên</div>
            <div className="banner-sub">Nhập mã RIDEEAT50 khi thanh toán để giảm ngay tối đa 25.000đ</div>
          </div>
          <button type="button" className="banner-action-btn">Dùng ngay</button>
        </div>

        <div className="promo-banner-card" onClick={() => setActiveTab('FOOD')}>
          <div className="banner-icon-box bg-orange-50 text-orange-600">
            <Flame className="w-6 h-6" />
          </div>
          <div className="banner-info">
            <div className="banner-title">GrabFood Freeship 15.000đ</div>
            <div className="banner-sub">Áp dụng cho mọi đơn từ 6 quán đối tác với mã FREESHIP15K</div>
          </div>
          <button type="button" className="banner-action-btn">Đặt món</button>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 4px 32px;

  /* 1. Hero Welcome Card */
  .hero-welcome-card {
    background: var(--bg-card, #ffffff);
    border: 1.5px solid var(--border-color, #e2e8f0);
    border-radius: 24px;
    padding: 24px 28px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
    position: relative;
    overflow: hidden;
  }

  .hero-left {
    flex: 1;
    min-width: 280px;
  }

  .badge-welcome {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-radius: 99px;
    background: rgba(0, 177, 79, 0.1);
    color: #00b14f;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .dot-pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #00b14f;
    box-shadow: 0 0 0 3px rgba(0, 177, 79, 0.25);
  }

  .hero-greeting {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    margin: 0 0 6px 0;
    line-height: 1.25;
  }

  .hero-subtext {
    font-size: 0.9rem;
    color: var(--text-secondary, #64748b);
    margin: 0 0 16px 0;
  }

  .hero-chips {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .loyalty-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 12px;
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid rgba(245, 158, 11, 0.25);
  }

  .wallet-pill-hero {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 12px;
    background: var(--bg-hover, #f1f5f9);
    color: var(--text-primary, #0f172a);
    font-size: 12px;
    cursor: pointer;
    border: 1px solid var(--border-color, #e2e8f0);
    transition: all 0.2s ease;
  }

  .wallet-pill-hero:hover {
    border-color: #00b14f;
    background: rgba(0, 177, 79, 0.08);
  }

  .hero-right {
    flex-shrink: 0;
  }

  .promo-highlight-box {
    background: linear-gradient(135deg, #00b14f 0%, #059669 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 18px;
    box-shadow: 0 8px 20px rgba(0, 177, 79, 0.25);
    text-align: center;
    min-width: 220px;
  }

  .promo-badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 800;
    opacity: 0.9;
  }

  .promo-code {
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: 1px;
    margin: 4px 0 2px;
  }

  .promo-desc {
    font-size: 11px;
    opacity: 0.9;
    margin-bottom: 10px;
  }

  .promo-btn {
    background: white;
    color: #00b14f;
    border: none;
    outline: none;
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: transform 0.15s ease;
  }

  .promo-btn:hover {
    transform: scale(1.04);
  }

  /* 2. Ongoing Ride Banner */
  .ongoing-ride-banner {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    border-radius: 18px;
    padding: 14px 20px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
    border: 1.5px solid #334155;
  }

  .ongoing-ride-info {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .pulse-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #00b14f;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 4px rgba(0, 177, 79, 0.35);
  }

  .ongoing-title {
    font-weight: 800;
    font-size: 0.95rem;
  }

  .ongoing-route {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .ongoing-view-btn {
    background: #00b14f;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  /* 3. Section Title */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 18px;
    padding: 0 4px;
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    margin: 0 0 4px 0;
  }

  .section-subtitle {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
  }

  .quick-guide-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 700;
    color: #00b14f;
    background: rgba(0, 177, 79, 0.08);
    padding: 5px 12px;
    border-radius: 10px;
  }

  /* 4. AUTHENTIC 3D ICONS GRID (MATCHING USER SCREENSHOT) */
  .grab-3d-grid-container {
    background: var(--bg-card, #ffffff);
    border: 1.5px solid var(--border-color, #e2e8f0);
    border-radius: 26px;
    padding: 24px 18px 20px;
    margin-bottom: 26px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
  }

  .grab-3d-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 20px 14px;
    align-items: start;
  }

  @media (max-width: 992px) {
    .grab-3d-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 18px 12px;
    }
  }

  @media (max-width: 640px) {
    .grab-3d-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px 8px;
    }
  }

  .grab-3d-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 10px 6px 12px;
    border-radius: 20px;
    cursor: pointer;
    position: relative;
    user-select: none;
    transition: background 0.18s ease;
  }

  .grab-3d-item:hover {
    background: var(--bg-hover, #f8fafc);
  }

  /* Badge in top right corner of item */
  .grab-3d-badge {
    position: absolute;
    top: 2px;
    right: 6px;
    color: white;
    font-size: 9.5px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 99px;
    letter-spacing: 0.3px;
    z-index: 2;
  }

  /* 3D Stage & Shadow */
  .grab-3d-stage {
    width: 82px;
    height: 76px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 6px;
  }

  .grab-3d-img {
    max-width: 76px;
    max-height: 68px;
    width: auto;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.12));
    transition: filter 0.22s ease, transform 0.22s ease;
    user-select: none;
    -webkit-user-drag: none;
  }

  .grab-3d-item:hover .grab-3d-img {
    filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.2));
  }

  .grab-3d-shadow {
    width: 54px;
    height: 8px;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0) 70%);
    position: absolute;
    bottom: -2px;
    transition: transform 0.22s ease, opacity 0.22s ease;
  }

  .grab-3d-item:hover .grab-3d-shadow {
    transform: scale(0.85);
    opacity: 0.6;
  }

  /* Labels */
  .grab-3d-label {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    text-align: center;
    line-height: 1.25;
    margin-top: 4px;
  }

  .grab-3d-sub {
    font-size: 0.72rem;
    color: var(--text-secondary, #64748b);
    text-align: center;
    line-height: 1.2;
    margin-top: 2px;
  }

  /* 5. Bottom Promos Row */
  .bottom-promos-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    .bottom-promos-row {
      grid-template-columns: 1fr;
    }
  }

  .promo-banner-card {
    background: var(--bg-card, #ffffff);
    border: 1.5px solid var(--border-color, #e2e8f0);
    border-radius: 18px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .promo-banner-card:hover {
    border-color: #00b14f;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }

  .banner-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .banner-info {
    flex: 1;
  }

  .banner-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    margin-bottom: 2px;
  }

  .banner-sub {
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
    line-height: 1.35;
  }

  .banner-action-btn {
    background: transparent;
    color: #00b14f;
    border: 1px solid #00b14f;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .banner-action-btn:hover {
    background: #00b14f;
    color: white;
  }
`;

export default CustomerHome3D;
