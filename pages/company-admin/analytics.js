import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { bandFor, BAND_RANK, BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`, color: active ? color : '#999', transition: 'all 0.25s ease' }}>{children}</button>
)

function AnalyticsAdmin() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [entries, setEntries] = useState([])
  const [range, setRange] = useState(() => { const t = new Date(), f = new Date(); f.setDate(f.getDate() - 29); return { from: toISO(f), to: toISO(t) } })
  const [userId, setUserId] = useState('')
  const [metricId, setMetricId] = useState('')

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    setLoading(true)
    const h = await auth()
    const p = new URLSearchParams()
    if (range.from) p.set('from', range.from); if (range.to) p.set('to', range.to)
    if (userId) p.set('userId', userId); if (metricId) p.set('metricId', metricId)
    const r = await fetch(`/api/kpi/analytics?${p}`, { headers: h })
    if (r.ok) { const d = await r.json(); setMetrics(d.metrics); setEmployees(d.employees); setEntries(d.entries) }
    setLoading(false)
  }
  useEffect(() => { load() }, [range, userId, metricId])

  const empName = id => { const e = employees.find(x => x.user_id === id); return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—' }

  // Сводка
  const belowMin = entries.filter(e => { const m = metrics.find(x => x.id === e.metric_id); return m && bandFor(e.value, m) === 'none' })
  const avgRank = entries.length ? (entries.reduce((s, e) => { const m = metrics.find(x => x.id === e.metric_id); return s + (m ? BAND_RANK[bandFor(e.value, m)] : 0) }, 0) / entries.length) : 0

  // Динамика: средний уровень по дням
  const byDate = {}
  entries.forEach(e => { const m = metrics.find(x => x.id === e.metric_id); if (!m) return; (byDate[e.entry_date] = byDate[e.entry_date] || []).push(BAND_RANK[bandFor(e.value, m)]) })
  const dates = Object.keys(byDate).sort()
  const series = dates.map(d => byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length)
  const W = 640, H = 160, maxR = 4
  const pts = series.map((v, i) => `${(i / Math.max(1, series.length - 1)) * W},${H - (v / maxR) * (H - 20) - 10}`).join(' ')

  // Таблица по сотрудникам и показателям (последний уровень + тревога)
  const rows = employees.map(emp => ({
    emp,
    cells: metrics.map(m => {
      const list = entries.filter(e => e.user_id === emp.user_id && e.metric_id === m.id)
      const last = list[list.length - 1]
      const band = last ? bandFor(last.value, m) : null
      return { m, last, band }
    })
  }))

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Аналитика показателей" />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ width: 260 }}><DateRangePicker from={range.from} to={range.to} onChange={setRange} /></div>
          <select className="input-field" style={{ width: 200 }} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">Все сотрудники</option>
            {employees.map(e => <option key={e.user_id} value={e.user_id}>{empName(e.user_id)}</option>)}
          </select>
          <select className="input-field" style={{ width: 200 }} value={metricId} onChange={e => setMetricId(e.target.value)}>
            <option value="">Все показатели</option>
            {metrics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,215,0,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Записей за период</div><div style={{ fontSize: 30, fontWeight: 700, color: '#FFD700' }}>{entries.length}</div></div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(160,233,255,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Средний уровень</div><div style={{ fontSize: 30, fontWeight: 700, color: '#a0e9ff' }}>{avgRank.toFixed(1)} / 4</div></div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: `1px solid ${belowMin.length ? 'rgba(244,67,54,0.5)' : 'rgba(74,222,128,0.2)'}` }}>
            <div style={{ fontSize: 11, color: '#888' }}>Ниже порога (тревога)</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: belowMin.length ? '#f87171' : '#4ade80' }}>{belowMin.length}</div>
          </div>
        </div>

        {belowMin.length > 0 && (
          <div style={{ marginBottom: 20, padding: 14, borderRadius: 14, background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171', fontSize: 13 }}>
            Тревога: {belowMin.length} записей ниже порога. Обратите внимание: {[...new Set(belowMin.map(e => empName(e.user_id)))].slice(0, 5).join(', ')}
          </div>
        )}

        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Динамика среднего уровня по дням</h4>
          {series.length > 1 ? (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }}>
              <polyline points={pts} fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.6))' }} />
            </svg>
          ) : <p style={{ color: '#777', fontSize: 12 }}>Недостаточно данных для графика</p>}
        </div>

        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Уровни по сотрудникам</h4>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', minWidth: 600 }}>
            <thead><tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Сотрудник</th>
              {metrics.map(m => <th key={m.id} style={{ padding: 8 }}>{m.name}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.emp.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: 8, color: '#fff' }}>{empName(r.emp.user_id)}</td>
                  {r.cells.map(c => (
                    <td key={c.m.id} style={{ padding: 8, textAlign: 'center' }}>
                      {c.last ? (
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${BAND_COLORS[c.band]}18`, color: BAND_COLORS[c.band], border: `1px solid ${BAND_COLORS[c.band]}44` }}>
                          {c.last.value}{c.m.unit} · {BAND_LABELS[c.band]}
                        </span>
                      ) : <span style={{ color: '#555' }}>—</span>}
                      {c.band === 'none' && <span style={{ marginLeft: 6, color: '#f87171', fontWeight: 700 }}>!</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default withAuth(AnalyticsAdmin, { permission: 'can_review_tasks' })
