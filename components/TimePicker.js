import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const pad = n => String(n).padStart(2, '0')

// Выбор времени в фирменном стиле: сетка часов + сетка минут (шаг 5),
// кнопки "Сейчас" и "Очистить". Рендерится через портал в body.
export default function TimePicker({ value, onChange, placeholder = 'Время' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [hourSel, setHourSel] = useState(null)
  const [minuteSel, setMinuteSel] = useState(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  const [curH, curM] = value && value.includes(':') ? value.split(':').map(Number) : [null, null]

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
      const panelH = 300
      const top = rect.bottom + panelH > window.innerHeight ? rect.top - panelH - 8 : rect.bottom + 8
      setPos({ top: Math.max(8, top), left: Math.min(Math.max(12, rect.left), window.innerWidth - 320) })
      setHourSel(curH)
      setMinuteSel(curM)
    }
    setOpen(next)
  }

  const apply = () => {
    if (hourSel == null || minuteSel == null) return
    onChange(`${pad(hourSel)}:${pad(minuteSel)}`)
    setOpen(false)
  }
  const now = () => {
    const d = new Date()
    onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setOpen(false)
  }
  const clear = () => { onChange(''); setOpen(false) }

  const chip = (active, label, onClick) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="rounded-lg text-xs py-1.5 transition-all duration-150"
      style={{
        background: active ? 'linear-gradient(135deg, #f97316, #D4AF37)' : 'rgba(15,31,53,.6)',
        color: active ? '#fff' : '#eaf0fb',
        border: '1px solid rgba(249,115,22,.25)',
        fontWeight: active ? 700 : 400,
        boxShadow: active ? '0 0 10px rgba(212,175,55,.5)' : 'none',
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openPanel}
        className="input-field flex items-center justify-between text-left"
        style={{ cursor: 'pointer', minHeight: 42 }}
      >
        <span style={{ color: value ? '#eaf0fb' : '#66788f', fontSize: 14 }}>{value || placeholder}</span>
        {/* Тонкие золотые часы */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
          <circle cx="8" cy="8" r="6.5" stroke="#D4AF37" strokeWidth="1.2" />
          <path d="M8 4.5V8l2.3 1.6" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 2000, width: 300,
            background: 'linear-gradient(145deg, #152238 0%, #0a1628 100%)',
            border: '1px solid rgba(212,175,55,.35)', borderRadius: 20,
            boxShadow: '0 12px 50px rgba(0,0,0,.6), 0 0 30px rgba(249,115,22,.15)', padding: 16,
          }}
        >
          <div className="text-xs text-gray-400 mb-2">Часы</div>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {HOURS.map(h => chip(hourSel === h, pad(h), () => setHourSel(h)))}
          </div>
          <div className="text-xs text-gray-400 mb-2">Минуты</div>
          <div className="grid grid-cols-6 gap-1.5 mb-4">
            {MINUTES.map(m => chip(minuteSel === m, pad(m), () => setMinuteSel(m)))}
          </div>
          <div className="flex justify-between items-center">
            <button type="button" onClick={clear} className="text-[11px] text-gray-400 hover:text-white transition-colors">Очистить</button>
            <button type="button" onClick={now} className="text-[11px] hover:text-white transition-colors" style={{ color: '#D4AF37' }}>Сейчас</button>
            <button
              type="button"
              onClick={apply}
              disabled={hourSel == null || minuteSel == null}
              className="btn-glass text-xs px-4 py-1.5"
              style={{ opacity: hourSel == null || minuteSel == null ? 0.4 : 1 }}
            >
              Применить
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
