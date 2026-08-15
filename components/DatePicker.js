import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Фирменный выбор одной даты в стиле Кармического банка.
// Панель рендерится через портал в body — её невозможно перекрыть
// контентом страницы. Клик по названию месяца переключает на выбор года
// (нужно для даты рождения — листать месяцы с 1985 года нереально).
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
  if (!s) return ''
  return fromISO(s).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
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

export default function DatePicker({ value, onChange, placeholder = 'Выберите дату' }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // days | years
  const [cursor, setCursor] = useState(() => {
    const base = value ? fromISO(value) : new Date()
    return { y: base.getFullYear(), m: base.getMonth() }
  })
  const [decadeStart, setDecadeStart] = useState(() => {
    const y = value ? fromISO(value).getFullYear() : new Date().getFullYear()
    return Math.floor(y / 12) * 12
  })
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  // Закрытие по клику вне
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
      const panelHeight = 340
      const top = rect.bottom + panelHeight > window.innerHeight
        ? rect.top - panelHeight - 8
        : rect.bottom + 8
      setPos({
        top: Math.max(8, top),
        left: Math.min(Math.max(12, rect.left), window.innerWidth - 312)
      })
      if (value) {
        const d = fromISO(value)
        setCursor({ y: d.getFullYear(), m: d.getMonth() })
      }
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

  const pickDay = (iso) => {
    onChange(iso)
    setOpen(false)
  }

  const pickYear = (y) => {
    setCursor(v => ({ y, m: v.m }))
    setView('days')
  }

  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i)

  return (
    <>
      {/* Кнопка-триггер в стиле полей проекта */}
      <button
        ref={btnRef}
        type="button"
        onClick={openPanel}
        className="input-field flex items-center justify-between text-left"
        style={{ cursor: 'pointer', minHeight: 42 }}
      >
        <span style={{ color: value ? '#eaf0fb' : '#66788f', fontSize: 14 }}>
          {value ? fmtHuman(value) : placeholder}
        </span>
        {/* Фирменный тонкий глиф календаря */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
          <rect x="1.5" y="2.5" width="13" height="12" rx="3" stroke="#D4AF37" strokeWidth="1.2" />
          <path d="M1.5 6h13" stroke="#D4AF37" strokeWidth="1.2" />
          <path d="M5 1v3M11 1v3" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="5.5" cy="9.5" r="1" fill="#f97316" />
          <circle cx="8.5" cy="9.5" r="1" fill="#c084fc" />
        </svg>
      </button>

      {/* Панель календаря — через портал в body, поверх всего сайта */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 2000,
            width: 300,
            background: 'linear-gradient(145deg, #152238 0%, #0a1628 100%)',
            border: '1px solid rgba(212,175,55,.35)',
            borderRadius: 20,
            boxShadow: '0 12px 50px rgba(0,0,0,.6), 0 0 30px rgba(249,115,22,.15)',
            padding: 16,
          }}
        >
          {/* Шапка: стрелки + название месяца/лет (клик — переключение вида) */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prev} className="p-1.5 rounded-full transition-all hover:bg-white/10">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'days' ? 'years' : 'days')}
              className="text-sm font-semibold transition-opacity hover:opacity-75"
              style={{
                background: 'linear-gradient(135deg, #f97316, #c084fc)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}
            >
              {view === 'days' ? `${MONTHS[cursor.m]} ${cursor.y}` : `${decadeStart} – ${decadeStart + 11}`}
            </button>
            <button type="button" onClick={next} className="p-1.5 rounded-full transition-all hover:bg-white/10">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {view === 'days' ? (
            <>
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(w => (
                  <div key={w} className="text-center text-[10px] uppercase tracking-wider" style={{ color: '#66788f' }}>
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {days.map(d => {
                  const isSelected = d.iso === value
                  const isToday = d.iso === todayISO
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => pickDay(d.iso)}
                      className="w-9 h-9 mx-auto rounded-full text-xs flex items-center justify-center transition-all duration-150 hover:bg-white/10"
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, #f97316, #D4AF37)' : undefined,
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
            </>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {years.map(y => {
                const isSelected = value && fromISO(value).getFullYear() === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => pickYear(y)}
                    className="py-2.5 rounded-xl text-xs transition-all duration-150 hover:bg-white/10"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #f97316, #D4AF37)' : 'rgba(15,31,53,.6)',
                      color: isSelected ? '#fff' : '#eaf0fb',
                      border: '1px solid rgba(249,115,22,.25)',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}

          {/* Очистка даты */}
          <div className="flex justify-between items-center mt-3">
            {value ? (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                Очистить дату
              </button>
            ) : <span />}
            {view === 'days' && (
              <button
                type="button"
                onClick={() => pickDay(todayISO)}
                className="text-[11px] transition-colors hover:text-white"
                style={{ color: '#D4AF37' }}
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
