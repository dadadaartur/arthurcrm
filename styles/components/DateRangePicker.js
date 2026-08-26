import { useEffect, useMemo, useRef, useState } from 'react'

// Премиальный выбор диапазона дат в стиле Кармического банка.
// Полностью заменяет нативный input[type=date] (который выглядит как
// скелет). Снаружи — аккуратная пилюля с текущим диапазоном, внутри —
// панель: слева быстрые пресеты, справа календарь с подсветкой диапазона.
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
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
function fmtHuman(s) {
  if (!s) return null
  return fromISO(s).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
}
function buildGrid(y, m) {
  const first = new Date(y, m, 1)
  const offset = (first.getDay() + 6) % 7 // неделя с понедельника
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

  // Закрытие по клику вне панели
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

  // Логика выбора диапазона: первый клик — "с", второй — "по".
  // Клик до начала диапазона начинает диапазон заново.
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

  const label = from && to
    ? `${fmtHuman(from)} — ${fmtHuman(to)}`
    : from ? `с ${fmtHuman(from)}`
    : to ? `по ${fmtHuman(to)}`
    : 'За всё время'

  return (
    <div ref={rootRef} className="relative inline-block">
      {/* Пилюля-триггер */}
      <button
        onClick={openPanel}
        className="flex items-center gap-2 transition-all"
        style={{
          background: '#0f1f35',
          border: `1px solid ${open ? 'rgba(212,175,55,.7)' : 'rgba(255,215,0,.4)'}`,
          borderRadius: 50,
          padding: '8px 18px',
          fontSize: 13,
          color: '#eaf0fb',
          boxShadow: open ? '0 0 16px rgba(212,175,55,.25)' : 'none',
        }}
      >
        {/* Фирменный тонкий глиф календаря (свой, не стандартный) */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="12" rx="3" stroke="#D4AF37" strokeWidth="1.2" />
          <path d="M1.5 6h13" stroke="#D4AF37" strokeWidth="1.2" />
          <path d="M5 1v3M11 1v3" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="5.5" cy="9.5" r="1" fill="#a0e9ff" />
          <circle cx="8.5" cy="9.5" r="1" fill="#c084fc" />
        </svg>
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M1 3l4 4 4-4" stroke="#9aa9c1" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {/* Панель календаря */}
      {open && (
        <div
          className="absolute z-50 mt-2 flex flex-col sm:flex-row"
          style={{
            right: 0,
            minWidth: 470,
            background: 'linear-gradient(145deg, #152238 0%, #0a1628 100%)',
            border: '1px solid rgba(212,175,55,.35)',
            borderRadius: 20,
            boxShadow: '0 12px 50px rgba(0,0,0,.6), 0 0 30px rgba(255,215,0,.15)',
            padding: 18,
            gap: 18,
          }}
        >
          {/* Пресеты */}
          <div className="flex sm:flex-col flex-wrap gap-1.5 sm:border-r sm:pr-4"
            style={{ borderColor: 'rgba(255,215,0,.2)' }}>
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => onChange(p.fn())}
                className="text-left text-xs px-3 py-1.5 rounded-full transition-all hover:text-white"
                style={{
                  color: '#9aa9c1',
                  border: '1px solid rgba(255,215,0,.25)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,.6)'; e.currentTarget.style.color = '#FFD700' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,.25)'; e.currentTarget.style.color = '#9aa9c1' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Календарь */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1.5 rounded-full transition-all hover:bg-white/10">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #a0e9ff, #c084fc)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}>
                {MONTHS[view.m]} {view.y}
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-full transition-all hover:bg-white/10">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2l5 5-5 5" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="w-9 text-center text-[10px] uppercase tracking-wider" style={{ color: '#66788f' }}>
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
                    className="w-9 h-9 rounded-full text-xs flex items-center justify-center transition-all duration-150 hover:bg-white/10"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, #FFD700, #c084fc)'
                        : inRange ? 'rgba(192,132,252,.18)' : undefined,
                      color: isSelected ? '#fff' : d.inMonth ? '#eaf0fb' : 'rgba(234,240,251,.25)',
                      boxShadow: isSelected ? '0 0 12px rgba(212,175,55,.55)' : 'none',
                      border: isToday && !isSelected ? '1px solid rgba(212,175,55,.55)' : '1px solid transparent',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    {d.day}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between items-center mt-3 text-[11px]" style={{ color: '#66788f' }}>
              <span>С: <span style={{ color: '#FFD700' }}>{from ? fmtHuman(from) : '—'}</span></span>
              <span>По: <span style={{ color: '#c084fc' }}>{to ? fmtHuman(to) : '—'}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
