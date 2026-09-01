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
          background: 'linear-gradient(145deg, #0B1E3F 0%, #0a1628 100%)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '24px',
          padding: '40px 48px',
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.2)',
          textAlign: 'center'
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="#D4AF37" strokeWidth="2" fill="none" />
          <path d="M20 32L28 40L44 24" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <p className="text-white text-lg font-semibold mt-4">{message}</p>
      </div>
    </div>
  )
}
