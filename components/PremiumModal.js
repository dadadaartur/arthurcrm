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
            fontFamily: 'var(--lumen-font-display)',
            color: 'var(--lumen-ink)',
            letterSpacing: '-0.01em'
          }}>
            {title}
          </h3>
        )}
        <div style={{ color: 'var(--lumen-ink-soft)', fontSize: 15, lineHeight: 1.6 }}>
          {children}
        </div>
        {showCloseButton && (
          <button onClick={onClose} className="btn-lumen-outline" style={{ marginTop: 24 }}>
            Понятно
          </button>
        )}
      </div>
    </div>
  )
}
