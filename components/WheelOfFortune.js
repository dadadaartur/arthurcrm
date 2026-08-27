import { useState, useRef } from 'react'

// Колесо фортуны. Результат ВСЕГДА уже известен от сервера (защита от
// читерства — см. api/wheel/spin.js) — компонент только красиво
// анимирует вращение до уже определившегося приза, не решает исход сам.
export default function WheelOfFortune({ prizes, onSpin, spinning, result }) {
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef(null)

  const totalWeight = prizes.reduce((s, p) => s + (Number(p.weight) || 0), 0)
  let acc = 0
  const slices = prizes.map(p => {
    const pct = (Number(p.weight) || 0) / totalWeight * 100
    const slice = { ...p, start: acc, end: acc + pct }
    acc += pct
    return slice
  })
  const gradient = slices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')

  const spinTo = (prizeId) => {
    const slice = slices.find(s => s.id === prizeId) || slices[0]
    const sliceCenterPct = (slice.start + slice.end) / 2
    // Стрелка фиксирована сверху (0deg = 12 часов). Колесо должно
    // повернуться так, чтобы центр выигрышного сектора оказался под
    // стрелкой — плюс несколько полных оборотов для эффекта.
    const targetDeg = 360 - (sliceCenterPct / 100) * 360
    const fullSpins = 5 * 360
    setRotation(r => r - (r % 360) + fullSpins + targetDeg)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 260, height: 260 }}>
        <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #FFD700', filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.6))' }} />
        <div
          ref={wheelRef}
          style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: `conic-gradient(${gradient})`,
            border: '4px solid rgba(255,215,0,0.5)',
            boxShadow: '0 0 40px rgba(255,215,0,0.25), inset 0 0 30px rgba(0,0,0,0.3)',
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
            position: 'relative'
          }}
        >
          {slices.map(s => {
            const midDeg = ((s.start + s.end) / 2 / 100) * 360
            return (
              <div key={s.id} style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, transform: `rotate(${midDeg}deg)` }}>
                <span style={{ display: 'block', position: 'absolute', left: 0, top: -95, transform: 'translateX(-50%) rotate(0deg)', fontSize: 10, fontWeight: 700, color: '#0a0e1c', whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 44, height: 44, borderRadius: '50%', background: 'radial-gradient(circle, #FFD700, #b8860b)', border: '3px solid #0a0e1c', boxShadow: '0 0 16px rgba(255,215,0,0.6)' }} />
      </div>

      {result ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Ваш приз:</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: result.color || '#FFD700' }}>{result.label}</div>
        </div>
      ) : (
        <button
          onClick={() => { onSpin(spinTo) }}
          disabled={spinning}
          className="btn-gold"
          style={{ minWidth: 160, opacity: spinning ? 0.6 : 1, cursor: spinning ? 'default' : 'pointer' }}
        >
          {spinning ? 'Крутится...' : 'Крутить колесо'}
        </button>
      )}
    </div>
  )
}
