export default function PremiumModal({ isOpen, onClose, title, children, showCloseButton = true }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {title && (
          <h3 style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #8a6208, #db2777)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 0.4
          }}>
            {title}
          </h3>
        )}
        <div style={{ color: 'var(--text-secondary, #5b6478)', fontSize: 15, lineHeight: 1.6 }}>
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
