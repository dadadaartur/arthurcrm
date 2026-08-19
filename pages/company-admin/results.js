import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { BAND_COLORS, BAND_LABELS } from '../../lib/kpi'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const pill = a => ({
  padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
  color: a ? '#FFD700' : '#aaa', fontWeight: a ? 700 : 400, transition: 'all 0.2s'
})

function ResultsAdmin() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [rows, setRows] = useState([])
  const [range, setRange] = useState(() => { const t = new Date(), f = new Date(); f.setDate(f.getDate() - 29); return { from: toISO(f), to: toISO(t) } })
  const [metricId, setMetricId] = useState('')
  const [sortBy, setSortBy] = useState('energy')
  const [expanded, setExpanded] = useState(null)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    setLoading(true)
    const h = await auth()
    const params = new URLSearchParams()
    if (metricId) params.set('metricId', metricId)
    if (range.from) params.set('from', range.from)
    if (range.to) params.set('to', range.to)
    const r = await fetch(`/api/kpi/results?${params}`, { headers: h })
    if (r.ok) { const d = await r.json(); setMetrics(d.metrics || []); setRows(d.rows || []) }
    setLoading(false)
  }
  useEffect(() => { load() }, [range, metricId])

  const metricValue = row => {
    if (!metricId) return null
    const e = (row.entries || []).find(x => x.metric_id === Number(metricId))
    return e ? Number(e.value) : null
  }
  const sortKey = row => sortBy === 'energy' ? row.energy : sortBy === 'karma' ? row.balance : sortBy === 'tests' ? row.tests_passed : (metricValue(row) ?? -1)
  const sorted = [...rows].sort((a, b) => sortKey(b) - sortKey(a))
  const podium = sorted.slice(0, 3)
  const medal = ['#FFD700', '#c0c8d8', '#d4894a']

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Результаты команды" extra={
          <div style={{ marginLeft: 'auto' }}><DateRangePicker from={range.from} to={range.to} onChange={setRange} /></div>
        } />

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setSortBy('energy')} style={pill(sortBy === 'energy')}>По энергии</button>
          <button onClick={() => setSortBy('karma')} style={pill(sortBy === 'karma')}>По кармикам</button>
          <button onClick={() => setSortBy('tests')} style={pill(sortBy === 'tests')}>По тестам</button>
          <select className="input-field" style={{ width: 220 }} value={metricId} onChange={e => { setMetricId(e.target.value); setSortBy('metric') }}>
            <option value="">Все показатели</option>
            {metrics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>Сотрудников: {sorted.length}</span>
        </div>

        {/* Пьедестал */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {podium.map((r, i) => (
            <div key={r.user_id} style={{
              background: 'linear-gradient(145deg, rgba(20,25,45,0.9), rgba(10,15,30,0.95))',
              border: `1px solid ${medal[i]}55`, borderRadius: 18, padding: 22, textAlign: 'center',
              boxShadow: `0 0 24px ${medal[i]}22`
            }}>
              <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: '50%', background: `radial-gradient(circle, ${medal[i]}33, transparent 70%)`, border: `1.5px solid ${medal[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: medal[i] }}>{i + 1}</div>
              <div style={{ color: '#fff', fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 13, marginTop: 4, color: '#FFD700' }}>{r.energy} энергии</div>
              <div style={{ fontSize: 12, marginTop: 2, color: '#a0e9ff' }}>{r.balance} кармиков</div>
            </div>
          ))}
        </div>

        {/* Рейтинг */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.length === 0 && (
            <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)' }}>
              Нет данных за выбранный период
            </div>
          )}
          {sorted.map((r, idx) => (
            <div key={r.user_id} onClick={() => setExpanded(expanded === r.user_id ? null : r.user_id)}
              style={{
                background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 14, padding: '14px 18px',
                border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'border-color 0.25s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
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
                        <div style={{ fontSize: 11, color: '#888' }}>{BAND_LABELS[band]} · {pts.length} записей</div>
                      </div>
                    )
                  })}
                  {metrics.length === 0 && <p style={{ color: '#777', fontSize: 13 }}>Нет показателей</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default withAuth(ResultsAdmin, { anyStaff: true })
