import { useEffect, useState } from 'react'

// Уведомление об успехе/ошибке действия — переделано 31 августа 2026
// (по обратной связи: было «старое, чёрное», летящие кометы + взрыв
// частиц + блокирующий весь экран оверлей, без автозакрытия). Это
// используется в 23 местах проекта на любое рутинное действие
// (сохранил профиль, создал сотрудника, отправил задание) — для такой
// частоты полноэкранная кинематографичная сцена, как у зачисления
// денег, была бы навязчивой, а не премиальной. Здесь другой принцип:
// компактный, ненавязчивый тост сверху, не блокирует страницу под
// собой, закрывается сам — премиальность через сдержанность, а не
// через зрелищность.
export default function ActionFeedback({ state, onClose }) {
  const [visible, setVisible] = useState(false)
  const nonce = state?.nonce

  useEffect(() => {
    if (!state?.open) { setVisible(false); return }
    // Кадр на смену DOM перед стартом transition — иначе браузер может
    // схлопнуть появление и исчезновение в один кадр без анимации.
    const raf = requestAnimationFrame(() => setVisible(true))
    const hideAt = state.type === 'error' ? 5000 : 3200
    const t = setTimeout(() => setVisible(false), hideAt)
    const closeAt = hideAt + 400 // даём время на анимацию исчезновения
    const t2 = setTimeout(onClose, closeAt)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); clearTimeout(t2) }
  }, [nonce, state?.open])

  if (!state?.open) return null
  const isSuccess = state.type === 'success'
  const accent = isSuccess ? '#137a39' : '#dc2626'

  return (
    <div key={nonce} style={{ position: 'fixed', top: 20, left: 0, right: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none', padding: '0 16px' }}>
      <div
        role="status"
        style={{
          pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 12,
          maxWidth: 420, padding: '13px 18px 13px 14px', borderRadius: 16,
          background: 'var(--bg-card, #fff)', border: `1px solid ${accent}40`,
          boxShadow: '0 10px 30px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.08)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-14px)',
          transition: 'opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSuccess ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="af-draw" /></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={accent} strokeWidth="2.6" strokeLinecap="round" className="af-draw" /></svg>
          )}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #161b28)', lineHeight: 1.4, flex: 1 }}>{state.message}</span>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }} aria-label="Закрыть" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, color: 'var(--text-muted, #94a0b8)', display: 'flex' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <style jsx>{`
        .af-draw { stroke-dasharray: 24; stroke-dashoffset: 24; animation: afDraw 0.35s ease-out 0.15s forwards; }
        @keyframes afDraw { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  )
}
