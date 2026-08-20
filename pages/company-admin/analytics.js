import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'
import { bandFor, BAND_RANK, BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const shift = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d) }
const today = toISO(new Date())

const chip = (active, color = '#FFD700') => ({
  padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
  background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)',
  border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.12)'}`, color: active ? color : '#aaa', transition: 'all 0.2s'
})

function AnalyticsAdmin() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [cur, setCur] = useState([])
  const [prev, setPrev] = useState([])
  const [from, setFrom] = useState(shift(today, -6))
  const [to, setTo] = useState(today)
  const [preset, setPreset] = 'week'
  const [sortAsc, setSortAsc] = useState(false)
  const [detail, setDetail] = useState(null)
  const [p, setP] = useState('week')

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const applyPreset = (key) => {
    setP(key)
    if (key === 'yesterday') { setFrom(shift(today, -1)); setTo(shift(today, -1)) }
    if (key === 'week') { setFrom(shift(today, -6)); setTo(today) }
    if (key === 'month') { setFrom(shift(today, -29)); setTo(today) }
  }

  const load = async () => {
    setLoading(true)
    const h = await auth()
    const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)
    const pFrom = shift(from, -days), pTo = shift(from, -1)
    const [r1, r2] = await Promise.all([
      fetch(`/api/kpi/analytics?from=${from}&to=${to}`, { headers: h }),
      fetch(`/api/kpi/analytics?from=${pFrom}&to=${pTo}`, { headers: h })
    ])
    if (r1.ok) { const d = await r1.json(); setMetrics(d.metrics); setEmployees(d.employees); setCur(d.entries) }
    if (r2.ok) { const d = await r2.json(); setPrev(d.entries) }
    setLoading(false)
  }
  useEffect(() => { load() }, [from, to])

  const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)
  const empName = id => { const e = employees.find(x => x.user_id === id); return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—' }
  const isSum = m => m.kpi_type === 'cumulative' || m.kpi_type === 'min_period'
  const agg = (m, list) => { if (!list.length) return null; const s = list.reduce((a, e) => a + Number(e.value), 0); return isSum(m) ? Math.round(s) : Math.round((s / list.length) * 10) / 10 }
  const scaled = (m) => ({ ...m, thr_min: m.thr_min * (isSum(m) ? days : 1), thr_mid: m.thr_mid * (isSum(m) ? days : 1), thr_top: m.thr_top * (isSum(m) ? days : 1), thr_ultra: m.thr_ultra * (isSum(m) ? days : 1) })
  const bandOf = (m, v) => v == null ? null : bandFor(v, scaled(m))

  // Сводка по показателю: значение за период, дельта к прошлому, сколько ниже порога
  const metricSummary = metrics.map(m => {
    const curList = cur.filter(e => e.metric_id === m.id)
    const prevList = prev.filter(e => e.metric_id === m.id)
    const cv = agg(m, curList), pv = agg(m, prevList)
    const below = employees.filter(emp => bandOf(m, agg(m, curList.filter(e => e.user_id === emp.user_id))) === 'none').length
    const delta = cv != null && pv ? Math.round(((cv - pv) / pv) * 100) : null
    return { m, cv, delta, below }
  })

  // Сотрудник × все показатели + общая оценка
  const rows = employees.map(emp => {
    const cells = metrics.map(m => {
      const v = agg(m, cur.filter(e => e.user_id === emp.user_id && e.metric_id === m.id))
      return { m, v, band: bandOf(m, v) }
    })
    const rated = cells.filter(c => c.band)
    const overall = rated.length ? rated.reduce((s, c) => s + BAND_RANK[c.band], 0) / rated.length : -1
    const belowCount = cells.filter(c => c.band === 'none').length
    return { emp, cells, overall, belowCount, hasData: rated.length > 0 }
  }).filter(r => r.hasData)
  rows.sort((a, b) => sortAsc ? a.overall - b.overall : b.overall - a.overall)
  const top = [...rows].sort((a, b) => b.overall - a.overall).slice(0, 3)
  const anti = [...rows].sort((a, b) => a.overall - b.overall).slice(0, 3)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Аналитика команды" />

        {/* Период */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: 14, borderRadius: 16, background: 'rgba(15,20,35,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 12, color: '#888' }}>Период:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#666' }}>с</span>
            <div style={{ width: 150 }}><DatePicker value={from} onChange={v => { if (v) { setFrom(v); setP('') } }} placeholder="Начало" /></div>
            <span style={{ fontSize: 11, color: '#666' }}>до</span>
            <div style={{ width: 150 }}><DatePicker value={to} onChange={v => { if (v) { setTo(v); setP('') } }} placeholder="Конец" /></div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => applyPreset('yesterday')} style={chip(p === 'yesterday')}>Вчера</button>
            <button onClick={() => applyPreset('week')} style={chip(p === 'week')}>Неделя</button>
            <button onClick={() => applyPreset('month')} style={chip(p === 'month')}>Месяц</button>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#666' }}>{days} дн.</span>
        </div>

        {/* Сводка по показателям — где просели */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
          {metricSummary.map(s => (
            <div key={s.m.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 16, border: `1px solid ${s.below ? 'rgba(244,67,54,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 6 }}>{s.m.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#FFD700' }}>{s.cv != null ? s.cv + s.m.unit : '—'}</span>
                {s.delta != null && <span style={{ fontSize: 12, fontWeight: 700, color: s.delta >= 0 ? '#4ade80' : '#f87171' }}>{s.delta >= 0 ? '▲' : '▼'} {Math.abs(s.delta)}%</span>}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>цель за период ≥ {scaled(s.m).thr_mid}{s.m.unit}</div>
              {s.below > 0 && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Ниже порога: {s.below} чел.</div>}
            </div>
          ))}
        </div>

        {/* Топ / требуют внимания */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 16, border: '1px solid rgba(74,222,128,0.3)' }}>
            <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 700, marginBottom: 10 }}>Топ периода</div>
            {top.map((r, i) => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: '#fff' }}>{i + 1}. {empName(r.emp.user_id)}</span>
                <span style={{ color: BAND_COLORS[overallBand(r.overall)], fontWeight: 700 }}>{BAND_LABELS[overallBand(r.overall)]}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 16, border: '1px solid rgba(244,67,54,0.3)' }}>
            <div style={{ fontSize: 13, color: '#f87171', fontWeight: 700, marginBottom: 10 }}>Требуют внимания</div>
            {anti.map((r, i) => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: '#fff' }}>{i + 1}. {empName(r.emp.user_id)}</span>
                <span style={{ color: '#f87171' }}>{r.belowCount} ниже порога</span>
              </div>
            ))}
          </div>
        </div>

        {/* Сотрудник × все показатели */}
        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Показатели по сотрудникам</h4>
            <button onClick={() => setSortAsc(s => !s)} style={chip(false, '#a0e9ff')}>{sortAsc ? 'Сначала слабые' : 'Сначала сильные'}</button>
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', minWidth: 700 }}>
            <thead><tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Сотрудник</th>
              {metrics.map(m => <th key={m.id} style={{ padding: 8, textAlign: 'center' }}>{m.name}<div style={{ fontSize: 9, color: '#666', fontWeight: 400 }}>цель ≥ {scaled(m).thr_mid}{m.unit}</div></th>)}
              <th style={{ padding: 8, textAlign: 'center' }}>Итог</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.emp.user_id} onClick={() => setDetail(r)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: r.belowCount ? 'rgba(244,67,54,0.05)' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = r.belowCount ? 'rgba(244,67,54,0.05)' : 'transparent'}>
                  <td style={{ padding: 8, color: '#fff', fontWeight: 500 }}>{empName(r.emp.user_id)}</td>
                  {r.cells.map(c => (
                    <td key={c.m.id} style={{ padding: 8, textAlign: 'center' }}>
                      {c.v != null ? (
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{c.v}{c.m.unit}</div>
                          <div style={{ fontSize: 10, color: BAND_COLORS[c.band], fontWeight: 700 }}>{BAND_LABELS[c.band]}</div>
                        </div>
                      ) : <span style={{ color: '#555' }}>—</span>}
                    </td>
                  ))}
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${BAND_COLORS[overallBand(r.overall)]}18`, color: BAND_COLORS[overallBand(r.overall)], border: `1px solid ${BAND_COLORS[overallBand(r.overall)]}44` }}>{BAND_LABELS[overallBand(r.overall)]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Детализация сотрудника */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 94vw)', maxHeight: '86vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.98), rgba(10,14,28,0.99))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setDetail(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>{empName(detail.emp.user_id)} · за период</h3>
            {detail.cells.map(c => (
              <div key={c.m.id} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BAND_COLORS[c.band]}33`, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{c.m.name}</span>
                  <span style={{ color: BAND_COLORS[c.band], fontWeight: 700, fontSize: 13 }}>{c.v != null ? c.v + c.m.unit : '—'} · {BAND_LABELS[c.band]}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  пороги: мин {scaled(c.m).thr_min} · средн {scaled(c.m).thr_mid} · топ {scaled(c.m).thr_top} · ультра {scaled(c.m).thr_ultra}{c.m.unit}
                </div>
                {c.band === 'none' && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>Показатель ниже порога — стоит обсудить с сотрудником.</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
function overallBand(v) { if (v < 0) return 'none'; if (v >= 3.5) return 'ultra'; if (v >= 2.5) return 'top'; if (v >= 1.5) return 'mid'; if (v >= 0.5) return 'min'; return 'none' }
export default withAuth(AnalyticsAdmin, { permission: 'can_review_tasks' })
