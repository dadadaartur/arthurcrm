import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BAND_LABELS, BAND_COLORS } from '../lib/kpi'

export default function KpiBlock() {
  const [data, setData] = useState(null)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/kpi/my', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) setData(await res.json())
    })()
  }, [])
  if (!data) return null
  return (
    <div style={{ position: 'absolute', left: '2.5%', top: 250, zIndex: 20, width: 340, padding: '0 40px', boxSizing: 'border-box', animation: 'driftGoals 60s ease-in-out infinite alternate' }}>
      <div style={{ background: 'linear-gradient(145deg, rgba(21,34,56,0.92), rgba(10,22,40,0.92))', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 20, padding: '18px 18px 14px', boxShadow: '0 0 30px rgba(212,175,55,0.12)', backdropFilter: 'blur(12px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Кармическая энергия</div>
          <div style={{ fontSize: 30, fontWeight: 700, background: 'linear-gradient(135deg, #FFD700, #ffb3c6, #a0e9ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.6))', animation: 'rainbowShift 14s ease-in-out infinite alternate' }}>{data.energy}</div>
        </div>
        {data.metrics.length === 0 && <p style={{ fontSize: 11, color: '#777', textAlign: 'center' }}>Руководитель ещё не задал показатели</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {data.metrics.map(m => {
            const max = Number(m.thr_ultra) * 1.15 || 1
            const pos = Math.min(100, Math.max(0, ((m.current ?? 0) / max) * 100))
            const marks = [['min', m.thr_min], ['mid', m.thr_mid], ['top', m.thr_top], ['ultra', m.thr_ultra]]
            return (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{m.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: BAND_COLORS[m.band] }}>{m.current != null ? `${m.current}${m.unit}` : '—'} · {BAND_LABELS[m.band]}</span>
                </div>
                <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'linear-gradient(90deg, #f87171 0%, #f97316 25%, #FFD700 50%, #4ade80 75%, #c084fc 100%)' }}>
                  {marks.map(([b, v]) => (
                    <span key={b} title={`${BAND_LABELS[b]}: ${v}${m.unit}`} style={{ position: 'absolute', top: '50%', left: `${Math.min(100, (Number(v) / max) * 100)}%`, width: 2, height: 10, background: 'rgba(255,255,255,0.55)', transform: 'translate(-50%,-50%)', borderRadius: 1 }} />
                  ))}
                  <span style={{ position: 'absolute', top: '50%', left: `${pos}%`, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${BAND_COLORS[m.band]}`, boxShadow: `0 0 10px ${BAND_COLORS[m.band]}` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {marks.map(([b, v]) => <span key={b} style={{ fontSize: 9, color: BAND_COLORS[b], fontWeight: 600 }}>{v}</span>)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
