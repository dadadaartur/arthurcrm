import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Премиальный выбор диапазона дат — светлая тема (31 августа 2026).
// Переведено на портал с точным расчётом позиции (2 сентября 2026, по
// прямому багу: панель с `right: 0` от короткой кнопки-триггера уходила
// за левый край экрана, если сама кнопка стояла не у самого правого
// края страницы — тот же класс проблемы, что уже решён для DatePicker,
// применяю то же решение здесь). Заодно добавлено опциональное время
// (withTime) — раньше в этом компоненте времени не было вообще.
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function fmtShort(s, withYear) {
  if (!s) return null
  const d = fromISO(s)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`
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

export default function DateRangePicker({ from, to, onChange, withTime = false, fromTime = '', toTime = '', onTimeChange }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const base = from ? fromISO(from) : new Date()
    return { y: base.getFullYear(), m: base.getMonth() }
  })
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      const inBtn = btnRef.current && btnRef.current.contains(e.target)
      const inPanel = panelRef.current && panelRef.current.contains(e.target)
      if (!inBtn && !inPanel) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const openPanel = () => {
    const next = !open
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const panelWidth = 500
      const left = Math.min(Math.max(12, rect.right - panelWidth), window.innerWidth - panelWidth - 12)
      setPos({ top: rect.bottom + 8, left: Math.max(12, left) })
      const base = from ? fromISO(from) : new Date()
      setView({ y: base.getFullYear(), m: base.getMonth() })
    }
    setOpen(next)
  }

  const days = useMemo(() => buildGrid(view.y, view.m), [view])
  const todayISO = toISO(new Date())

  const pick = (iso) => {
    if (!from || (from && to)) onChange({ from: iso, to: '' })
    else if (iso < from) onChange({ from: iso, to: '' })
    else { onChange({ from, to: iso }); if (!withTime) setOpen(false) }
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
  const activePreset = presets.find(p => { const r = p.fn(); return r.from === (from || '') && r.to === (to || '') })
  const sameYear = from && to && fromISO(from).getFullYear() === fromISO(to).getFullYear()
  const label = activePreset ? activePreset.label
    : from && to ? `${fmtShort(from, !sameYear)} — ${fmtShort(to, true)}`
    : from ? `с ${fmtShort(from, true)}`
    : to ? `по ${fmtShort(to, true)}`
    : 'За всё время'

  return (
    <>
      <button
        ref={btnRef}
        onClick={openPanel}
        className="date-range-trigger flex items-center gap-2 transition-all"
        style={{
          background: 'var(--bg-card)', border: `1px solid ${open ? '#8a6208' : 'var(--border-gold)'}`,
          borderRadius: 50, padding: '8px 16px', fontSize: 13, color: 'var(--text-primary)',
          boxShadow: open ? '0 0 0 3px rgba(138,98,8,0.1)' : 'var(--shadow-card)', whiteSpace: 'nowrap',
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

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="flex flex-col sm:flex-row"
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 2000,
            width: 500,
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20,
            boxShadow: '0 12px 40px rgba(15,23,42,0.18)', padding: 18, gap: 18,
          }}
        >
          <div className="flex sm:flex-col flex-wrap gap-1.5 sm:border-r sm:pr-4" style={{ borderColor: 'var(--border-subtle)' }}>
            {presets.map(p => {
              const isActive = activePreset?.label === p.label
              return (
                <button
                  key={p.label}
                  onClick={() => { onChange(p.fn()); if (!withTime) setOpen(false) }}
                  className="text-left text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    color: isActive ? '#8a6208' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(184,134,11,0.08)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
                    fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.color = '#8a6208' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1.5 rounded-full transition-all" style={{ background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(15,23,42,0.04))'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#8a6208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #8a6208, #0e7490, #7c3aed)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {MONTHS[view.m]} {view.y}
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-full transition-all" style={{ background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(15,23,42,0.04))'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="#8a6208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(w => <div key={w} className="w-9 text-center text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{w}</div>)}
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
                      background: isSelected ? 'linear-gradient(135deg, #8a6208, #7c3aed)' : inRange ? 'rgba(124,58,237,0.1)' : undefined,
                      color: isSelected ? '#fff' : d.inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: isToday && !isSelected ? '1px solid var(--border-gold)' : '1px solid transparent',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover, rgba(15,23,42,0.04))' }}
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

            {withTime && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Время с</label>
                  <input type="time" value={fromTime} onChange={e => onTimeChange?.(e.target.value, toTime)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 8, background: 'var(--bg-page, #f3f4f8)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Время по</label>
                  <input type="time" value={toTime} onChange={e => onTimeChange?.(fromTime, e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 8, background: 'var(--bg-page, #f3f4f8)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                </div>
                <button onClick={() => setOpen(false)} style={{ alignSelf: 'flex-end', fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border-gold)', background: 'rgba(184,134,11,0.08)', color: '#8a6208', cursor: 'pointer' }}>Готово</button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
