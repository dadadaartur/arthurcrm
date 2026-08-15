import { useEffect, useMemo, useState } from 'react'

// Фирменная анимация успешной операции Кармического банка — версия 2.
// В центре: вращающаяся гексаграмма (два треугольника) + 12 точек-кармиков
// по орбите + 6 радиальных лучей + пульсирующее ядро. Несколько слоёв
// вращения с разными скоростями дают глубину. Орбиты вокруг (золото и
// фиолет) символизируют поток кармы между отправителем и получателем.
export default function KarmaSuccess({ show, amount, recipientName, onClose }) {
  const [visible, setVisible] = useState(false)
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    if (!show) return
    setVisible(true)
    setCounter(0)

    const target = Math.max(0, parseInt(amount, 10) || 0)
    const started = Date.now()
    const duration = 1100
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / duration)
      setCounter(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) clearInterval(tick)
    }, 30)

    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 450)
    }, 4800)

    return () => { clearInterval(tick); clearTimeout(hide) }
  }, [show, amount])

  // Искры, разлетающиеся от центра
  const sparks = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => {
      const angle = ((i * 360) / 14 + (i % 3) * 9) * (Math.PI / 180)
      const dist = 78 + (i % 5) * 22
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        delay: 0.35 + (i % 7) * 0.12,
        dur: 1.4 + (i % 4) * 0.25,
        size: 2.5 + (i % 3) * 1.5,
        gold: i % 3 !== 0,
      }
    }), [])

  // 12 точек-кармиков по орбите (средний слой)
  const orbitDots = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180)
      return {
        x: 110 + Math.cos(angle) * 62,
        y: 110 + Math.sin(angle) * 62,
        size: i % 3 === 0 ? 3 : 2,
        color: i % 4 === 0 ? '#c084fc' : '#FFD700',
        delay: i * 0.08,
      }
    }), [])

  // 6 радиальных лучей из центра
  const rays = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = i * 60
      return {
        x1: 110 + Math.cos((angle - 90) * Math.PI / 180) * 18,
        y1: 110 + Math.sin((angle - 90) * Math.PI / 180) * 18,
        x2: 110 + Math.cos((angle - 90) * Math.PI / 180) * 38,
        y2: 110 + Math.sin((angle - 90) * Math.PI / 180) * 38,
      }
    }), [])

  if (!show && !visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none px-4">
      <style>{`
        @keyframes kb-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(212,175,55,.55)); }
          50% { transform: scale(1.15); filter: drop-shadow(0 0 26px rgba(212,175,55,.85)); }
        }
        @keyframes kb-draw { to { stroke-dashoffset: 0; } }
        @keyframes kb-wave {
          0% { transform: scale(.35); opacity: .8; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes kb-spark {
          0% { transform: translate(0,0) scale(1); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate(var(--kx), var(--ky)) scale(.3); opacity: 0; }
        }
        @keyframes kb-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes kb-rotate-rev {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes kb-ray-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.85; }
        }
        .kb-wave { animation: kb-wave 1.6s ease-out forwards; }
        .kb-wave-2 { opacity: 0; animation: kb-wave 1.6s ease-out .5s forwards; }
        .kb-spark { position: absolute; left: 50%; top: 50%; border-radius: 9999px; opacity: 0; animation: kb-spark var(--kd) ease-out var(--kl) forwards; }
        .kb-hexagram { transform-origin: 110px 110px; animation: kb-rotate 14s linear infinite; }
        .kb-hexagram-inner { transform-origin: 110px 110px; animation: kb-rotate-rev 20s linear infinite; }
        .kb-orbit-dots { transform-origin: 110px 110px; animation: kb-rotate 18s linear infinite; }
        .kb-rays { transform-origin: 110px 110px; animation: kb-ray-pulse 2.4s ease-in-out infinite; }
        .kb-core { transform-origin: 110px 110px; animation: kb-pulse 2.2s ease-in-out infinite; }
        .kb-arc { stroke-dasharray: 520; stroke-dashoffset: 520; animation: kb-draw 1.1s ease-out forwards; }
        .kb-arc-2 { animation-delay: .25s; }
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
          <div className="kb-wave absolute rounded-full" style={{ inset: 30, border: '1px solid rgba(212,175,55,.5)' }} />
          <div className="kb-wave-2 absolute rounded-full" style={{ inset: 30, border: '1px solid rgba(192,132,252,.4)' }} />

          {/* Искры */}
          {sparks.map((s, i) => (
            <span
              key={i}
              className="kb-spark"
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

          <svg viewBox="0 0 220 220" width="220" height="220" className="absolute inset-0">
            <defs>
              <linearGradient id="kb-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="kb-violet" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="kb-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <radialGradient id="kb-core-g" cx="50%" cy="42%" r="60%">
                <stop offset="0%" stopColor="#FFF7D6" />
                <stop offset="45%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#8a6d1f" />
              </radialGradient>
            </defs>

            {/* ВНЕШНИЙ СЛОЙ: две встречные орбиты с частицами */}
            <path id="kb-o1" className="kb-arc" d="M 110 28 A 82 82 0 1 1 109.9 28" fill="none" stroke="url(#kb-gold)" strokeWidth="1.2" opacity="0.6" />
            <path id="kb-o2" className="kb-arc kb-arc-2" d="M 110 192 A 82 82 0 1 1 110.1 192" fill="none" stroke="url(#kb-violet)" strokeWidth="1.2" opacity="0.6" />
            <circle r="4.5" fill="#FFD700" opacity="0.95">
              <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.9s">
                <mpath href="#kb-o1" />
              </animateMotion>
            </circle>
            <circle r="3.5" fill="#c084fc" opacity="0.9">
              <animateMotion dur="3.6s" repeatCount="indefinite" begin="1.2s">
                <mpath href="#kb-o2" />
              </animateMotion>
            </circle>

            {/* СРЕДНИЙ СЛОЙ: 12 точек-кармиков по орбите (вращаются) */}
            <g className="kb-orbit-dots">
              {orbitDots.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={d.size + 4}
                    fill={d.color}
                    opacity="0.15"
                  />
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={d.size}
                    fill={d.color}
                    opacity="0.95"
                  />
                </g>
              ))}
            </g>

            {/* СРЕДНИЙ СЛОЙ: гексаграмма (два треугольника, вращаются в разные стороны) */}
            <g className="kb-hexagram">
              <polygon
                points="110,50 150,120 70,120"
                fill="none"
                stroke="url(#kb-star-grad)"
                strokeWidth="1.2"
                opacity="0.75"
              />
            </g>
            <g className="kb-hexagram-inner">
              <polygon
                points="110,170 150,100 70,100"
                fill="none"
                stroke="url(#kb-star-grad)"
                strokeWidth="1.2"
                opacity="0.75"
              />
            </g>

            {/* ВНУТРЕННИЙ СЛОЙ: 6 радиальных лучей (пульсируют) */}
            <g className="kb-rays">
              {rays.map((r, i) => (
                <line
                  key={i}
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke="url(#kb-star-grad)"
                  strokeWidth="1"
                  opacity="0.7"
                />
              ))}
            </g>

            {/* ЦЕНТР: пульсирующее ядро */}
            <circle className="kb-core" cx="110" cy="110" r="9" fill="url(#kb-core-g)" />
            <circle cx="110" cy="110" r="14" fill="none" stroke="url(#kb-star-grad)" strokeWidth="0.8" opacity="0.4" />
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
