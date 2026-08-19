import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { BAND_COLORS } from '../../lib/kpi'

function toISO(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
function Spark({ points, color }) {
  if (!points || points.length < 2) return null
  const max = Math.max(...points), min = Math.min(...points), W = 140, H = 40
  const pts = points.map((v, i) => `${(i / (points.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * (H - 8) - 4}`).join(' ')
  return <svg width={W} height={H}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
}
const pill = (active) => ({
  padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .2s',
  background: active ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
  color: active ? '#FFD700' : '#aaa', backdropFilter: 'blur(8px)', fontWeight: active ? 700 : 400
})

function ResultsAdmin() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [rows, setRows] = useState([])
  const [range, setRange] = useState(() => { const t = new Date(), f = new Date(); f.setDate(f.getDate() - 29); return { from: toISO(f), to: toISO(t) } })
  const [sortBy, setSortBy] = useState('energy')
  const [metricId, setMetricId] = useState('')
  const [ddOpen, setDdOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const ddRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    const h = await auth()
    const params = new URLSearchParams()
    if (metricId) params.set('metricId', metricId)
    if (range.from) params.set('from', range.from)
    if (range.to) params.set('to', range.to)
    const r = await fetch(`/api/kpi/results?${params}`, { headers: h })
    if (r.ok) { const d = await r.json(); setMetrics(d.metrics || []); setRows(d.rows || []) }
    setLoading(false)
  }
  useEffect(() => { setLoading(true); load() }, [range, metricId])

  const metricValue = row => {
    if (!metricId) return null
    const e = (row.entries || []).find(x => x.metric_id === Number(metricId))
    return e ? Number(e.value) : null
  }
  const topCount = row => (row.latest || []).filter(e => e.band === 'top' || e.band === 'ultra').length
  const sortKey = row => sortBy === 'energy' ? row.energy : sortBy === 'karma' ? row.balance : sortBy === 'metric' ? (metricValue(row) ?? -1) : topCount(row) * 100000 + row.energy
  const sorted = [...rows].sort((a, b) => sortKey(b) - sortKey(a))
  const podium = sorted.slice(0, 3)
  const medal = ['#FFD700', '#c0c8d8', '#d4894a']

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Результаты команды" extra={<div style={{ marginLeft: 'auto' }}><DateRangePicker from={range.from} to={range.to} onChange={setRange} /></div>} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          {[['overall', 'Общие'], ['energy', 'По энергии'], ['karma', 'По кармикам']].map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)} style={pill(sortBy === k)}>{l}</button>
          ))}
          <div ref={ddRef} style={{ position: 'relative' }}>
            <button onClick={() => { setSortBy('metric'); setDdOpen(o => !o) }} style={pill(sortBy === 'metric')}>
              По показателю
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ display: 'inline', marginLeft: 6, transform: ddOpen ? 'rotate(180deg)' : 'none' }}><path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
            {ddOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50, minWidth: 240, background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,.35)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,.6)', padding: 8 }}>
                {metrics.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: '#777' }}>Показателей пока нет</div>}
                {metrics.map(m => (
                  <div key={m.id} onClick={() => { setMetricId(String(m.id)); setDdOpen(false) }}
                    style={{ padding: '9px 12px', fontSize: 13, borderRadius: 9, cursor: 'pointer', color: metricId === String(m.id) ? '#FFD700' : '#eaf0fb', background: metricId === String(m.id) ? 'rgba(255,215,0,0.1)' : 'transparent', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = metricId === String(m.id) ? 'rgba(255,215,0,0.1)' : 'transparent'}>
                    {m.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Пьедестал */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {podium.map((r, i) => (
            <div key={r.user_id} style={{ background: 'linear-gradient(145deg, rgba(21,34,56,0.9), rgba(10,22,40,0.9))', border: `1px solid ${medal[i]}55`, borderRadius: 18, padding: 22, textAlign: 'center', boxShadow: `0 0 24px ${medal[i]}22` }}>
              <div style={{ width: 40, height: 40, margin: '0 auto 10px', borderRadius: '50%', background: `radial-gradient(circle, ${medal[i]}33, transparent 70%)`, border: `1.5px solid ${medal[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: medal[i] }}>{i + 1}</div>
              <div style={{ color: '#fff', fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 13, marginTop: 4, color: '#FFD700' }}>{r.energy} энергии</div>
              <div style={{ fontSize: 12, marginTop: 2, color: '#a0e9ff' }}>{r.balance} кармиков</div>
            </div>
          ))}
        </div>

        {/* Рейтинг */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((r, idx) => (
            <div key={r.user_id} onClick={() => setExpanded(expanded === r.user_id ? null : r.user_id)}
              style={{ background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', transition: 'border .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 26, textAlign: 'center', fontWeight: 800, color: idx < 3 ? medal[idx] : '#556' }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{r.name}</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#888', marginTop: 2 }}>
                    <span style={{ color: '#FFD700' }}>{r.energy} энергии</span>
                    <span style={{ color: '#a0e9ff' }}>{r.balance} кармиков</span>
                    <span>{r.tests_passed} тестов</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(r.latest || []).slice(0, 4).map(e => {
                    const m = metrics.find(x => x.id === e.metric_id)
                    return <span key={e.metric_id} title={m?.name} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: `${BAND_COLORS[e.band]}18`, color: BAND_COLORS[e.band], border: `1px solid ${BAND_COLORS[e.band]}44` }}>{e.value}{m?.unit}</span>
                  })}
                </div>
              </div>
              {expanded === r.user_id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }} onClick={e => e.stopPropagation()}>
                  {metrics.map(m => {
                    const pts = (r.entries || []).filter(e => e.metric_id === m.id).map(e => Number(e.value)).reverse()
                    const last = pts[pts.length - 1]
                    const band = (r.latest || []).find(x => x.metric_id === m.id)?.band || 'none'
                    return (
                      <div key={m.id} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: '#fff' }}>{m.name}</span>
                          <span style={{ color: BAND_COLORS[band], fontWeight: 700 }}>{last ?? '—'}{m.unit}</span>
                        </div>
                        <Spark points={pts} color={BAND_COLORS[band]} />
                      </div>
                    )
                  })}
                  {metrics.length === 0 && <p style={{ color: '#777', fontSize: 13 }}>Нет данных за период</p>}
                </div>
              )}
            </div>
          ))}
          {sorted.length === 0 && <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 14, padding: 40, textAlign: 'center', color: '#777' }}>Нет данных за выбранный период</div>}
        </div>
      </div>
    </div>
  )
}
export default withAuth(ResultsAdmin, { anyStaff: true })
