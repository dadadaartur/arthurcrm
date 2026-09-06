import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Фирменный выбор одной даты в стиле Кармического банка — переведён на
// светлую тему 31 августа 2026 (по прямой просьбе: раньше сознательно
// оставлял панель тёмной, так как она рендерится через портал и не
// обязана следовать теме страницы технически — но вы прямо попросили
// иначе, отменяю это решение). Плюс необязательный выбор времени через
// проп withTime — не навязываю его туда, где он не нужен (например,
// дата рождения), только там, где явно включён.
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function fromISO(s) {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}
function splitValue(value) {
  if (!value) return { date: '', time: '' }
  const [date, time] = value.split('T')
  return { date, time: time || '' }
}
function fmtHuman(s) {
  if (!s) return ''
  const { date, time } = splitValue(s)
  const human = fromISO(date).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
  return time ? `${human}, ${time}` : human
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

export default function DatePicker({ value, onChange, placeholder = 'Выберите дату', withTime = false }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // days | years
  const { date: valueDate, time: valueTime } = splitValue(value)
  const [cursor, setCursor] = useState(() => {
    const base = valueDate ? fromISO(valueDate) : new Date()
    return { y: base.getFullYear(), m: base.getMonth() }
  })
  const [decadeStart, setDecadeStart] = useState(() => {
    const y = valueDate ? fromISO(valueDate).getFullYear() : new Date().getFullYear()
    return Math.floor(y / 12) * 12
  })
  const [time, setTime] = useState(valueTime || '09:00')
  const [showTimeRow, setShowTimeRow] = useState(!!valueTime)
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

  const days = useMemo(() => buildGrid(cursor.y, cursor.m), [cursor])
  const todayISO = toISO(new Date())

  const openPanel = () => {
    const next = !open
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const panelHeight = withTime ? 420 : 340
      const top = rect.bottom + panelHeight > window.innerHeight
        ? rect.top - panelHeight - 8
        : rect.bottom + 8
      setPos({
        top: Math.max(8, top),
        left: Math.min(Math.max(12, rect.left), window.innerWidth - 312)
      })
      if (valueDate) {
        const d = fromISO(valueDate)
        setCursor({ y: d.getFullYear(), m: d.getMonth() })
      }
      if (valueTime) setTime(valueTime)
    }
    setView('days')
    setOpen(next)
  }

  const prev = () => {
    if (view === 'days') setCursor(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
    else setDecadeStart(d => d - 12)
  }
  const next = () => {
    if (view === 'days') setCursor(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
    else setDecadeStart(d => d + 12)
  }

  const emit = (iso, t) => onChange(withTime ? (iso ? `${iso}T${t || time}` : '') : iso)

  const pickDay = (iso) => {
    if (withTime) { emit(iso, time); return } // не закрываем — дают выбрать время следом
    emit(iso)
    setOpen(false)
  }
  const changeTime = (t) => { setTime(t); if (valueDate) emit(valueDate, t) }

  const pickYear = (y) => {
    setCursor(v => ({ y, m: v.m }))
    setView('days')
  }

  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i)

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openPanel}
        className="input-field flex items-center justify-between text-left"
        style={{ cursor: 'pointer', minHeight: 42 }}
      >
        <span style={{ opacity: value ? 1 : 0.55, fontSize: 14 }}>
          {value ? fmtHuman(value) : placeholder}
        </span>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
          <rect x="1.5" y="2.5" width="13" height="12" rx="3" stroke="#8a6208" strokeWidth="1.2" />
          <path d="M1.5 6h13" stroke="#8a6208" strokeWidth="1.2" />
          <path d="M5 1v3M11 1v3" stroke="#8a6208" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="5.5" cy="9.5" r="1" fill="#0e7490" />
          <circle cx="8.5" cy="9.5" r="1" fill="#7c3aed" />
        </svg>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 2000,
            width: 300,
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border-subtle, rgba(15,23,42,0.09))',
            borderRadius: 20,
            boxShadow: '0 12px 40px rgba(15,23,42,0.18)',
            padding: 16,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prev} className="p-1.5 rounded-full transition-all" style={{ background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(15,23,42,0.04))'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="#8a6208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'days' ? 'years' : 'days')}
              className="text-sm font-semibold transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #8a6208, #0e7490, #7c3aed)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}
            >
              {view === 'days' ? `${MONTHS[cursor.m]} ${cursor.y}` : `${decadeStart} – ${decadeStart + 11}`}
            </button>
            <button type="button" onClick={next} className="p-1.5 rounded-full transition-all" style={{ background: 'none', border: 'none' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(15,23,42,0.04))'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="#8a6208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {view === 'days' ? (
            <>
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(w => (
                  <div key={w} className="text-center text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted, #94a0b8)' }}>
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {days.map(d => {
                  const isSelected = d.iso === valueDate
                  const isToday = d.iso === todayISO
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => pickDay(d.iso)}
                      className="w-9 h-9 mx-auto rounded-full text-xs flex items-center justify-center transition-all duration-150"
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, #8a6208, #7c3aed)' : undefined,
                        color: isSelected ? '#fff' : d.inMonth ? 'var(--text-primary, #161b28)' : 'var(--text-muted, #94a0b8)',
                        opacity: !isSelected && !d.inMonth ? 0.5 : 1,
                        border: isToday && !isSelected ? '1px solid var(--border-gold, rgba(176,128,16,.5))' : '1px solid transparent',
                        fontWeight: isSelected ? 700 : 400,
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover, rgba(15,23,42,0.04))' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      {d.day}
                    </button>
                  )
                })}
              </div>

              {withTime && (
                showTimeRow ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle, rgba(15,23,42,0.09))' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a6208" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary, #5b6478)' }}>Время:</span>
                    <input
                      type="time"
                      value={time}
                      onChange={e => changeTime(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 10,
                        background: 'var(--bg-page, #f3f4f8)',
                        border: '1px solid var(--border-subtle, rgba(15,23,42,0.09))',
                        color: 'var(--text-primary, #161b28)',
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTimeRow(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14,
                      borderTop: '1px solid var(--border-subtle, rgba(15,23,42,0.09))', width: '100%',
                      background: 'none', border: 'none', borderTopWidth: 1, borderTopStyle: 'solid',
                      cursor: 'pointer', fontSize: 12, color: '#8a6208', fontWeight: 500,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a6208" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
                    Добавить точное время
                  </button>
                )
              )}
            </>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {years.map(y => {
                const isSelected = valueDate && fromISO(valueDate).getFullYear() === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => pickYear(y)}
                    className="py-2.5 rounded-xl text-xs transition-all duration-150"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #8a6208, #7c3aed)' : 'var(--bg-page, #f3f4f8)',
                      color: isSelected ? '#fff' : 'var(--text-primary, #161b28)',
                      border: '1px solid var(--border-gold, rgba(176,128,16,.35))',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex justify-between items-center mt-3">
            {value ? (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-[11px] transition-colors"
                style={{ color: 'var(--text-muted, #94a0b8)' }}
              >
                Очистить дату
              </button>
            ) : <span />}
            {view === 'days' && (
              <button
                type="button"
                onClick={() => pickDay(todayISO)}
                className="text-[11px] transition-colors"
                style={{ color: '#8a6208' }}
              >
                Сегодня
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
