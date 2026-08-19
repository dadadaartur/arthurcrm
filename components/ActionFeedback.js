import { useEffect, useState } from 'react'

export default function ActionFeedback({ state, onClose }) {
  const [stage, setStage] = useState('idle')
  const nonce = state?.nonce

  useEffect(() => {
    if (!state?.open) { setStage('idle'); return }
    setStage('flying')
    const t1 = setTimeout(() => setStage('explode'), 1000)
    const t2 = setTimeout(() => setStage('show'), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [nonce, state?.open])

  if (!state?.open) return null
  const isSuccess = state.type === 'success'
  const accent = isSuccess ? '#FFD700' : '#f87171'
  const accent2 = isSuccess ? '#4ade80' : '#ef4444'

  return (
    <div key={nonce} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      animation: 'afOverlayIn 0.5s ease-out',
    }}>
      {/* Кометы — мягкие, размытые */}
      <div style={{ position: 'absolute', left: stage === 'flying' ? '50%' : '-20%', top: stage === 'flying' ? '50%' : '30%', transform: 'translate(-50%,-50%) rotate(20deg)', transition: stage === 'flying' ? 'all 1s cubic-bezier(0.3,0.7,0.3,1)' : 'none', opacity: stage === 'flying' ? 1 : 0, filter: 'blur(1px)' }}>
        <CometTail color={accent} />
      </div>
      <div style={{ position: 'absolute', right: stage === 'flying' ? '50%' : '-20%', top: stage === 'flying' ? '50%' : '70%', transform: 'translate(50%,-50%) rotate(-20deg) scaleX(-1)', transition: stage === 'flying' ? 'all 1s cubic-bezier(0.3,0.7,0.3,1)' : 'none', opacity: stage === 'flying' ? 1 : 0, filter: 'blur(1px)' }}>
        <CometTail color={accent2} />
      </div>

      {/* Взрыв — органичные размытые частицы */}
      {(stage === 'explode' || stage === 'show') && (
        <div style={{ position: 'absolute', left: '50%', top: '50%' }}>
          {Array.from({ length: 26 }).map((_, i) => {
            const angle = (i / 26) * Math.PI * 2 + Math.random() * 0.3
            const dist = 90 + Math.random() * 140
            const size = 3 + Math.random() * 7
            const c = i % 2 ? accent : accent2
            return (
              <span key={i} className="af-p" style={{
                '--dx': Math.cos(angle) * dist + 'px',
                '--dy': Math.sin(angle) * dist + 'px',
                width: size, height: size,
                background: c,
                borderRadius: `${40 + Math.random() * 30}% ${60 - Math.random() * 30}% ${50 + Math.random() * 20}% ${50 - Math.random() * 20}%`,
                filter: `blur(${1 + Math.random() * 2}px)`,
                boxShadow: `0 0 ${size * 2.5}px ${c}`,
              }} />
            )
          })}
          <div className="af-ring" style={{ borderColor: accent, filter: 'blur(2px)' }} />
          <div className="af-ring2" style={{ borderColor: accent2, filter: 'blur(4px)' }} />
        </div>
      )}

      {/* Карточка результата */}
      <div style={{
        position: 'relative', zIndex: 2, maxWidth: 460, width: '90%',
        padding: '34px 30px 26px', borderRadius: 24,
        background: 'linear-gradient(150deg, rgba(24,30,54,0.96), rgba(10,14,28,0.98))',
        border: `1px solid ${accent}55`,
        boxShadow: `0 0 60px ${accent}33, 0 20px 60px rgba(0,0,0,0.6)`,
        backdropFilter: 'blur(16px)', textAlign: 'center',
        opacity: stage === 'show' ? 1 : 0,
        transform: stage === 'show' ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(14px)',
        transition: 'all 0.6s cubic-bezier(0.34,1.4,0.5,1)',
      }}>
        {/* Красивый крестик закрытия */}
        <button onClick={onClose} className="af-close" title="Закрыть">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <circle cx="17" cy="17" r="15" stroke={accent} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 5" className="af-close-ring" />
            <path d="M12 12 L22 22 M22 12 L12 22" stroke={accent} strokeWidth="2" strokeLinecap="round" className="af-close-x" />
          </svg>
        </button>

        <div style={{
          width: 92, height: 92, margin: '0 auto 18px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}33, transparent 70%)`,
          border: `1.5px solid ${accent}77`,
          boxShadow: `0 0 40px ${accent}55, inset 0 0 24px ${accent}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: 'blur(0.3px)',
        }}>
          {isSuccess ? (
            <svg width="46" height="46" viewBox="0 0 60 60" fill="none">
              <path className="af-draw" d="M14 31 L26 43 L46 18" stroke={accent} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 12px ${accent})` }} />
            </svg>
          ) : (
            <svg width="46" height="46" viewBox="0 0 60 60" fill="none">
              <path className="af-draw" d="M18 18 L42 42" stroke={accent} strokeWidth="4.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${accent})` }} />
              <path className="af-draw2" d="M42 18 L18 42" stroke={accent} strokeWidth="4.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${accent})` }} />
            </svg>
          )}
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', lineHeight: 1.5, textShadow: `0 0 20px ${accent}66` }}>
          {state.message}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 10 }}>
          {isSuccess ? 'Действие выполнено' : 'Что-то пошло не так — подробности выше'}
        </div>
      </div>

      <style jsx>{`
        @keyframes afOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        .af-p { position: absolute; left: 0; top: 0; animation: afFly 1.4s cubic-bezier(0.15,0.9,0.25,1) forwards; }
        @keyframes afFly { 0% { transform: translate(0,0) scale(1); opacity: 1; } 70% { opacity: 0.9; } 100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; } }
        .af-ring, .af-ring2 { position: absolute; left: 50%; top: 50%; width: 20px; height: 20px; margin: -10px; border-radius: 50%; border: 2px solid; animation: afRing 1.1s ease-out forwards; }
        .af-ring2 { animation-delay: 0.15s; }
        @keyframes afRing { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(9); opacity: 0; } }
        .af-draw { stroke-dasharray: 70; stroke-dashoffset: 70; animation: afDraw 0.6s ease-out 0.1s forwards; }
        .af-draw2 { stroke-dasharray: 40; stroke-dashoffset: 40; animation: afDraw 0.5s ease-out 0.35s forwards; }
        @keyframes afDraw { to { stroke-dashoffset: 0; } }
        .af-close { position: absolute; top: 12px; right: 12px; background: none; border: none; cursor: pointer; padding: 4px; transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .af-close:hover { transform: rotate(90deg) scale(1.12); }
        .af-close-ring { transform-origin: 17px 17px; animation: afSpin 6s linear infinite; }
        @keyframes afSpin { to { transform: rotate(360deg); } }
        .af-close:hover .af-close-x { filter: drop-shadow(0 0 6px currentColor); }
      `}</style>
    </div>
  )
}

function CometTail({ color }) {
  return (
    <div style={{ position: 'relative', width: 240, height: 8 }}>
      <div style={{ position: 'absolute', left: 0, top: 2, width: 200, height: 4, borderRadius: 4, background: `linear-gradient(90deg, transparent, ${color}66, ${color})`, filter: 'blur(3px)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, width: 12, height: 12, borderRadius: '50%', background: `radial-gradient(circle, #fff, ${color})`, boxShadow: `0 0 24px ${color}, 0 0 48px ${color}88`, filter: 'blur(0.5px)' }} />
    </div>
  )
}
