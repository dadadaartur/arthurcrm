export default function PremiumModal({ isOpen, onClose, title, children, showCloseButton = true }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
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
          <button onClick={onClose} className="btn-outline text-sm px-6 py-2.5" style={{ marginTop: 24 }}>
            Понятно
          </button>
        )}
      </div>
    </div>
  )
}
