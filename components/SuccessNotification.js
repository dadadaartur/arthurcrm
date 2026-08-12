import { useEffect, useState } from 'react'

export default function SuccessNotification({ show, message, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(() => onClose?.(), 300) // ждём окончание анимации исчезновения
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!show && !visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div
        className={`transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
        style={{
          background: 'var(--lumen-surface)',
          border: '1px solid var(--lumen-line)',
          boxShadow: '0 0 0 1px var(--lumen-gold-glow), 0 30px 60px -20px rgba(20,22,30,0.3)',
          borderRadius: '24px',
          padding: '40px 48px',
          textAlign: 'center'
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="#B8934C" strokeWidth="2" fill="none" />
          <path d="M20 32L28 40L44 24" stroke="#B8934C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <p style={{ color: 'var(--lumen-ink)', fontSize: 18, fontWeight: 600, marginTop: 16, fontFamily: 'var(--lumen-font-display)' }}>{message}</p>
      </div>
    </div>
  )
}
