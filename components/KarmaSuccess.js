import { useEffect, useState } from 'react'

// Фирменная анимация успешного перевода — версия 3.
// Две тонкие голографные стрелки летят навстречу друг другу по орбите,
// оставляя светящийся шлейф. В момент встречи в центре появляется
// галочка (stroke-анимация самопрорисовки). Ударная волна, искры,
// счётчик суммы. Без стандартных иконок и эмодзи.
export default function KarmaSuccess({ show, amount, recipientName, onClose }) {
  const [visible, setVisible] = useState(false)
  const [counter, setCounter] = useState(0)
  const [checkVisible, setCheckVisible] = useState(false)

  useEffect(() => {
    if (!show) return
    setVisible(true)
    setCounter(0)
    setCheckVisible(false)

    const target = Math.max(0, parseInt(amount, 10) || 0)
    const started = Date.now()
    const duration = 1100
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / duration)
      setCounter(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) clearInterval(tick)
    }, 30)

    // Галочка появляется через 1.2 сек (когда стрелки встретились)
    const checkTimer = setTimeout(() => setCheckVisible(true), 1200)

    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 450)
    }, 5200)

    return () => { clearInterval(tick); clearTimeout(hide); clearTimeout(checkTimer) }
  }, [show, amount])

  if (!show && !visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none px-4">
      <style>{`
        @keyframes ks-wave {
          0% { transform: scale(.3); opacity: .7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ks-spark {
          0% { transform: translate(0,0) scale(1); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--kx), var(--ky)) scale(.2); opacity: 0; }
        }
        @keyframes ks-check-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes ks-check-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(212,175,55,.6)); }
          50% { filter: drop-shadow(0 0 20px rgba(212,175,55,1)); }
        }
        @keyframes ks-arrow-orbit {
          0% { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes ks-trail-fade {
          0% { opacity: .6; }
          100% { opacity: 0; }
        }
        @keyframes ks-pulse-ring {
          0%, 100% { transform: scale(1); opacity: .3; }
          50% { transform: scale(1.08); opacity: .6; }
        }
        .ks-wave { animation: ks-wave 1.8s ease-out forwards; }
        .ks-wave-2 { opacity: 0; animation: ks-wave 1.8s ease-out .4s forwards; }
        .ks-spark {
          position: absolute; left: 50%; top: 50%;
          border-radius: 9999px; opacity: 0;
          animation: ks-spark var(--kd) ease-out var(--kl) forwards;
        }
        .ks-check-path {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: ks-check-draw .6s ease-out forwards, ks-check-glow 2s ease-in-out .6s infinite;
        }
        .ks-arrow-gold {
          offset-path: path('M 30,110 A 80,80 0 0,1 190,110');
          animation: ks-arrow-orbit 1.2s ease-in-out forwards;
        }
        .ks-arrow-violet {
          offset-path: path('M 190,110 A 80,80 0 0,1 30,110');
          animation: ks-arrow-orbit 1.2s ease-in-out .15s forwards;
        }
        .ks-ring { animation: ks-pulse-ring 3s ease-in-out infinite; transform-origin: 110px 110px; }
      `}</style>

      <div
        className={`text-center transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
        style={{
          background: 'linear-gradient(145deg, #152238 0%, #0a1628 100%)',
          border: '1px solid rgba(212,175,55,.35)',
          borderRadius: 28,
          padding: '40px 52px 34px',
          boxShadow: '0 0 60px rgba(249,115,22,.25), 0 0 120px rgba(192,132,252,.12)',
        }}
      >
        <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
          {/* Ударные волны */}
          <div className="ks-wave absolute rounded-full" style={{ inset: 20, border: '1px solid rgba(212,175,55,.4)' }} />
          <div className="ks-wave-2 absolute rounded-full" style={{ inset: 20, border: '1px solid rgba(192,132,252,.3)' }} />

          {/* Искры */}
          {Array.from({ length: 16 }, (_, i) => {
            const angle = ((i * 360) / 16 + (i % 3) * 7) * (Math.PI / 180)
            const dist = 70 + (i % 5) * 24
            const gold = i % 3 !== 0
            return (
              <span
                key={i}
                className="ks-spark"
                style={{
                  width: 2 + (i % 3) * 1.5,
                  height: 2 + (i % 3) * 1.5,
                  background: gold ? '#D4AF37' : '#c084fc',
                  boxShadow: `0 0 ${(2 + (i % 3) * 1.5) * 3}px ${gold ? 'rgba(212,175,55,.9)' : 'rgba(192,132,252,.9)'}`,
                  '--kx': `${Math.cos(angle) * dist}px`,
                  '--ky': `${Math.sin(angle) * dist}px`,
                  '--kd': `${1.3 + (i % 4) * 0.2}s`,
                  '--kl': `${1.1 + (i % 7) * 0.1}s`,
                }}
              />
            )
          })}

          <svg viewBox="0 0 220 220" width="220" height="220" className="absolute inset-0">
            <defs>
              <linearGradient id="ks-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0" />
                <stop offset="30%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="ks-violet" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
                <stop offset="30%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <filter id="ks-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Тонкое пульсирующее кольцо-орбита */}
            <circle className="ks-ring" cx="110" cy="110" r="80" fill="none"
              stroke="rgba(212,175,55,.15)" strokeWidth="0.8" />

            {/* Голографная золотая стрелка (летит слева направо по верхней дуге) */}
            <g className="ks-arrow-gold" filter="url(#ks-glow)">
              <polygon points="0,-5 14,0 0,5" fill="url(#ks-gold)" />
              <line x1="-18" y1="0" x2="-2" y2="0" stroke="url(#ks-gold)" strokeWidth="1.5" opacity="0.7" />
              <line x1="-30" y1="0" x2="-18" y2="0" stroke="url(#ks-gold)" strokeWidth="1" opacity="0.35" />
            </g>

            {/* Голографная фиолетовая стрелка (летит справа налево по нижней дуге) */}
            <g className="ks-arrow-violet" filter="url(#ks-glow)">
              <polygon points="0,-5 14,0 0,5" fill="url(#ks-violet)" />
              <line x1="-18" y1="0" x2="-2" y2="0" stroke="url(#ks-violet)" strokeWidth="1.5" opacity="0.7" />
              <line x1="-30" y1="0" x2="-18" y2="0" stroke="url(#ks-violet)" strokeWidth="1" opacity="0.35" />
            </g>

            {/* Галочка в центре (появляется после встречи стрелок) */}
            {checkVisible && (
              <g filter="url(#ks-glow)">
                <circle cx="110" cy="110" r="28" fill="rgba(212,175,55,.08)"
                  stroke="rgba(212,175,55,.4)" strokeWidth="1" />
                <path
                  className="ks-check-path"
                  d="M 95,110 L 106,122 L 128,98"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </svg>
        </div>

        <h3
          className="mt-2 font-bold"
          style={{
            fontSize: 22,
            background: 'linear-gradient(135deg, #f97316, #c084fc)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: 0.5,
          }}
        >
          Перевод выполнен
        </h3>

        <p
          className="mt-1 font-bold"
          style={{ fontSize: 34, color: '#FFD700', textShadow: '0 0 22px rgba(212,175,55,.55)' }}
        >
          {counter} кармиков
        </p>

        {recipientName && (
          <p className="mt-1 text-sm text-gray-400">получатель: {recipientName}</p>
        )}
      </div>
    </div>
  )
}
