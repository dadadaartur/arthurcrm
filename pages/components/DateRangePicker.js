import { useEffect, useMemo, useRef, useState } from 'react'

// Премиальный выбор диапазона дат — светлая тема (31 августа 2026, по
// фидбеку: кнопка была слишком длинной при полном диапазоне и плохо
// читалась; сама панель календаря НЕ рендерится через портал, в отличие
// от DatePicker — значит, в отличие от него, остаётся полноценным
// потомком страницы и обязана следовать общей светлой теме, а не
// оставаться тёмным островом). Пресеты (Сегодня/7 дней/30 дней/...)
// уже существовали и раньше — просто были частью той же нечитаемой
// тёмной панели.
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
// Компактный формат — год только если отличается от текущего, без
// «года» дважды подряд в диапазоне одного года. Раньше полный диапазон
// с двумя годами занимал заметно больше места в пилюле, чем нужно.
function fmtShort(s, withYear) {
  if (!s) return null
  const d = fromISO(s)
  const y = d.getFullYear()
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${withYear ? ' ' + y : ''}`
}
function buildGrid(y, m) {
  const first = new Date(y, m, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(y, m, 1 - offset)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({ iso: toISO(d), day: d.getDate(), inMonth: d.getMonth() === m })
  }
  return cells
}

export default function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const base = from ? fromISO(from) : new Date()
    return { y: base.getFullYear(), m: base.getMonth() }
  })
  const rootRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const openPanel = () => {
    const base = from ? fromISO(from) : new Date()
    setView({ y: base.getFullYear(), m: base.getMonth() })
    setOpen(v => !v)
  }

  const days = useMemo(() => buildGrid(view.y, view.m), [view])
  const todayISO = toISO(new Date())

  const pick = (iso) => {
    if (!from || (from && to)) onChange({ from: iso, to: '' })
    else if (iso < from) onChange({ from: iso, to: '' })
    else onChange({ from, to: iso })
  }

  const prevMonth = () => setView(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
  const nextMonth = () => setView(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))

  const presets = [
    { label: 'Сегодня', fn: () => { const t = toISO(new Date()); return { from: t, to: t } } },
    { label: '7 дней', fn: () => { const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 6); return { from: toISO(f), to: toISO(t) } } },
    { label: '30 дней', fn: () => { const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 29); return { from: toISO(f), to: toISO(t) } } },
    { label: 'Этот месяц', fn: () => { const n = new Date(); return { from: toISO(new Date(n.getFullYear(), n.getMonth(), 1)), to: toISO(new Date(n.getFullYear(), n.getMonth() + 1, 0)) } } },
    { label: 'Прошлый месяц', fn: () => { const n = new Date(); return { from: toISO(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: toISO(new Date(n.getFullYear(), n.getMonth(), 0)) } } },
    { label: 'Всё время', fn: () => ({ from: '', to: '' }) },
  ]
  // Если текущий диапазон точно совпадает с одним из пресетов — в
  // пилюле показываем короткое имя пресета вместо двух полных дат
  // (главная причина, почему кнопка становилась длинной).
  const activePreset = presets.find(p => { const r = p.fn(); return r.from === (from || '') && r.to === (to || '') })

  const sameYear = from && to && fromISO(from).getFullYear() === fromISO(to).getFullYear()
  const label = activePreset
    ? activePreset.label
    : from && to
    ? `${fmtShort(from, !sameYear)} — ${fmtShort(to, true)}`
    : from ? `с ${fmtShort(from, true)}`
    : to ? `по ${fmtShort(to, true)}`
    : 'За всё время'

  return (
    <div ref={rootRef} className="relative inline-block">
      {/* Пилюля-триггер — короткая даже для диапазона (см. label выше) */}
      <button
        onClick={openPanel}
        className="date-range-trigger flex items-center gap-2 transition-all"
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${open ? '#8a6208' : 'var(--border-gold)'}`,
          borderRadius: 50,
          padding: '8px 16px',
          fontSize: 13,
          color: 'var(--text-primary)',
          boxShadow: open ? '0 0 0 3px rgba(138,98,8,0.1)' : 'var(--shadow-card)',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <rect x="1.5" y="2.5" width="13" height="12" rx="3" stroke="#8a6208" strokeWidth="1.2" />
          <path d="M1.5 6h13" stroke="#8a6208" strokeWidth="1.2" />
          <path d="M5 1v3M11 1v3" stroke="#8a6208" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="5.5" cy="9.5" r="1" fill="#0e7490" />
          <circle cx="8.5" cy="9.5" r="1" fill="#7c3aed" />
        </svg>
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="date-range-chevron" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M1 3l4 4 4-4" stroke="#5f6b80" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 flex flex-col sm:flex-row"
          style={{
            right: 0,
            minWidth: 470,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 20,
            boxShadow: 'var(--shadow-card-hover)',
            padding: 18,
            gap: 18,
          }}
        >
          {/* Пресеты — премиальные кнопки-кнопочки, как в топовых
              аналитических инструментах: подсвечен активный, остальные
              нейтральные */}
          <div className="flex sm:flex-col flex-wrap gap-1.5 sm:border-r sm:pr-4" style={{ borderColor: 'var(--border-subtle)' }}>
            {presets.map(p => {
              const isActive = activePreset?.label === p.label
              return (
                <button
                  key={p.label}
                  onClick={() => onChange(p.fn())}
                  className="text-left text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    color: isActive ? '#8a6208' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(184,134,11,0.08)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.color = '#8a6208' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1.5 rounded-full transition-all" style={{ background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="#8a6208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #8a6208, #0e7490, #7c3aed)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {MONTHS[view.m]} {view.y}
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-full transition-all" style={{ background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2l5 5-5 5" stroke="#8a6208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="w-9 text-center text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map(d => {
                const isSelected = d.iso === from || d.iso === to
                const inRange = from && to && d.iso > from && d.iso < to
                const isToday = d.iso === todayISO
                return (
                  <button
                    key={d.iso}
                    onClick={() => pick(d.iso)}
                    className="w-9 h-9 rounded-full text-xs flex items-center justify-center transition-all duration-150"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, #8a6208, #7c3aed)'
                        : inRange ? 'rgba(124,58,237,0.1)' : undefined,
                      color: isSelected ? '#fff' : d.inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: isToday && !isSelected ? '1px solid var(--border-gold)' : '1px solid transparent',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = inRange ? 'rgba(124,58,237,0.1)' : 'transparent' }}
                  >
                    {d.day}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between items-center mt-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span>С: <span style={{ color: '#8a6208', fontWeight: 600 }}>{from ? fmtShort(from, true) : '—'}</span></span>
              <span>По: <span style={{ color: '#7c3aed', fontWeight: 600 }}>{to ? fmtShort(to, true) : '—'}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
