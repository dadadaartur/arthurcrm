import { useEffect } from 'react'

// Монета с фирменной буквой «К» — премиальная кинематографичная
// анимация подтверждения значимого денежного действия. Изначально жила
// только внутри resources.js (пополнение фонда компании) под именем
// PaymentHole, вынесена в общий компонент 31 августа 2026, чтобы её
// можно было переиспользовать и для перевода кармиков коллеге — вместо
// обычного текстового уведомления, как было раньше («несколько разных
// действий сопровождаются обычным уведомлением» — это одно из них).
// Фон намеренно тёмный — редкий, полноэкранный момент-кульминация, а
// не рутинное действие (в отличие от ActionFeedback — того самого
// «обычного уведомления», которое остаётся лёгким тостом специально
// для частых, повседневных действий).
export default function PaymentSeal({ mode, amount, label = 'кармиков зачислено', errorText, onDone }) {
  const isError = mode === 'error'
  useEffect(() => {
    const t = setTimeout(onDone, isError ? 5200 : 4200)
    return () => clearTimeout(t)
  }, [isError, onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'radial-gradient(circle at 50% 42%, #10162a 0%, #05070f 78%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34 }}>
      <style>{`
        @keyframes coinRise { 0% { transform: scale(.4) translateY(18px); opacity: 0 } 100% { transform: scale(1) translateY(0); opacity: 1 } }
        @keyframes letterSettle { 0% { opacity: 0; transform: translateY(5px) scale(.86) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes ringPulse { 0% { transform: scale(1); opacity: .5 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes markDraw { to { stroke-dashoffset: 0 } }
        @keyframes resultReveal { 0% { opacity: 0; transform: translateY(12px) } 100% { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div style={{ position: 'relative', width: 156, height: 156, flexShrink: 0 }}>
        {/* Кольцо-пульс — один спокойный импульс подтверждения, не повторяется по кругу */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${isError ? 'rgba(220,38,38,0.5)' : 'rgba(255,215,0,0.55)'}`, animation: 'ringPulse 1.1s cubic-bezier(0.16,1,0.3,1) 1.15s both' }} />

        {/* Сама монета — золотой градиент, тёмная обводка, медленная явная сборка (1.1с) */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ffe9a8, #d4a017 55%, #9a720b 100%)',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.25) inset, 0 18px 50px rgba(0,0,0,0.5), 0 0 60px ${isError ? 'rgba(220,38,38,0.15)' : 'rgba(255,193,7,0.28)'}`,
          animation: 'coinRise 1.1s cubic-bezier(0.16,1,0.3,1) both',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Буква «К» — фирменный символ, появляется чуть позже монеты, оседая на месте */}
          <span style={{ fontSize: 66, fontWeight: 800, color: '#14171f', fontFamily: 'Inter, sans-serif', animation: 'letterSettle .7s cubic-bezier(0.16,1,0.3,1) .55s both', textShadow: '0 1px 0 rgba(255,255,255,0.15)' }}>К</span>
        </div>

        {/* Маленький знак подтверждения/ошибки поверх нижнего края монеты */}
        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 40, height: 40, borderRadius: '50%', background: '#151a2e', border: `2px solid ${isError ? '#dc2626' : '#1a2332'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, animation: 'resultReveal .5s ease-out 1.3s both' }}>
          {isError ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 26, strokeDashoffset: 26, animation: 'markDraw .5s ease-out 1.55s forwards' }} />
            </svg>
          )}
        </div>
      </div>

      {/* Текст результата — появляется последним, спокойным сдвигом снизу вверх */}
      <div style={{ textAlign: 'center', animation: 'resultReveal .6s cubic-bezier(0.16,1,0.3,1) 1.9s both' }}>
        {isError ? (
          <div style={{ color: '#f87171', fontSize: 15, fontWeight: 600, maxWidth: 320 }}>{errorText || 'Действие не завершилось'}</div>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FFD700', letterSpacing: 0.2 }}>+{amount}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 0.3 }}>{label}</div>
          </>
        )}
      </div>
    </div>
  )
}
