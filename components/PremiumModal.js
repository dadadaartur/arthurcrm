export default function PremiumModal({ isOpen, onClose, title, children, showCloseButton = true }) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(10, 10, 15, 0.8)',
          border: '1px solid rgba(255,215,0,0.4)',
          borderRadius: 20,
          padding: '32px 28px',
          maxWidth: '440px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(255,215,0,0.3), 0 0 80px rgba(255,180,0,0.1)',
          backdropFilter: 'blur(12px)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h3 style={{
            fontSize: 20,
            fontWeight: 500,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 10px rgba(255,200,0,0.5)',
            letterSpacing: 1
          }}>
            {title}
          </h3>
        )}
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.6 }}>
          {children}
        </div>
        {showCloseButton && (
          <button
            onClick={onClose}
            style={{
              marginTop: 24,
              background: 'transparent',
              border: '1px solid rgba(255,215,0,0.5)',
              borderRadius: 50,
              padding: '10px 28px',
              color: '#FFD700',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s',
              backdropFilter: 'blur(4px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,215,0,0.15)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(255,200,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Понятно
          </button>
        )}
      </div>
    </div>
  )
}
