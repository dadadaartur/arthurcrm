import { useEffect, useState } from 'react'

// Универсальная премиальная анимация успеха: золотая галочка, которая
// рисуется сама, расходящееся кольцо, искры и надпись. Без заголовков
// вроде "Информация" — только само сообщение (например "Товар создан").
export default function SuccessBurst({ show, message = 'Готово', onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) return
    setVisible(true)
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 400)
    }, 2200)
    return () => clearTimeout(hide)
  }, [show])

  if (!show && !visible) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none px-4">
      <style>{`
        @keyframes sb-pop { 0% { transform: scale(.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes sb-draw { to { stroke-dashoffset: 0; } }
        @keyframes sb-ring { 0% { transform: scale(.4); opacity: .8; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes sb-spark { 0% { transform: translate(0,0) scale(1); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(var(--sx), var(--sy)) scale(.3); opacity: 0; } }
        .sb-card { animation: sb-pop .4s cubic-bezier(.2,.9,.3,1.2) forwards; }
        .sb-check { stroke-dasharray: 60; stroke-dashoffset: 60; animation: sb-draw .5s ease-out .15s forwards; }
        .sb-ring { position: absolute; inset: 0; border-radius: 9999px; border: 1px solid rgba(212,175,55,.5); animation: sb-ring 1.4s ease-out forwards; }
        .sb-spark { position: absolute; left: 50%; top: 40%; border-radius: 9999px; opacity: 0; animation: sb-spark var(--sd) ease-out var(--sl) forwards; }
      `}</style>

      <div
        className={`sb-card relative text-center transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'linear-gradient(145deg, #152238 0%, #0a1628 100%)',
          border: '1px solid rgba(212,175,55,.4)', borderRadius: 28,
          padding: '40px 56px', boxShadow: '0 0 60px rgba(212,175,55,.3)',
        }}
      >
        <div className="sb-ring" />
        {/* Искры */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30) * Math.PI / 180
          const dist = 60 + (i % 3) * 18
          return (
            <span
              key={i}
              className="sb-spark"
              style={{
                width: 3, height: 3, background: i % 2 ? '#D4AF37' : '#c084fc',
                boxShadow: `0 0 8px ${i % 2 ? 'rgba(212,175,55,.9)' : 'rgba(192,132,252,.9)'}`,
                '--sx': `${Math.cos(angle) * dist}px`,
                '--sy': `${Math.sin(angle) * dist}px`,
                '--sd': `${0.9 + (i % 3) * 0.2}s`,
                '--sl': `${0.2 + (i % 4) * 0.08}s`,
              }}
            />
          )
        })}
        {/* Золотая галочка */}
        <svg width="72" height="72" viewBox="0 0 64 64" fill="none" className="mx-auto">
          <circle cx="32" cy="32" r="29" stroke="rgba(212,175,55,.35)" strokeWidth="1.5" />
          <path className="sb-check" d="M20 33 L28.5 41.5 L45 24" stroke="#FFD700" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 10px rgba(255,215,0,.7))' }} />
        </svg>
        <p
          className="mt-4 text-lg font-bold"
          style={{
            background: 'linear-gradient(135deg, #f97316, #c084fc)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', letterSpacing: 0.5,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}
