import { useEffect, useState } from 'react'
import { BAND_LABELS, BAND_COLORS } from '../lib/kpi'

export default function KpiBlock() {
  const [data, setData] = useState(null)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await (await import('../lib/supabaseClient')).supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/kpi/my', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) setData(await res.json())
    })()
  }, [])
  if (!data) return null
  return (
    <div style={{ position: 'absolute', left: '2.5%', top: 250, zIndex: 20, width: 340, padding: '0 40px', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Кармическая энергия</div>
        <div style={{ fontSize: 26, fontWeight: 600, background: 'linear-gradient(135deg, #FFD700, #ffb3c6, #a0e9ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.7))' }}>{data.energy}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.metrics.length === 0 && <p style={{ fontSize: 12, color: '#777', textAlign: 'center' }}>Руководитель ещё не назначил показатели</p>}
        {data.metrics.map(m => {
          const next = m.band === 'none' ? m.thr_min : m.band === 'min' ? m.thr_mid : m.band === 'mid' ? m.thr_top : m.band === 'top' ? m.thr_ultra : null
          const pct = next ? Math.min(100, Math.round(((m.current || 0) / next) * 100)) : 100
          return (
            <div key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{m.name}</span>
                <span style={{ fontSize: 11, color: BAND_COLORS[m.band], fontWeight: 600 }}>{m.current != null ? `${m.current}${m.unit}` : '—'} · {BAND_LABELS[m.band]}</span>
              </div>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg, ${BAND_COLORS[m.band]}40, ${BAND_COLORS[m.band]})`, boxShadow: `0 0 6px ${BAND_COLORS[m.band]}` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
