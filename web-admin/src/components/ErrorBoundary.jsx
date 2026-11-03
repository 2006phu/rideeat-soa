import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL UI ERROR CAUGHT BY ERROR_BOUNDARY:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            fontFamily: "'Inter', sans-serif",
            background: '#0b0f19',
            color: '#f8fafc',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              background: '#151c2c',
              border: '1px solid #283548',
              borderRadius: '16px',
              padding: '32px 24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#f43f5e' }}>
              Đã xảy ra sự cố hiển thị giao diện
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Hệ thống đã tự động ghi nhận lỗi để tránh hiện tượng trắng xóa màn hình. Bạn có thể thử tải lại trang hoặc khôi phục dữ liệu ban đầu.
            </p>
            {this.state.error && (
              <pre
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  color: '#fb7185',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '20px'
                }}
              >
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('RIDEEAT_ENV_MODE');
                  } catch (_) {}
                  window.location.reload();
                }}
                style={{
                  background: '#00b14f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Tải lại trang ngay
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
