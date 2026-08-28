import { useState } from 'react'

export const PERIOD_LABELS = { daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно', quarterly: 'Ежеквартально', once: 'Разовая' }
const PERIOD_RULE = { daily: 'день', weekly: 'неделю', monthly: 'месяц', quarterly: 'квартал', once: 'весь срок' }

// Значок-вопрос с подсказкой правил обновления шкалы (п.2 из большого
// списка фидбека, 27 августа 2026 — «нет явного понимания дедлайна
// целей»). Клик открывает маленькую всплывающую подсказку, а не
// отдельную модалку — это справочная информация на одну строку.
export default function PeriodHint({ period, resetHour }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', color: '#aaa', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}>
        ?
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 22, right: 0, zIndex: 30, width: 220, padding: '10px 12px', borderRadius: 10, background: '#1a1f2f', border: '1px solid rgba(255,215,0,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', fontSize: 11, color: '#ccc', lineHeight: 1.5 }}>
          Шкала обновляется {period === 'daily' ? 'ежедневно' : period === 'weekly' ? 'раз в неделю' : period === 'monthly' ? 'раз в месяц' : period === 'once' ? 'один раз — это разовая цель без периодического сброса' : 'раз в квартал'}{period !== 'once' ? ` в ${String(resetHour ?? 8).padStart(2, '0')}:00 мск — значение считается за текущий ${PERIOD_RULE[period] || 'день'}` : ''}.
        </div>
      )}
    </span>
  )
}
