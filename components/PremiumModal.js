export default function PremiumModal({ isOpen, onClose, title, children, showCloseButton = true }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {title && <h3 className="text-xl font-semibold mb-4 text-gold">{title}</h3>}
        <div className="text-gray-600">{children}</div>
        {showCloseButton && (
          <button onClick={onClose} className="btn-gold mt-6">Понятно</button>
        )}
      </div>
    </div>
  )
}
