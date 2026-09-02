import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const pad = n => String(n).padStart(2, '0')

// Выбор времени в фирменном стиле: сетка часов + сетка минут (шаг 5),
// кнопки "Сейчас" и "Очистить". Рендерится через портал в body.
export default function TimePicker({ value, onChange, placeholder = 'Время', disabled = false }) {
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
    if (disabled) return
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
        background: active ? 'linear-gradient(135deg, #8a6208, #7c3aed)' : 'var(--bg-page, #f3f4f8)',
        color: active ? '#fff' : 'var(--text-primary, #161b28)',
        border: '1px solid var(--border-gold, rgba(176,128,16,.35))',
        fontWeight: active ? 700 : 400,
        boxShadow: 'none',
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
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', minHeight: 42, opacity: disabled ? 0.55 : 1 }}
      >
        <span style={{ opacity: value ? 1 : 0.55, fontSize: 14 }}>{value || placeholder}</span>
        {/* Тонкие золотые часы */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
          <circle cx="8" cy="8" r="6.5" stroke="#8a6208" strokeWidth="1.2" />
          <path d="M8 4.5V8l2.3 1.6" stroke="#0e7490" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 2000, width: 300,
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border-subtle, rgba(15,23,42,0.09))', borderRadius: 20,
            boxShadow: '0 12px 40px rgba(15,23,42,0.18)', padding: 16,
          }}
        >
          <div className="text-xs mb-2" style={{ color: 'var(--text-secondary, #5b6478)' }}>Часы</div>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {HOURS.map(h => chip(hourSel === h, pad(h), () => setHourSel(h)))}
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-secondary, #5b6478)' }}>Минуты</div>
          <div className="grid grid-cols-6 gap-1.5 mb-4">
            {MINUTES.map(m => chip(minuteSel === m, pad(m), () => setMinuteSel(m)))}
          </div>
          <div className="flex justify-between items-center">
            <button type="button" onClick={clear} className="text-[11px] transition-colors" style={{ color: 'var(--text-muted, #94a0b8)' }}>Очистить</button>
            <button type="button" onClick={now} className="text-[11px] transition-colors" style={{ color: '#8a6208' }}>Сейчас</button>
            <button
              type="button"
              onClick={apply}
              disabled={hourSel == null || minuteSel == null}
              className="text-xs px-4 py-1.5 rounded-xl"
              style={{
                opacity: hourSel == null || minuteSel == null ? 0.4 : 1,
                background: 'linear-gradient(135deg, rgba(138,98,8,0.14), rgba(124,58,237,0.1))',
                border: '1px solid var(--border-gold, rgba(176,128,16,.35))',
                color: 'var(--text-primary, #161b28)',
              }}
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
