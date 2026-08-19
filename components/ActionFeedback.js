import { useEffect, useState } from 'react'

// Кинематографичная анимация: две кометы летят навстречу, сталкиваются,
// взрыв частиц, внутри появляется галочка (успех) или крестик (провал).
export default function ActionFeedback({ visible, type, message }) {
  const [stage, setStage] = useState('idle') // idle | flying | explode | show | fade

  useEffect(() => {
    if (!visible) { setStage('idle'); return }
    setStage('flying')
    const t1 = setTimeout(() => setStage('explode'), 900)
    const t2 = setTimeout(() => setStage('show'), 1400)
    const t3 = setTimeout(() => setStage('fade'), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [visible])

  if (!visible && stage === 'idle') return null

  const isSuccess = type === 'success'
  const accent = isSuccess ? '#FFD700' : '#f87171'
  const accent2 = isSuccess ? '#4ade80' : '#ef4444'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      opacity: stage === 'fade' ? 0 : 1,
      transition: 'opacity 0.4s ease-out',
    }}>
      {/* Затемнение фона */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at center, rgba(0,0,0,0.45), rgba(0,0,0,0.75))',
        backdropFilter: 'blur(4px)',
        opacity: stage === 'idle' ? 0 : 1,
        transition: 'opacity 0.3s',
      }} />

      {/* Комета 1 — слева */}
      <div style={{
        position: 'absolute',
        left: stage === 'flying' ? '50%' : '-15%',
        top: stage === 'flying' ? '50%' : '35%',
        transform: 'translate(-50%, -50%) rotate(25deg)',
        transition: stage === 'flying' ? 'all 0.9s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        opacity: stage === 'explode' || stage === 'show' || stage === 'fade' ? 0 : 1,
      }}>
        <Comet color={accent} />
      </div>

      {/* Комета 2 — справа */}
      <div style={{
        position: 'absolute',
        right: stage === 'flying' ? '50%' : '-15%',
        top: stage === 'flying' ? '50%' : '65%',
        transform: 'translate(50%, -50%) rotate(-25deg) scaleX(-1)',
        transition: stage === 'flying' ? 'all 0.9s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        opacity: stage === 'explode' || stage === 'show' || stage === 'fade' ? 0 : 1,
      }}>
        <Comet color={accent2} />
      </div>

      {/* Взрыв частиц */}
      {(stage === 'explode' || stage === 'show') && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          {Array.from({ length: 28 }).map((_, i) => {
            const angle = (i / 28) * Math.PI * 2
            const dist = 80 + Math.random() * 120
            const size = 2 + Math.random() * 4
            return (
              <span key={i} className="af-particle" style={{
                '--dist-x': Math.cos(angle) * dist + 'px',
                '--dist-y': Math.sin(angle) * dist + 'px',
                '--size': size + 'px',
                '--color': i % 2 === 0 ? accent : accent2,
                position: 'absolute', left: 0, top: 0,
                width: size, height: size, borderRadius: '50%',
                background: i % 2 === 0 ? accent : accent2,
                boxShadow: `0 0 ${size * 3}px ${i % 2 === 0 ? accent : accent2}`,
              }} />
            )
          })}
          {/* Центральная вспышка */}
          <div className="af-flash" style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 40, height: 40, borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}, ${accent2}, transparent 70%)`,
            filter: 'blur(2px)',
          }} />
        </div>
      )}

      {/* Итоговая иконка + сообщение */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        opacity: stage === 'show' ? 1 : stage === 'fade' ? 0 : 0,
        transform: stage === 'show' ? 'scale(1)' : 'scale(0.5)',
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}40, ${accent}15, transparent 70%)`,
          border: `2px solid ${accent}88`,
          boxShadow: `0 0 50px ${accent}66, 0 0 100px ${accent}33, inset 0 0 30px ${accent}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          {isSuccess ? (
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path className="af-check" d="M14 30 L26 42 L46 18"
                stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 10px ${accent})` }} />
            </svg>
          ) : (
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path className="af-cross1" d="M18 18 L42 42"
                stroke={accent} strokeWidth="4" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 10px ${accent})` }} />
              <path className="af-cross2" d="M42 18 L18 42"
                stroke={accent} strokeWidth="4" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 10px ${accent})` }} />
            </svg>
          )}
        </div>
        <div style={{
          fontSize: 17, fontWeight: 500, color: '#fff',
          textShadow: `0 0 20px ${accent}88, 0 2px 8px rgba(0,0,0,0.8)`,
          letterSpacing: 0.3, textAlign: 'center',
          maxWidth: 520, padding: '0 24px',
        }}>{message}</div>
      </div>

      <style jsx>{`
        .af-particle {
          animation: afParticle 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes afParticle {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(var(--dist-x), var(--dist-y)) scale(0.2); opacity: 0; }
        }
        .af-flash {
          animation: afFlash 0.6s ease-out forwards;
        }
        @keyframes afFlash {
          0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
          50%  { transform: translate(-50%, -50%) scale(3); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        .af-check {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: afDraw 0.5s ease-out forwards;
        }
        .af-cross1, .af-cross2 {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: afDraw 0.4s ease-out forwards;
        }
        .af-cross2 { animation-delay: 0.15s; }
        @keyframes afDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}

function Comet({ color }) {
  return (
    <div style={{ position: 'relative', width: 260, height: 6 }}>
      {/* Хвост */}
      <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
        width: 220, height: 4, borderRadius: 2,
        background: `linear-gradient(90deg, transparent 0%, ${color}30 40%, ${color}80 80%, ${color} 100%)`,
        filter: `blur(1.5px) drop-shadow(0 0 8px ${color})`,
      }} />
      {/* Шлейф шире */}
      <div style={{
        position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)',
        width: 180, height: 14, borderRadius: 7,
        background: `linear-gradient(90deg, transparent, ${color}15, ${color}40, ${color}80)`,
        filter: 'blur(5px)',
      }} />
      {/* Голова кометы */}
      <div style={{
        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
        width: 12, height: 12, borderRadius: '50%',
        background: `radial-gradient(circle, #fff, ${color})`,
        boxShadow: `0 0 20px ${color}, 0 0 40px ${color}88, 0 0 60px ${color}44`,
      }} />
    </div>
  )
}
