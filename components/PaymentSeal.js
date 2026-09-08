import { useEffect } from 'react'

// Печать подтверждения действия — абстрактная, типографическая версия
// (2 сентября 2026). Первые две попытки — золотая монета, затем
// иллюстрированная буква «К» с сердечком по референсу логотипа — были
// отклонены как «низкое качество прорисовки, по-детски». Иллюстрация
// персонажа от руки через SVG-пути — это то, что действительно плохо
// получается без настоящего дизайнера или генератора изображений.
// Вместо борьбы с этим ограничением — уход в то, что SVG умеет отрисовать
// безупречно точно: прецизионная геометрия (тонкое кольцо, будто ободок
// премиальных часов) и типографика (крупная сумма элегантным серифом).
// Кольцо вычерчивается само по контуру — кинематографично за счёт
// точности, а не за счёт попытки нарисовать персонажа.
const RADIUS = 54
const CIRC = 2 * Math.PI * RADIUS

export default function PaymentSeal({ mode, amount, sign = '+', label = 'Перевод выполнен', sublabel, errorText, onDone }) {
  const isError = mode === 'error'
  useEffect(() => {
    const t = setTimeout(onDone, isError ? 4600 : 3600)
    return () => clearTimeout(t)
  }, [isError, onDone])

  const ringColorA = isError ? '#94a3b8' : '#8a6208'
  const ringColorB = isError ? '#64748b' : '#7c3aed'

  return (
    <div
      role="status"
      onClick={onDone}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.32)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <style>{`
        @keyframes sealCardIn { 0% { opacity: 0; transform: scale(.94) translateY(8px) } 100% { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes ringDraw { from { stroke-dashoffset: ${CIRC}; } to { stroke-dashoffset: 0; } }
        @keyframes amountIn { 0% { opacity: 0; transform: scale(.85); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes labelIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 300, background: 'var(--bg-card, #fff)', borderRadius: 24, padding: '36px 32px 32px',
          border: '1px solid var(--border-subtle, rgba(15,23,42,0.09))', boxShadow: '0 16px 48px rgba(15,23,42,0.16)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
          animation: 'sealCardIn .4s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="ps-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={ringColorA} />
                <stop offset="100%" stopColor={ringColorB} />
              </linearGradient>
            </defs>
            <circle
              cx="64" cy="64" r={RADIUS} fill="none" stroke="url(#ps-ring)" strokeWidth="2"
              strokeDasharray={CIRC} strokeDashoffset={CIRC} strokeLinecap="round"
              transform="rotate(-90 64 64)"
              style={{ animation: 'ringDraw 0.95s cubic-bezier(0.65,0,0.35,1) .1s forwards' }}
            />
          </svg>

          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isError ? (
              <svg width="30" height="30" viewBox="0 0 24 24" style={{ opacity: 0, animation: 'amountIn .35s cubic-bezier(0.16,1,0.3,1) 1.05s forwards' }}>
                <path d="M6 6l12 12M18 6L6 18" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            ) : (
              <span style={{
                fontSize: 30, fontWeight: 400, color: 'var(--text-primary, #161b28)',
                fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.5px',
                opacity: 0, animation: 'amountIn .4s cubic-bezier(0.16,1,0.3,1) 1.05s forwards',
              }}>
                {sign}{amount}
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', opacity: 0, animation: 'labelIn .4s cubic-bezier(0.16,1,0.3,1) 1.35s forwards' }}>
          {isError ? (
            <div style={{ color: '#dc2626', fontSize: 14, fontWeight: 500, maxWidth: 230 }}>{errorText || 'Действие не завершилось'}</div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary, #161b28)' }}>{label}</div>
              {sublabel && <div style={{ fontSize: 13, color: 'var(--text-secondary, #5b6478)', marginTop: 4 }}>{sublabel}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
