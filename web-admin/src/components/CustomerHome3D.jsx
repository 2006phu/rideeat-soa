import React from 'react';
import styled from 'styled-components';
import { motion } from 'motion/react';
import {
  Bike,
  Car,
  UtensilsCrossed,
  Wallet,
  TicketPercent,
  Star,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Flame,
  Gift,
  Compass,
  ChevronRight,
  CreditCard,
  Award,
  Zap,
  MapPin
} from 'lucide-react';

const CustomerHome3D = ({
  currentUser,
  walletBalance,
  setActiveTab,
  setShowAiChatModal,
  rideStage,
  pickupLocation,
  dropoffLocation,
  foodCart,
  themeMode
}) => {
  const isOngoingRide = rideStage && rideStage !== 'IDLE' && rideStage !== 'COMPLETED' && rideStage !== 'CANCELLED';

  const services = [
    {
      id: 'RIDE',
      name: 'Đặt xe',
      category: 'GrabBike & GrabCar',
      badge: 'Có xe trong 3p',
      badgeColor: '#00b14f',
      desc: 'Định tuyến bản đồ OpenStreetMap & GPS trực tiếp, giá cước chuẩn xác tối ưu.',
      icon: <Bike className="w-9 h-9 text-white" />,
      subIcon: <Car className="w-5 h-5 text-emerald-100" />,
      gradient: 'linear-gradient(135deg, #10b981 0%, #00b14f 60%, #047857 100%)',
      bevelColor: '#065f46',
      shadow3d: '#059669',
      glowColor: 'rgba(0, 177, 79, 0.35)',
      action: () => setActiveTab('RIDE')
    },
    {
      id: 'FOOD',
      name: 'Đặt đồ ăn',
      category: 'GrabFood 15 phút',
      badge: 'Nóng hổi 15p',
      badgeColor: '#ea580c',
      desc: '6 nhà hàng đối tác đặc sản: Phở Thìn, Cơm Tấm, Bún Bò Huế, Katinat...',
      icon: <UtensilsCrossed className="w-9 h-9 text-white" />,
      subIcon: <Flame className="w-5 h-5 text-amber-100" />,
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)',
      bevelColor: '#9a3412',
      shadow3d: '#ea580c',
      glowColor: 'rgba(234, 88, 12, 0.35)',
      action: () => setActiveTab('FOOD')
    },
    {
      id: 'WALLET',
      name: 'Ví RidePay',
      category: 'Thanh toán & Số dư',
      badge: 'Miễn phí nạp rút',
      badgeColor: '#2563eb',
      desc: 'Nạp / rút tiền siêu tốc, quản lý thẻ ngân hàng và sổ cái giao dịch tài chính.',
      icon: <Wallet className="w-9 h-9 text-white" />,
      subIcon: <CreditCard className="w-5 h-5 text-blue-100" />,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%)',
      bevelColor: '#1e40af',
      shadow3d: '#2563eb',
      glowColor: 'rgba(37, 99, 235, 0.35)',
      action: () => setActiveTab('WALLET')
    },
    {
      id: 'PROMO',
      name: 'Khuyến mãi',
      category: 'Voucher & Giảm giá',
      badge: 'Giảm tới 50%',
      badgeColor: '#d97706',
      desc: 'Mã giảm giá RIDEEAT50, FREESHIP15K và đặc quyền tích điểm Hạng Vàng VIP.',
      icon: <TicketPercent className="w-9 h-9 text-white" />,
      subIcon: <Gift className="w-5 h-5 text-amber-100" />,
      gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 60%, #b45309 100%)',
      bevelColor: '#92400e',
      shadow3d: '#d97706',
      glowColor: 'rgba(217, 119, 6, 0.35)',
      action: () => setActiveTab('PROMO')
    },
    {
      id: 'RATING',
      name: 'Đánh giá',
      category: 'Chấm sao & Góp ý',
      badge: 'Nhận điểm thưởng',
      badgeColor: '#9333ea',
      desc: 'Đánh giá chuyến đi & món ăn với hoạt ảnh sao Yippee để nhận điểm thăng hạng.',
      icon: <Star className="w-9 h-9 text-white" />,
      subIcon: <Award className="w-5 h-5 text-purple-100" />,
      gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 60%, #7e22ce 100%)',
      bevelColor: '#6b21a8',
      shadow3d: '#9333ea',
      glowColor: 'rgba(147, 51, 234, 0.35)',
      action: () => setActiveTab('RATING')
    },
    {
      id: 'AI',
      name: 'Trợ lý AI',
      category: 'Gemini 2.5 Assistant',
      badge: 'Thông minh 24/7',
      badgeColor: '#0891b2',
      desc: 'Tư vấn món ăn ngon, tính toán ước lượng giá cước và giải đáp ưu đãi tự động.',
      icon: <Sparkles className="w-9 h-9 text-white" />,
      subIcon: <Zap className="w-5 h-5 text-cyan-100" />,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%)',
      bevelColor: '#155e75',
      shadow3d: '#0891b2',
      glowColor: 'rgba(8, 145, 178, 0.35)',
      action: () => setShowAiChatModal(true)
    }
  ];

  return (
    <StyledWrapper themeMode={themeMode}>
      {/* 1. HERO WELCOME CARD */}
      <motion.div
        className="hero-welcome-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
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
            Bạn muốn di chuyển siêu tốc hay thưởng thức món ngon nóng hổi hôm nay?
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

      {/* 3. SECTION TITLE */}
      <div className="section-header">
        <div>
          <h3 className="section-title">Danh mục Nghiệp vụ & Dịch vụ</h3>
          <p className="section-subtitle">Chạm vào icon 3D để mở màn hình chuyên biệt cho nghiệp vụ đó</p>
        </div>
        <div className="quick-guide-tag">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Giao diện 3D Tinh gọn</span>
        </div>
      </div>

      {/* 4. 3D ICONS GRID */}
      <div className="hub-3d-grid">
        {services.map((srv, idx) => (
          <motion.div
            key={srv.id}
            className="card-3d"
            style={{
              '--bevel-color': srv.bevelColor,
              '--shadow-3d': srv.shadow3d,
              '--glow-color': srv.glowColor
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ y: 2, scale: 0.98 }}
            onClick={srv.action}
          >
            {/* Top Badge & Sub-Icon */}
            <div className="card-top-row">
              <span className="card-badge" style={{ backgroundColor: srv.glowColor, color: srv.badgeColor, borderColor: srv.badgeColor }}>
                {srv.badge}
              </span>
              <div className="card-subicon-box" style={{ background: srv.gradient }}>
                {srv.subIcon}
              </div>
            </div>

            {/* Central 3D Tactile Icon Box */}
            <div className="icon-3d-stage">
              <div className="icon-3d-box" style={{ background: srv.gradient }}>
                <div className="icon-3d-shine" />
                {srv.icon}
              </div>
            </div>

            {/* Card Content */}
            <div className="card-info">
              <div className="card-category">{srv.category}</div>
              <h4 className="card-title">{srv.name}</h4>
              <p className="card-desc">{srv.desc}</p>
            </div>

            {/* Bottom Action Footer */}
            <div className="card-footer">
              <span className="card-action-text">Mở nghiệp vụ</span>
              <div className="card-arrow-circle">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 5. BOTTOM QUICK VOUCHER BANNER */}
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
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    margin: 0 0 4px 0;
  }

  .section-subtitle {
    font-size: 0.82rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
  }

  .quick-guide-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #00b14f;
    background: rgba(0, 177, 79, 0.08);
    padding: 4px 10px;
    border-radius: 8px;
  }

  /* 4. 3D ICONS GRID */
  .hub-3d-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 28px;
  }

  @media (max-width: 900px) {
    .hub-3d-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .hub-3d-grid {
      grid-template-columns: 1fr;
    }
  }

  /* 3D TACTILE CARD */
  .card-3d {
    background: var(--bg-card, #ffffff);
    border: 2px solid var(--border-color, #e2e8f0);
    border-radius: 24px;
    padding: 20px 20px 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    position: relative;
    user-select: none;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05), 0 5px 0 var(--shadow-3d);
    transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                border-color 0.2s ease;
    perspective: 1000px;
  }

  .card-3d:hover {
    border-color: var(--shadow-3d);
    box-shadow: 0 18px 30px var(--glow-color), 0 8px 0 var(--shadow-3d);
  }

  .card-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .card-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 8px;
    border: 1px solid;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .card-subicon-box {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
  }

  /* 3D Elevated Icon Stage */
  .icon-3d-stage {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px 0 16px;
  }

  .icon-3d-box {
    width: 76px;
    height: 76px;
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 12px 24px var(--glow-color),
                inset 0 2px 4px rgba(255, 255, 255, 0.6),
                inset 0 -3px 6px rgba(0, 0, 0, 0.2),
                0 6px 0 var(--bevel-color);
    transition: transform 0.25s ease;
  }

  .card-3d:hover .icon-3d-box {
    transform: translateY(-4px) scale(1.06);
  }

  .icon-3d-shine {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 48%;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.02) 100%);
    pointer-events: none;
  }

  /* Card Info */
  .card-info {
    text-align: center;
    margin-bottom: 16px;
  }

  .card-category {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .card-title {
    font-size: 1.22rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    margin: 0 0 6px 0;
  }

  .card-desc {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    line-height: 1.45;
    margin: 0;
  }

  /* Card Footer */
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px dashed var(--border-color, #e2e8f0);
  }

  .card-action-text {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
  }

  .card-arrow-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--bg-hover, #f1f5f9);
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .card-3d:hover .card-arrow-circle {
    background: var(--shadow-3d);
    color: white;
    transform: translateX(3px);
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
