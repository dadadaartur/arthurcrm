import { useEffect, useState } from 'react'

// Уведомление об успехе/ошибке действия — используется в 23 местах
// проекта на любое действие (сохранил профиль, создал сотрудника,
// отправил задание). История правок: полноэкранная сцена с кометами →
// (31 августа) компактный тост в углу экрана → (1 сентября, по прямой
// просьбе) тост читался как «системное уведомление браузера», не как
// осознанное подтверждение платформы — само положение в углу и
// малый размер создавали это ощущение независимо от того, какая
// иконка внутри. Сейчас — по центру экрана, тем же языком, что и
// PaymentSeal (кольцо вычерчивается, а не иконка мигает), но заметно
// компактнее и быстрее — PaymentSeal длится 3.6 сек на редкий денежный
// момент, здесь — вдвое быстрее, это действие может повторяться 20+ раз
// за смену. Автозакрытие сохранено — обязательный клик на каждое
// рутинное действие был бы утомителен. При ошибке держится дольше,
// чтобы явно прочитать причину, а не просто увидеть, что что-то не так.
// Фон-подложка декоративный, клики не перехватывает (pointerEvents:
// 'none') — визуально центрированное затемнение есть, но не блокирует
// работу со страницей под собой, если следующее действие происходит
// быстрее, чем закрывается предыдущее уведомление.
export default function ActionFeedback({ state, onClose }) {
  const [visible, setVisible] = useState(false)
  const nonce = state?.nonce
  const RADIUS = 34
  const CIRC = 2 * Math.PI * RADIUS

  useEffect(() => {
    if (!state?.open) { setVisible(false); return }
    const raf = requestAnimationFrame(() => setVisible(true))
    const hideAt = state.type === 'error' ? 4200 : 2200
    const t = setTimeout(() => setVisible(false), hideAt)
    const closeAt = hideAt + 350
    const t2 = setTimeout(onClose, closeAt)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); clearTimeout(t2) }
  }, [nonce, state?.open])

  if (!state?.open) return null
  const isSuccess = state.type === 'success'
  const accent = isSuccess ? '#137a39' : '#dc2626'
  const ringA = isSuccess ? '#8a6208' : '#94a3b8'
  const ringB = isSuccess ? '#7c3aed' : '#64748b'

  return (
    <div
      role="status"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: visible ? 'rgba(15,23,42,0.24)' : 'rgba(15,23,42,0)', backdropFilter: visible ? 'blur(2px)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, transition: 'background 0.3s, backdrop-filter 0.3s', pointerEvents: 'none' }}
    >
      <div
        key={nonce}
        onClick={onClose}
        style={{
          width: 240, background: 'var(--bg-card, #fff)', borderRadius: 20, padding: '28px 26px 24px',
          border: '1px solid var(--border-subtle, rgba(15,23,42,0.09))', boxShadow: '0 14px 40px rgba(15,23,42,0.16)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, pointerEvents: 'auto', cursor: 'pointer',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(.92)',
          transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
          <svg width="76" height="76" viewBox="0 0 76 76">
            <defs>
              <linearGradient id={`af-ring-${nonce}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={ringA} />
                <stop offset="100%" stopColor={ringB} />
              </linearGradient>
            </defs>
            <circle
              cx="38" cy="38" r={RADIUS} fill="none" stroke={`url(#af-ring-${nonce})`} strokeWidth="2"
              strokeDasharray={CIRC} strokeDashoffset={visible ? 0 : CIRC} strokeLinecap="round"
              transform="rotate(-90 38 38)"
              style={{ transition: visible ? 'stroke-dashoffset 0.5s cubic-bezier(0.65,0,0.35,1) 0.05s' : 'none' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(.5)', transition: 'opacity 0.25s ease-out 0.4s, transform 0.3s cubic-bezier(0.34,1.4,0.64,1) 0.4s' }}>
              {isSuccess ? (
                <path d="M5 12.5l4.5 4.5L19 7" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M6 6l12 12M18 6L6 18" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
              )}
            </svg>
          </div>
        </div>

        <div style={{
          textAlign: 'center', fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'var(--text-primary, #161b28)',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.3s ease-out 0.5s, transform 0.3s ease-out 0.5s',
        }}>
          {state.message}
        </div>
      </div>
    </div>
  )
}
