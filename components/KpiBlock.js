import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BAND_LABELS, BAND_COLORS } from '../lib/kpi'

export default function KpiBlock() {
  const [data, setData] = useState(null)
  const [fill, setFill] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/kpi/my', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (res.ok) setData(await res.json())
      } catch (e) {}
    })()
  }, [])

  const metrics = data?.metrics ?? []
  const energy = data?.energy ?? 0

  // Красивое заполнение полосок: сначала ширина 0, затем анимируется к значению
  useEffect(() => {
    if (!metrics.length) return
    setFill(false)
    let r2
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setFill(true)) })
    return () => { cancelAnimationFrame(r1); if (r2) cancelAnimationFrame(r2) }
  }, [metrics.length])

  return (
    // Парит в космосе: БЕЗ фона и рамок, как остальные кнопки главной
    <div style={{ position: 'absolute', left: '2.5%', top: 250, zIndex: 20, width: 340, padding: '0 40px', boxSizing: 'border-box', animation: 'driftGoals 60s ease-in-out infinite alternate' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textShadow: '0 0 6px rgba(255,215,0,0.4)', marginBottom: 4 }}>Кармическая энергия</div>
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1, background: 'linear-gradient(135deg, #FFD700, #ffb3c6, #a0e9ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.7))', animation: 'rainbowShift 14s ease-in-out infinite alternate' }}>{energy}</div>
      </div>

      {metrics.length === 0 && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', textShadow: '0 0 6px rgba(160,233,255,0.3)' }}>
          {data ? 'Руководитель ещё не задал показатели' : 'Загружаем показатели…'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {metrics.map(m => {
          const cur = m.current != null ? Number(m.current) : 0
          // Шкала РАСТЯГИВАЕТСЯ: даже значение выше «ультра» остаётся видимым
          const max = (Math.max(Number(m.thr_ultra) || 0, cur) * 1.2) || 1
          const pct = fill ? Math.min(100, (cur / max) * 100) : 0
          const marks = [['min', m.thr_min], ['mid', m.thr_mid], ['top', m.thr_top], ['ultra', m.thr_ultra]]
          return (
            <div key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textShadow: '0 0 6px rgba(255,255,255,0.3)', fontWeight: 500 }}>{m.name}</span>
                <span style={{ fontSize: 11, color: BAND_COLORS[m.band], textShadow: `0 0 6px ${BAND_COLORS[m.band]}`, fontWeight: 600 }}>
                  {m.current != null ? `${m.current}${m.unit}` : '—'} · {BAND_LABELS[m.band]}
                </span>
              </div>
              <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                {/* отметки уровней */}
                {marks.map(([b, v]) => (
                  <span key={b} title={`${BAND_LABELS[b]}: ${v}${m.unit}`} style={{ position: 'absolute', top: '50%', left: `${Math.min(100, (Number(v) / max) * 100)}%`, width: 2, height: 9, background: 'rgba(255,255,255,0.4)', transform: 'translate(-50%,-50%)', borderRadius: 1 }} />
                ))}
                {/* прогресс с анимацией заполнения */}
                <div style={{
                  height: '100%', width: pct + '%', borderRadius: 2,
                  background: `linear-gradient(90deg, ${BAND_COLORS[m.band]}40, ${BAND_COLORS[m.band]})`,
                  boxShadow: `0 0 8px ${BAND_COLORS[m.band]}`,
                  transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1)'
                }} />
                {/* указатель «где я сейчас» */}
                <span style={{
                  position: 'absolute', top: '50%', left: pct + '%', transform: 'translate(-50%,-50%)',
                  width: 11, height: 11, borderRadius: '50%', background: '#fff',
                  border: `2px solid ${BAND_COLORS[m.band]}`, boxShadow: `0 0 10px ${BAND_COLORS[m.band]}`,
                  transition: 'left 1.4s cubic-bezier(0.22, 1, 0.36, 1)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                {marks.map(([b, v]) => (
                  <span key={b} style={{ fontSize: 9, color: BAND_COLORS[b], opacity: 0.8 }}>{v}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
