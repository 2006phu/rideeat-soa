import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Bike,
  User,
  Store,
  ShieldCheck,
  Sun,
  Moon,
  AlertTriangle,
  Lock,
  Mail,
  Info
} from 'lucide-react';
import SketchyThemeSwitch from './SketchyThemeSwitch.jsx';
import Loader from './Loader.jsx';

const LoginForm = ({
  authMode,
  setAuthMode,
  themeMode,
  toggleTheme,
  selectedPresetRole,
  handleSelectRolePreset,
  DEMO_ACCOUNTS,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  registerName,
  setRegisterName,
  registerPhone,
  setRegisterPhone,
  driverCccd,
  setDriverCccd,
  driverVehicleType,
  setDriverVehicleType,
  driverLicensePlate,
  setDriverLicensePlate,
  driverLicenseNumber,
  setDriverLicenseNumber,
  merchantStoreName,
  setMerchantStoreName,
  merchantPhone,
  setMerchantPhone,
  merchantAddress,
  setMerchantAddress,
  merchantOpenHours,
  setMerchantOpenHours,
  merchantBankName,
  setMerchantBankName,
  merchantBankAccount,
  setMerchantBankAccount,
  merchantBankOwner,
  setMerchantBankOwner,
  handleAuthSubmit,
  handleGoogleSignIn,
  firebaseLoading,
  firebaseError
}) => {
  const [showForgotModal, setShowForgotModal] = useState(false);

  return (
    <StyledWrapper>
      <div className="form-container">
        {/* Top Controls: Role Brand & Theme Switcher */}
        <div className="top-bar">
          <div className="brand-badge">
            <Bike className="brand-icon" />
            <span className="brand-name">RideEat</span>
          </div>
          <div className="theme-toggle-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '36px', overflow: 'visible' }}>
            <SketchyThemeSwitch
              checked={themeMode === "dark"}
              onChange={toggleTheme}
              style={{ transform: "scale(0.38)", transformOrigin: "right center", margin: "-12px 0" }}
              title="Chuyển đổi giao diện Sáng / Tối"
            />
          </div>
        </div>

        {/* Title */}
        <p className="title">{authMode === 'LOGIN' ? 'Welcome back' : 'Create Account'}</p>
        <p className="sub-title">
          {authMode === 'LOGIN'
            ? 'Đăng nhập vào hệ thống siêu ứng dụng RideEat'
            : 'Đăng ký tài khoản Khách hàng / Đối tác'}
        </p>

        {/* Quick Role Preset Pills */}
        <div className="role-pills-row">
          {Object.values(DEMO_ACCOUNTS)
            .filter((acc) => authMode === 'LOGIN' || acc.role !== 'ADMIN')
            .map((acc) => {
              const isActive = selectedPresetRole === acc.role;
              return (
                <button
                  key={acc.role}
                  type="button"
                  className={`role-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectRolePreset(acc.role)}
                  title={`Chọn tài khoản mẫu: ${acc.roleLabel}`}
                >
                  {acc.role === 'CUSTOMER' && <User className="w-3.5 h-3.5" />}
                  {acc.role === 'DRIVER' && <Bike className="w-3.5 h-3.5" />}
                  {acc.role === 'RESTAURANT' && <Store className="w-3.5 h-3.5" />}
                  {acc.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{acc.role === 'CUSTOMER' ? 'Khách' : acc.role === 'DRIVER' ? 'Tài xế' : acc.role === 'RESTAURANT' ? 'Quán' : 'Admin'}</span>
                </button>
              );
            })}
        </div>

        {/* Form Body */}
        <form className="form" onSubmit={handleAuthSubmit}>
          {/* REGISTER FIELDS: CUSTOMER */}
          {authMode === 'REGISTER' && selectedPresetRole === 'CUSTOMER' && (
            <>
              <input
                type="text"
                className="input"
                placeholder="Họ và tên của bạn"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
              />
              <input
                type="tel"
                className="input"
                placeholder="Số điện thoại di động"
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                required
              />
            </>
          )}

          {/* REGISTER FIELDS: DRIVER */}
          {authMode === 'REGISTER' && selectedPresetRole === 'DRIVER' && (
            <>
              <input
                type="text"
                className="input"
                placeholder="Họ và tên tài xế"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
              />
              <input
                type="tel"
                className="input"
                placeholder="Số điện thoại liên hệ"
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Số CCCD / CMND"
                value={driverCccd}
                onChange={(e) => setDriverCccd(e.target.value)}
                required
              />
              <select
                className="input select-input"
                value={driverVehicleType}
                onChange={(e) => setDriverVehicleType(e.target.value)}
              >
                <option value="BIKE">Xe máy (RideBike)</option>
                <option value="CAR">Ô tô 4 chỗ (RideCar)</option>
              </select>
              <input
                type="text"
                className="input"
                placeholder="Biển số xe (59-X3 888.99)"
                value={driverLicensePlate}
                onChange={(e) => setDriverLicensePlate(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Số bằng lái xe GPLX"
                value={driverLicenseNumber}
                onChange={(e) => setDriverLicenseNumber(e.target.value)}
                required
              />
            </>
          )}

          {/* REGISTER FIELDS: RESTAURANT */}
          {authMode === 'REGISTER' && selectedPresetRole === 'RESTAURANT' && (
            <>
              <input
                type="text"
                className="input"
                placeholder="Tên quán ăn / Nhà hàng"
                value={merchantStoreName}
                onChange={(e) => setMerchantStoreName(e.target.value)}
                required
              />
              <input
                type="tel"
                className="input"
                placeholder="Hotline đặt món quán"
                value={merchantPhone}
                onChange={(e) => setMerchantPhone(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Địa chỉ quán (số nhà, phường, quận)"
                value={merchantAddress}
                onChange={(e) => setMerchantAddress(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Giờ mở cửa (06:30 - 22:30)"
                value={merchantOpenHours}
                onChange={(e) => setMerchantOpenHours(e.target.value)}
                required
              />
              <select
                className="input select-input"
                value={merchantBankName}
                onChange={(e) => setMerchantBankName(e.target.value)}
              >
                <option value="Vietcombank">Vietcombank</option>
                <option value="Techcombank">Techcombank</option>
                <option value="MBBank">MB Bank</option>
                <option value="ACB">ACB</option>
                <option value="BIDV">BIDV</option>
              </select>
              <input
                type="text"
                className="input"
                placeholder="Số tài khoản nhận tiền quyết toán"
                value={merchantBankAccount}
                onChange={(e) => setMerchantBankAccount(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Tên chủ tài khoản ngân hàng"
                value={merchantBankOwner}
                onChange={(e) => setMerchantBankOwner(e.target.value)}
                required
              />
            </>
          )}

          {/* Main Credentials */}
          <input
            type="email"
            className="input"
            placeholder={
              authMode === 'REGISTER' && selectedPresetRole === 'RESTAURANT'
                ? 'Email quản trị quán'
                : authMode === 'REGISTER' && selectedPresetRole === 'DRIVER'
                ? 'Email tài xế đăng ký'
                : 'Email'
            }
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <input
            type="password"
            className="input"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {authMode === 'LOGIN' && (
            <p className="page-link">
              <span className="page-link-label" onClick={() => setShowForgotModal(true)}>
                Forgot Password?
              </span>
            </p>
          )}

          <button type="submit" className="form-btn">
            {authMode === 'LOGIN'
              ? `Log in (${DEMO_ACCOUNTS[selectedPresetRole]?.name?.split(' ')[0] || 'User'})`
              : 'Sign up'}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <p className="sign-up-label">
          {authMode === 'LOGIN' ? (
            <>
              Don't have an account?
              <span className="sign-up-link" onClick={() => setAuthMode('REGISTER')}>
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have an account?
              <span className="sign-up-link" onClick={() => setAuthMode('LOGIN')}>
                Log in
              </span>
            </>
          )}
        </p>

        {/* Social Login Buttons Container */}
        <div className="buttons-container">

          <div
            className="google-login-button"
            onClick={handleGoogleSignIn}
            title="Đăng nhập tự động qua Google (Firebase Authentication)"
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth={0}
              version="1.1"
              x="0px"
              y="0px"
              className="google-icon"
              viewBox="0 0 48 48"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
                c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
                c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
                C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
                c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
                c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              />
            </svg>
            <span>{firebaseLoading ? 'Connecting Google...' : 'Log in with Google'}</span>
          </div>
        </div>

        {/* Loading Spinner Indicator */}
        {firebaseLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <Loader text="loading" />
          </div>
        )}

        {/* Error Alert Box */}
        {firebaseError && (
          <div className="error-alert">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{firebaseError}</span>
          </div>
        )}

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="modal-backdrop" onClick={() => setShowForgotModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '8px' }}>Khôi phục mật khẩu</h4>
              <p className="modal-desc">
                Nhập email của bạn để nhận liên kết đặt lại mật khẩu an toàn từ hệ thống RideEat.
              </p>
              <input
                type="email"
                className="input"
                placeholder="your.email@example.com"
                defaultValue={loginEmail}
                style={{ width: '100%', marginBottom: '14px' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowForgotModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="form-btn"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => {
                    alert('Đã gửi mã xác nhận đặt lại mật khẩu tới email của bạn!');
                    setShowForgotModal(false);
                  }}
                >
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px 16px;
  background: var(--bg-main, #f8fafc);
  transition: background-color 0.25s ease;

  .form-container {
    width: 380px;
    max-width: 100%;
    min-height: 480px;
    background-color: var(--bg-card, #ffffff);
    box-shadow: rgba(0, 0, 0, 0.25) 0px 8px 32px;
    border-radius: 18px;
    box-sizing: border-box;
    padding: 24px 28px 28px;
    border: 1px solid var(--border-color, #e2e8f0);
    position: relative;
    transition: background-color 0.25s ease, border-color 0.25s ease;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .brand-badge {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .brand-icon {
    width: 20px;
    height: 20px;
    color: #00b14f;
  }

  .brand-name {
    font-weight: 800;
    font-size: 1rem;
    color: var(--text-primary, #0f172a);
    letter-spacing: -0.5px;
  }

  .title {
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 8px 0 2px 0;
    font-size: 26px;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    letter-spacing: -0.5px;
  }

  .sub-title {
    text-align: center;
    font-size: 11px;
    color: var(--text-secondary, #64748b);
    margin: 0 0 16px 0;
  }

  .role-pills-row {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }

  .role-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
    border: 1.5px solid var(--border-color, #cbd5e1);
    background: transparent;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .role-pill:hover {
    border-color: #00b14f;
    color: #00b14f;
  }

  .role-pill.active {
    background: #00b14f;
    border-color: #00b14f;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(0, 177, 79, 0.25);
  }

  .form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;
  }

  .input {
    border-radius: 20px;
    border: 1.5px solid var(--border-color, #cbd5e1);
    outline: 0 !important;
    box-sizing: border-box;
    padding: 12px 16px;
    font-size: 13.5px;
    background: var(--input-bg, #ffffff);
    color: var(--text-primary, #0f172a);
    transition: all 0.2s ease;
  }

  .input:focus {
    border-color: #00b14f;
    box-shadow: 0 0 0 3px rgba(0, 177, 79, 0.15);
  }

  .select-input {
    cursor: pointer;
  }

  .page-link {
    text-decoration: underline;
    margin: -2px 0 2px;
    text-align: end;
    color: #747474;
    text-decoration-color: #747474;
  }

  .page-link-label {
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary, #64748b);
    transition: color 0.15s ease;
  }

  .page-link-label:hover {
    color: #00b14f;
  }

  .form-btn {
    padding: 11px 16px;
    font-size: 14px;
    font-weight: 700;
    border-radius: 20px;
    border: 0 !important;
    outline: 0 !important;
    background: #00b14f;
    color: white;
    cursor: pointer;
    box-shadow: rgba(0, 177, 79, 0.35) 0px 4px 14px;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .form-btn:hover {
    background: #009944;
    transform: translateY(-1px);
    box-shadow: rgba(0, 177, 79, 0.45) 0px 6px 18px;
  }

  .form-btn:active {
    transform: scale(0.98);
    box-shadow: none;
  }

  .sign-up-label {
    margin: 4px 0 0 0;
    font-size: 11.5px;
    color: var(--text-secondary, #64748b);
    text-align: center;
  }

  .sign-up-link {
    margin-left: 5px;
    font-size: 12px;
    text-decoration: underline;
    text-decoration-color: #00b14f;
    color: #00b14f;
    cursor: pointer;
    font-weight: 800;
  }

  .buttons-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    margin-top: 18px;
    gap: 10px;
  }

  .google-login-button {
    border-radius: 20px;
    box-sizing: border-box;
    padding: 10px 16px;
    box-shadow: rgba(0, 0, 0, 0.08) 0px 4px 16px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    gap: 8px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    user-select: none;
  }

  .google-login-button:hover {
    transform: translateY(-1.5px);
  }


  .google-login-button {
    background-color: var(--bg-card, #ffffff);
    color: var(--text-primary, #0f172a);
    border: 1.5px solid var(--border-color, #cbd5e1);
  }

  .google-icon {
    font-size: 18px;
  }

  .error-alert {
    margin-top: 12px;
    font-size: 12px;
    color: #ef4444;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    padding: 10px;
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 16px;
  }

  .modal-content {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 18px;
    padding: 24px;
    width: 340px;
    max-width: 100%;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }

  .modal-desc {
    font-size: 12px;
    color: var(--text-secondary, #64748b);
    line-height: 1.5;
    margin-bottom: 14px;
  }

  .modal-cancel-btn {
    padding: 8px 14px;
    border-radius: 12px;
    border: 1px solid var(--border-color, #cbd5e1);
    background: transparent;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }
`;

export default LoginForm;
