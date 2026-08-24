import { useEffect, useState } from 'react'

// Фирменная анимация успешного перевода — версия 4.
// Сценарий строго по шагам:
// 1) 0–1.1с: орбита прорисовывается, две тонкие голографные стрелки
//    (золото и фиолет) летят навстречу друг другу с противоположных точек;
// 2) 1.1с: стрелки встречаются в верхней точке — вспышка и искры из точки удара;
// 3) 1.3с: в центре появляется галочка (самопрорисовка) + ударные волны.
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

    const checkTimer = setTimeout(() => setCheckVisible(true), 1300)
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 450)
    }, 5400)

    return () => { clearInterval(tick); clearTimeout(hide); clearTimeout(checkTimer) }
  }, [show, amount])

  // Искры — вылетают ТОЛЬКО после столкновения стрелок (задержка от 1.12с),
  // из верхней точки орбиты, где стрелки встречаются
  const burst = Array.from({ length: 12 }, (_, i) => {
    const angle = ((i * 30) + 8) * (Math.PI / 180)
    const dist = 34 + (i % 4) * 14
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      size: 2 + (i % 3),
      gold: i % 3 !== 0,
      delay: 1.12 + (i % 5) * 0.05,
      dur: 0.8 + (i % 3) * 0.2,
    }
  })

  if (!show && !visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none px-4">
      <style>{`
        @keyframes ks-ring-draw { to { stroke-dashoffset: 0; } }
        @keyframes ks-flash {
          0% { transform: translate(-50%,-50%) scale(.2); opacity: 0; }
          25% { opacity: .95; }
          100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
        }
        @keyframes ks-spark {
          0% { transform: translate(0,0) scale(1); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate(var(--kx), var(--ky)) scale(.25); opacity: 0; }
        }
        @keyframes ks-wave {
          0% { transform: scale(.3); opacity: .7; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes ks-check-draw { to { stroke-dashoffset: 0; } }
        @keyframes ks-check-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(212,175,55,.6)); }
          50% { filter: drop-shadow(0 0 18px rgba(212,175,55,1)); }
        }
        @keyframes ks-pop-in {
          0% { transform: scale(.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .ks-ring {
          stroke-dasharray: 502;
          stroke-dashoffset: 502;
          animation: ks-ring-draw 1s ease-out forwards;
        }
        .ks-flash {
          position: absolute; left: 110px; top: 30px;
          width: 22px; height: 22px; border-radius: 9999px;
          background: radial-gradient(circle, #FFF7D6 0%, #FFD700 40%, rgba(255,215,0,0) 70%);
          opacity: 0;
          animation: ks-flash .7s ease-out 1.1s forwards;
        }
        .ks-spark {
          position: absolute; left: 110px; top: 30px;
          border-radius: 9999px; opacity: 0;
          animation: ks-spark var(--kd) ease-out var(--kl) forwards;
        }
        .ks-wave {
          position: absolute; inset: 30px; border-radius: 9999px;
          opacity: 0; animation: ks-wave 1.8s ease-out 1.35s forwards;
        }
        .ks-wave-2 { animation-delay: 1.65s; }
        .ks-check-wrap {
          animation: ks-pop-in .35s ease-out forwards;
          transform-box: fill-box; transform-origin: center;
        }
        .ks-check-path {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: ks-check-draw .55s ease-out forwards, ks-check-glow 2s ease-in-out .6s infinite;
        }
      `}</style>

      <div
        className={`text-center transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
        style={{
          background: 'linear-gradient(145deg, #152238 0%, #0a1628 100%)',
          border: '1px solid rgba(212,175,55,.35)',
          borderRadius: 28,
          padding: '40px 52px 34px',
          boxShadow: '0 0 60px rgba(255,215,0,.25), 0 0 120px rgba(192,132,252,.12)',
        }}
      >
        <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
          {/* Вспышка в точке столкновения стрелок (верх орбиты) */}
          <div className="ks-flash" />

          {/* Искры из точки столкновения — стартуют после удара */}
          {burst.map((s, i) => (
            <span
              key={i}
              className="ks-spark"
              style={{
                width: s.size,
                height: s.size,
                background: s.gold ? '#D4AF37' : '#c084fc',
                boxShadow: `0 0 ${s.size * 3}px ${s.gold ? 'rgba(212,175,55,.9)' : 'rgba(192,132,252,.9)'}`,
                '--kx': `${s.x}px`,
                '--ky': `${s.y}px`,
                '--kd': `${s.dur}s`,
                '--kl': `${s.delay}s`,
              }}
            />
          ))}

          {/* Ударные волны — после появления галочки */}
          <div className="ks-wave" style={{ border: '1px solid rgba(212,175,55,.4)' }} />
          <div className="ks-wave ks-wave-2" style={{ border: '1px solid rgba(192,132,252,.3)' }} />

          <svg viewBox="0 0 220 220" width="220" height="220" className="absolute inset-0">
            <defs>
              <linearGradient id="ks-gold-tail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="ks-violet-tail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
              </linearGradient>
              <filter id="ks-glow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Траектории полёта (невидимые):
                  золотая — слева направо через верх,
                  фиолетовая — справа налево через верх (навстречу) */}
              <path id="ks-path-a" d="M 30,110 A 80,80 0 0,1 190,110" />
              <path id="ks-path-b" d="M 190,110 A 80,80 0 0,0 30,110" />
            </defs>

            {/* Орбитальное кольцо — прорисовывается вместе с полётом стрелок */}
            <circle className="ks-ring" cx="110" cy="110" r="80" fill="none"
              stroke="rgba(212,175,55,.2)" strokeWidth="0.8" />

            {/* Золотая стрелка: тонкий наконечник + тающий хвост */}
            <g filter="url(#ks-glow)">
              <line x1="-30" y1="0" x2="-8" y2="0" stroke="url(#ks-gold-tail)" strokeWidth="1" />
              <line x1="-16" y1="0" x2="-6" y2="0" stroke="#FFD700" strokeWidth="1.8" opacity="0.7" />
              <path d="M -7,-4.5 L 7,0 L -7,4.5" fill="none" stroke="#FFD700"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <animateMotion dur="1.15s" fill="freeze" rotate="auto"
                calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1">
                <mpath href="#ks-path-a" xlinkHref="#ks-path-a" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0"
                keyTimes="0;0.1;0.88;1" dur="1.15s" fill="freeze" />
            </g>

            {/* Фиолетовая стрелка: летит навстречу с другой стороны */}
            <g filter="url(#ks-glow)">
              <line x1="-30" y1="0" x2="-8" y2="0" stroke="url(#ks-violet-tail)" strokeWidth="1" />
              <line x1="-16" y1="0" x2="-6" y2="0" stroke="#c084fc" strokeWidth="1.8" opacity="0.7" />
              <path d="M -7,-4.5 L 7,0 L -7,4.5" fill="none" stroke="#c084fc"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <animateMotion dur="1.15s" fill="freeze" rotate="auto"
                calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1">
                <mpath href="#ks-path-b" xlinkHref="#ks-path-b" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0"
                keyTimes="0;0.1;0.88;1" dur="1.15s" fill="freeze" />
            </g>

            {/* Галочка в центре — итог перевода */}
            {checkVisible && (
              <g className="ks-check-wrap" filter="url(#ks-glow)">
                <circle cx="110" cy="110" r="30" fill="rgba(212,175,55,.07)"
                  stroke="rgba(212,175,55,.45)" strokeWidth="1" />
                <circle cx="110" cy="110" r="36" fill="none"
                  stroke="rgba(192,132,252,.25)" strokeWidth="0.6" />
                <path className="ks-check-path" d="M 94,111 L 105,123 L 127,97"
                  fill="none" stroke="#FFD700" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </svg>
        </div>

        <h3
          className="mt-2 font-bold"
          style={{
            fontSize: 22,
            background: 'linear-gradient(135deg, #FFD700, #a0e9ff, #c084fc)',
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
