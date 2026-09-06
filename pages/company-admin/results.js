import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { BAND_COLORS, BAND_LABELS } from '../../lib/kpi'

// Насыщенная версия BAND_COLORS для этой уже светлой страницы — общий
// модуль подобран под тёмный фон и используется в непеределанной
// админке, менять его нельзя.

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const BAND_TEXT = { none: '#dc2626', min: '#b45309', mid: '#8a6208', top: '#137a39', ultra: '#7c3aed' }
const pill = a => ({
  padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(184,134,11,0.12)' : 'var(--bg-card)',
  border: `1px solid ${a ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
  color: a ? '#8a6208' : 'var(--text-secondary)', fontWeight: a ? 700 : 400, transition: 'all 0.2s'
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
  const medal = ['#8a6208', '#64748b', '#92400e']

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
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
        </div>

        {/* Пьедестал */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {podium.map((r, i) => (
            <div key={r.user_id} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${medal[i]}55`, borderRadius: 18, padding: 22, textAlign: 'center',
              boxShadow: 'var(--shadow-card)'
            }}>
              <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: '50%', background: `radial-gradient(circle, ${medal[i]}33, transparent 70%)`, border: `1.5px solid ${medal[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: medal[i] }}>{i + 1}</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 13, marginTop: 4, color: 'var(--accent-gold)' }}>{r.energy} энергии</div>
              <div style={{ fontSize: 12, marginTop: 2, color: '#0e7490' }}>{r.balance} кармиков</div>
            </div>
          ))}
        </div>

        {/* Рейтинг */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.length === 0 && (
            <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              Нет данных за выбранный период
            </div>
          )}
          {sorted.map((r, idx) => (
            <div key={r.user_id} onClick={() => setExpanded(expanded === r.user_id ? null : r.user_id)}
              style={{
                background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 14, padding: '14px 18px',
                border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'border-color 0.25s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 26, textAlign: 'center', fontWeight: 800, color: idx < 3 ? medal[idx] : 'var(--text-muted)' }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    <span style={{ color: 'var(--accent-gold)' }}>{r.energy} энергии</span>
                    <span style={{ color: '#0e7490' }}>{r.balance} кармиков</span>
                    <span>{r.tests_passed} тестов</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(r.latest || []).slice(0, 4).map(e => {
                    const m = metrics.find(x => x.id === e.metric_id)
                    return <span key={e.metric_id} title={m?.name} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: `${BAND_TEXT[e.band]}18`, color: BAND_TEXT[e.band], border: `1px solid ${BAND_TEXT[e.band]}44` }}>{e.value}{m?.unit}</span>
                  })}
                </div>
              </div>
              {expanded === r.user_id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }} onClick={e => e.stopPropagation()}>
                  {metrics.map(m => {
                    const pts = (r.entries || []).filter(e => e.metric_id === m.id).map(e => Number(e.value)).reverse()
                    const last = pts[pts.length - 1]
                    const band = (r.latest || []).find(x => x.metric_id === m.id)?.band || 'none'
                    return (
                      <div key={m.id} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                          <span style={{ color: BAND_TEXT[band], fontWeight: 700 }}>{last ?? '—'}{m.unit}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{BAND_LABELS[band]} · {pts.length} записей</div>
                      </div>
                    )
                  })}
                  {metrics.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Нет показателей</p>}
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
