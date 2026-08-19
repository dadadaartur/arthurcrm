import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BAND_LABELS, BAND_COLORS } from '../lib/kpi'
import ProgressBar3D from './ProgressBar3D'
import LevelPathModal from './LevelPathModal'

const smallLink = { background: 'none', border: 'none', padding: 0, color: '#a0e9ff', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }

export default function KpiBlock() {
  const [data, setData] = useState(null)
  const [levels, setLevels] = useState([])
  const [pathOpen, setPathOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const h = { Authorization: `Bearer ${session.access_token}` }
      const [r1, r2] = await Promise.all([fetch('/api/kpi/my', { headers: h }), fetch('/api/kpi/levels', { headers: h })])
      if (r1.ok) setData(await r1.json())
      if (r2.ok) setLevels(await r2.json())
    })()
  }, [])
  if (!data) return null
  const energy = data.energy || 0
  let cur = null, next = null
  levels.forEach(l => { if (energy >= l.energy_threshold) cur = l })
  next = levels.find(l => l.energy_threshold > energy) || null
  const remaining = next ? next.energy_threshold - energy : 0
  return (
    <div style={{ position: 'absolute', left: '2.5%', top: 250, zIndex: 20, width: 360, padding: '0 40px', boxSizing: 'border-box', animation: 'driftGoals 60s ease-in-out infinite alternate' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textShadow: '0 0 6px rgba(255,215,0,0.4)', marginBottom: 2 }}>Кармическая энергия</div>
        <div style={{ fontSize: 26, fontWeight: 700, background: 'linear-gradient(135deg, #FFD700, #ffb3c6, #a0e9ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.7))' }}>{energy}</div>
        {next && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>ещё {remaining} до «{next.name}»</div>}
      </div>
      {cur && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: cur.color, textShadow: `0 0 8px ${cur.color}`, fontWeight: 700 }}>{cur.name}</span>
            {next && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>→ {next.name}</span>}
          </div>
          <ProgressBar3D value={next ? energy - cur.energy_threshold : 1} height={10} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 5 }}>
            <button onClick={() => setTipsOpen(o => !o)} style={smallLink}>советы</button>
            <button onClick={() => setPathOpen(true)} style={smallLink}>путь прогресса</button>
          </div>
          {tipsOpen && next && (
            <div style={{ marginTop: 8, fontSize: 10, color: '#aaa', textAlign: 'center', lineHeight: 1.5 }}>
              {data.metrics.slice(0, 2).map(m => (
                <div key={m.id}>Держать «{m.name}» ≥ {m.thr_top}{m.unit} → +{energyForLocal(m, 'top')} эн./день</div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.metrics.length === 0 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Руководитель ещё не задал показатели</p>}
        {data.metrics.map(m => (
          <div key={m.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textShadow: '0 0 6px rgba(255,255,255,0.3)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <span style={{ fontSize: 11, color: BAND_COLORS[m.band], textShadow: `0 0 6px ${BAND_COLORS[m.band]}`, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{m.current != null ? `${m.current}${m.unit}` : '—'}</span>
            </div>
            <ProgressBar3D value={m.current ?? 0} height={8} />
          </div>
        ))}
      </div>
      <LevelPathModal open={pathOpen} onClose={() => setPathOpen(false)} energy={energy} />
    </div>
  )
}
function energyForLocal(m, b) { return Number(m['energy_' + b]) || 0 }
