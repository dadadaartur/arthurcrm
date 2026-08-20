import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { bandFor, BAND_RANK, BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const shift = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d) }
const today = toISO(new Date())

const dateInput = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 12, padding: '6px 10px', outline: 'none', colorScheme: 'dark', width: 140 }
const tiny = a => ({ padding: '5px 13px', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: a ? 600 : 400, background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`, color: a ? '#FFD700' : '#aaa', transition: 'all 0.2s', whiteSpace: 'nowrap' })
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 10, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s', whiteSpace: 'nowrap' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }
const overallBand = v => v < 0 ? 'none' : v >= 3.5 ? 'ultra' : v >= 2.5 ? 'top' : v >= 1.5 ? 'mid' : v >= 0.5 ? 'min' : 'none'

function AnalyticsAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [cur, setCur] = useState([])
  const [prev, setPrev] = useState([])
  const [from, setFrom] = useState(shift(today, -6))
  const [to, setTo] = useState(today)
  const [p, setP] = useState('week')
  const [chartId, setChartId] = useState(null)
  const [sortAsc, setSortAsc] = useState(false)
  const [detail, setDetail] = useState(null)
  const [fillOpen, setFillOpen] = useState(false)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const applyPreset = k => { setP(k); if (k === 'yesterday') { setFrom(shift(today, -1)); setTo(shift(today, -1)) } if (k === 'week') { setFrom(shift(today, -6)); setTo(today) } if (k === 'month') { setFrom(shift(today, -29)); setTo(today) } }

  const load = async () => {
    setLoading(true)
    const h = await auth()
    const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)
    const [r1, r2] = await Promise.all([
      fetch(`/api/kpi/analytics?from=${from}&to=${to}`, { headers: h }),
      fetch(`/api/kpi/analytics?from=${shift(from, -days)}&to=${shift(from, -1)}`, { headers: h })
    ])
    if (r1.ok) { const d = await r1.json(); setMetrics(d.metrics); setEmployees(d.employees); setCur(d.entries); if (!chartId && d.metrics[0]) setChartId(d.metrics[0].id) }
    if (r2.ok) { const d = await r2.json(); setPrev(d.entries) }
    setLoading(false)
  }
  useEffect(() => { load() }, [from, to])

  const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)
  const empName = id => { const e = employees.find(x => x.user_id === id); return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—' }
  const isSum = m => m.kpi_type === 'cumulative' || m.kpi_type === 'min_period'
  const agg = (m, list) => { if (!list.length) return null; const s = list.reduce((a, e) => a + Number(e.value), 0); return isSum(m) ? Math.round(s) : Math.round((s / list.length) * 10) / 10 }
  const scaled = m => { const k = isSum(m) ? days : 1; return { ...m, thr_min: m.thr_min * k, thr_mid: m.thr_mid * k, thr_top: m.thr_top * k, thr_ultra: m.thr_ultra * k } }
  const bandOf = (m, v) => v == null ? null : bandFor(v, scaled(m))

  const metricSummary = metrics.map(m => {
    const cl = cur.filter(e => e.metric_id === m.id), pl = prev.filter(e => e.metric_id === m.id)
    const cv = agg(m, cl), pv = agg(m, pl)
    const below = employees.filter(emp => bandOf(m, agg(m, cl.filter(e => e.user_id === emp.user_id))) === 'none').length
    const delta = cv != null && pv ? Math.round(((cv - pv) / pv) * 100) : null
    return { m, cv, delta, below }
  })

  const rows = employees.map(emp => {
    const cells = metrics.map(m => { const v = agg(m, cur.filter(e => e.user_id === emp.user_id && e.metric_id === m.id)); return { m, v, band: bandOf(m, v) } })
    const rated = cells.filter(c => c.band)
    const overall = rated.length ? rated.reduce((s, c) => s + BAND_RANK[c.band], 0) / rated.length : -1
    const belowCount = cells.filter(c => c.band === 'none').length
    return { emp, cells, overall, belowCount, hasData: rated.length > 0 }
  }).filter(r => r.hasData)
  rows.sort((a, b) => sortAsc ? a.overall - b.overall : b.overall - a.overall)
  const top = [...rows].sort((a, b) => b.overall - a.overall).slice(0, 3)
  const anti = rows.filter(r => r.belowCount > 0).sort((a, b) => b.belowCount - a.belowCount || a.overall - b.overall).slice(0, 3)

  // Динамика по выбранному показателю (дневные пороги)
  const cm = metrics.find(x => x.id === chartId) || metrics[0]
  const cDates = [...new Set(cur.filter(e => e.metric_id === cm?.id).map(e => e.entry_date))].sort()
  const cMax = cm ? Math.max(Number(cm.thr_ultra) || 0, ...cur.filter(e => e.metric_id === cm.id).map(e => Number(e.value) || 0)) * 1.15 || 1 : 1
  const W = 760, H = 220, PL = 44, PB = 26
  const cy = v => H - PB - (Number(v) / cMax) * (H - PB - 12)
  const cx = i => PL + (i / Math.max(1, cDates.length - 1)) * (W - PL - 10)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Аналитика команды" />

        {/* Тонкий период на всю ширину */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 14, background: 'rgba(15,20,35,0.85)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 18 }}>
          <span style={{ fontSize: 12, color: '#888' }}>Период</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setP('') }} style={dateInput} />
          <span style={{ color: '#555' }}>—</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setP('') }} style={dateInput} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => applyPreset('yesterday')} style={tiny(p === 'yesterday')}>Вчера</button>
            <button onClick={() => applyPreset('week')} style={tiny(p === 'week')}>Неделя</button>
            <button onClick={() => applyPreset('month')} style={tiny(p === 'month')}>Месяц</button>
          </div>
          <span style={{ fontSize: 11, color: '#666' }}>{days} дн.</span>
          <button onClick={() => setFillOpen(true)} style={{ ...ghostBtn, marginLeft: 'auto', borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Заполнить показатели</button>
        </div>

        {/* Сводка по показателям */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginBottom: 18 }}>
          {metricSummary.map(s => (
            <div key={s.m.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 14, border: `1px solid ${s.below ? 'rgba(244,67,54,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
              <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 6 }}>{s.m.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#FFD700' }}>{s.cv != null ? s.cv + s.m.unit : '—'}</span>
                {s.delta != null && <span style={{ fontSize: 11, fontWeight: 700, color: s.delta >= 0 ? '#4ade80' : '#f87171' }}>{s.delta >= 0 ? '▲' : '▼'}{Math.abs(s.delta)}%</span>}
              </div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>цель ≥ {scaled(s.m).thr_mid}{s.m.unit} за период</div>
              {s.below > 0 && <div style={{ fontSize: 10, color: '#f87171', marginTop: 3 }}>ниже порога: {s.below} чел.</div>}
            </div>
          ))}
        </div>

        {/* Топ / требуют внимания */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 14, border: '1px solid rgba(74,222,128,0.3)' }}>
            <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, marginBottom: 4 }}>Топ периода</div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>средний уровень по всем показателям (0–4)</div>
            {top.map((r, i) => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12 }}>
                <span style={{ color: '#fff' }}>{i + 1}. {empName(r.emp.user_id)}</span>
                <span style={{ color: BAND_COLORS[overallBand(r.overall)], fontWeight: 700 }}>{r.overall.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 14, border: '1px solid rgba(244,67,54,0.3)' }}>
            <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700, marginBottom: 4 }}>Требуют внимания</div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>число показателей ниже порога</div>
            {anti.length === 0 ? <div style={{ fontSize: 12, color: '#4ade80' }}>Все показатели в норме</div> : anti.map((r, i) => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12 }}>
                <span style={{ color: '#fff' }}>{i + 1}. {empName(r.emp.user_id)}</span>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{r.belowCount} ниже</span>
              </div>
            ))}
          </div>
        </div>

        {/* Динамика */}
        {cm && (
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Динамика по дням</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {metrics.map(m => <button key={m.id} onClick={() => setChartId(m.id)} style={tiny(m.id === cm.id)}>{m.name}</button>)}
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
              {['min', 'mid', 'top', 'ultra'].map(b => (
                <g key={b}><line x1={PL} x2={W - 10} y1={cy(cm['thr_' + b])} y2={cy(cm['thr_' + b])} stroke={BAND_COLORS[b]} strokeOpacity="0.3" strokeDasharray="4 4" /><text x={W - 12} y={cy(cm['thr_' + b]) - 3} fill={BAND_COLORS[b]} fontSize="9" textAnchor="end">{BAND_LABELS[b]} {cm['thr_' + b]}</text></g>
              ))}
              {cDates.map((d, i) => (i % Math.ceil(cDates.length / 6) === 0) && <text key={d} x={cx(i)} y={H - 8} fill="#666" fontSize="9" textAnchor="middle">{d.slice(8)}.{d.slice(5, 7)}</text>)}
              {employees.map((emp, ei) => {
                const list = cur.filter(e => e.user_id === emp.user_id && e.metric_id === cm.id)
                if (!list.length) return null
                return <polyline key={emp.user_id} fill="none" stroke={PALETTE[ei % PALETTE.length]} strokeWidth="2" strokeLinejoin="round" points={list.map(e => `${cx(cDates.indexOf(e.entry_date))},${cy(e.value)}`).join(' ')} />
              })}
            </svg>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              {employees.map((emp, ei) => <span key={emp.user_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#aaa' }}><span style={{ width: 10, height: 3, background: PALETTE[ei % PALETTE.length], borderRadius: 2 }} />{empName(emp.user_id)}</span>)}
            </div>
          </div>
        )}

        {/* Таблица сотрудник × показатели */}
        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Показатели по сотрудникам <span style={{ fontSize: 10, color: '#666', fontWeight: 400 }}>· итог = средний уровень (0–4)</span></h4>
            <button onClick={() => setSortAsc(s => !s)} style={tiny(false)}>{sortAsc ? 'Сначала слабые' : 'Сначала сильные'}</button>
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
                      {c.v != null ? <div><div style={{ color: '#fff', fontWeight: 600 }}>{c.v}{c.m.unit}</div><div style={{ fontSize: 10, color: BAND_COLORS[c.band], fontWeight: 700 }}>{BAND_LABELS[c.band]}</div></div> : <span style={{ color: '#555' }}>—</span>}
                    </td>
                  ))}
                  <td style={{ padding: 8, textAlign: 'center' }}><span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${BAND_COLORS[overallBand(r.overall)]}18`, color: BAND_COLORS[overallBand(r.overall)], border: `1px solid ${BAND_COLORS[overallBand(r.overall)]}44` }}>{r.overall.toFixed(1)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FillModal open={fillOpen} onClose={() => setFillOpen(false)} metrics={metrics} employees={employees} onSaved={load} />

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
                <div style={{ fontSize: 11, color: '#888' }}>пороги: мин {scaled(c.m).thr_min} · средн {scaled(c.m).thr_mid} · топ {scaled(c.m).thr_top} · ультра {scaled(c.m).thr_ultra}{c.m.unit}</div>
                {c.band === 'none' && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>Ниже порога — стоит обсудить с сотрудником.</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PALETTE = ['#FFD700', '#a0e9ff', '#c084fc', '#4ade80', '#fda4af', '#f87171', '#e2e8f0', '#86efac', '#60a5fa', '#f97316']

// ===== Заполнение показателей (рабочее) =====
function FillModal({ open, onClose, metrics, employees, onSaved }) {
  const { showSuccess, showError } = useFeedback()
  const [fillMode, setFillMode] = useState('day')
  const [date, setDate] = useState(today)
  const [range, setRange] = useState({ from: '', to: '' })
  const [values, setValues] = useState({})
  const [importOpen, setImportOpen] = useState(false)
  const [importTab, setImportTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [gUrl, setGUrl] = useState('')
  if (!open) return null

  const pool = (() => { const p = {}; metrics.forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i })); return Object.values(p) })()
  const directCols = metrics.filter(m => !m.formula).map(m => ({ key: 'm' + m.id, label: m.name, unit: m.unit, inverse: m.kpi_type === 'inverse' }))
  const cols = [...pool.map(c => ({ ...c, inverse: false })), ...directCols]
  const formulaMetrics = metrics.filter(m => m.formula)
  const gridTemplate = `180px repeat(${cols.length}, 96px) repeat(${formulaMetrics.length}, 100px)`
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const datesInRange = () => { if (!range.from || !range.to) return []; const out = [], d = new Date(range.from + 'T00:00:00'), end = new Date(range.to + 'T00:00:00'); while (d <= end) { out.push(toISO(d)); d.setDate(d.getDate() + 1) } return out }
  const computeValue = (m, uid) => {
    if (m.formula) { const den = Number(values[uid]?.[m.formula.den]) || 0, num = Number(values[uid]?.[m.formula.num]) || 0; return den > 0 ? Math.round((num / den) * (m.formula.mult || 100) * 10) / 10 : null }
    const v = values[uid]?.['m' + m.id]; return v === '' || v == null ? null : Number(v)
  }
  const save = async () => {
    const dates = fillMode === 'day' ? (date ? [date] : []) : datesInRange()
    if (!dates.length) { showError(fillMode === 'day' ? 'Выберите дату' : 'Выберите период'); return }
    const { data: { session } } = await supabase.auth.getSession()
    const entries = []
    employees.forEach(emp => metrics.forEach(m => { const raw = computeValue(m, emp.user_id); if (raw == null) return; const perDay = dates.length > 1 ? Math.round((raw / dates.length) * 10) / 10 : raw; dates.forEach(d => entries.push({ metricId: m.id, userId: emp.user_id, value: perDay, date: d })) }))
    if (!entries.length) { showError('Нет заполненных значений'); return }
    const res = await fetch('/api/company-admin/kpi/entries-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ entries }) })
    if (res.ok) { showSuccess(`Сохранено: ${entries.length} записей`); setValues({}); onClose(); onSaved() } else showError('Ошибка сохранения')
  }
  const applyRows = rows => { if (!rows?.length) return 'Пустые данные'; const header = rows[0].map(h => (h || '').trim()); const emailIdx = header.findIndex(h => /email|почта/i.test(h)); if (emailIdx < 0) return 'Не найдена колонка «Email»'; const ltk = {}; cols.forEach(c => ltk[c.label.toLowerCase()] = c.key); const colMap = header.map((h, i) => ({ i, key: ltk[h.toLowerCase()] })).filter(x => x.key); let applied = 0; const next = { ...values }; rows.slice(1).forEach(r => { const email = (r[emailIdx] || '').trim().toLowerCase(); const emp = employees.find(e => (e.email || '').toLowerCase() === email); if (!emp) return; next[emp.user_id] = { ...(next[emp.user_id] || {}) }; colMap.forEach(({ i, key }) => { const v = parseFloat(String(r[i]).replace(',', '.')); if (!isNaN(v)) { next[emp.user_id][key] = v; applied++ } }) }); setValues(next); return `Применено значений: ${applied}` }
  const parseText = t => { const d = t.includes('\t') ? '\t' : (t.split(';').length > t.split(',').length ? ';' : ','); return t.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(d)) }
  const fetchGoogle = async () => { const id = (gUrl.match(/\/d\/([\w-]+)/) || [])[1]; if (!id) { showError('Неверная ссылка'); return } try { const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`); const msg = applyRows(parseText(await r.text())); if (msg.startsWith('Применено')) showSuccess(msg); else showError(msg) } catch (e) { showError('Не удалось скачать') } }
  const copyTemplate = async () => { const header = ['Email', ...cols.map(c => c.label)]; const ex = ['ivanov@company.ru', ...cols.map(() => '0')]; try { await navigator.clipboard.writeText([header.join('\t'), ex.join('\t')].join('\n')); showSuccess('Шаблон скопирован — вставьте Ctrl+V') } catch (e) { showError('Не удалось') } }
  const dateBanner = fillMode === 'day' ? `Цифры будут записаны за дату: ${date || '—'}` : `Цифры распределятся по дням периода: ${range.from || '—'} … ${range.to || '—'}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(1240px, 96vw)', height: '88vh', background: 'linear-gradient(150deg, rgba(24,30,54,0.98), rgba(10,14,28,0.99))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#fff' }}>Заполнить показатели</h3>
          <button onClick={() => setFillMode('day')} style={tiny(fillMode === 'day')}>За день</button>
          <button onClick={() => setFillMode('period')} style={tiny(fillMode === 'period')}>За период</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {fillMode === 'day' ? <input type="date" value={date} onChange={e => setDate(e.target.value)} style={dateInput} /> : <><input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} style={dateInput} /><input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} style={dateInput} /></>}
            <button onClick={() => setImportOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(160,233,255,0.4)', color: '#a0e9ff' }}>Импорт</button>
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', fontSize: 11, marginBottom: 10 }}>{dateBanner}</div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ width: 'fit-content', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 6, marginBottom: 6, position: 'sticky', top: 0, background: 'rgba(10,14,28,0.98)', padding: '6px 0', zIndex: 2 }}>
              <div style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>Сотрудник</div>
              {cols.map(c => <div key={c.key} style={{ textAlign: 'center', padding: '4px 4px', borderRadius: 8, background: c.inverse ? 'rgba(160,233,255,0.06)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><div style={{ fontSize: 10, color: '#a0e9ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</div><div style={{ fontSize: 9, color: '#666' }}>{c.inverse ? 'меньше=лучше' : (c.unit || '')}</div></div>)}
              {formulaMetrics.map(m => <div key={m.id} style={{ textAlign: 'center', padding: '4px 4px', borderRadius: 8, background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}><div style={{ fontSize: 10, color: '#FFD700', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div><div style={{ fontSize: 9, color: '#666' }}>авто</div></div>)}
            </div>
            {employees.map(emp => (
              <div key={emp.user_id} style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 170 }} title={empName(emp)}>{empName(emp)}</div>
                {cols.map(c => <input key={c.key} type="number" step="0.1" value={values[emp.user_id]?.[c.key] ?? ''} onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))} className="input-field" style={{ width: '100%', textAlign: 'center', padding: '8px 2px' }} />)}
                {formulaMetrics.map(m => { const v = computeValue(m, emp.user_id); return <div key={m.id} style={{ fontSize: 12, color: v != null ? '#FFD700' : '#555', fontWeight: 600, textAlign: 'center' }}>{v != null ? v + m.unit : '—'}</div> })}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={onClose} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
          <button onClick={save} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
        </div>

        {importOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
            <div style={{ width: 560, background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 16, padding: 20, position: 'relative' }}>
              <button onClick={() => setImportOpen(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#fff' }}>Импорт из таблицы</h4>
              <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', fontSize: 11, marginBottom: 10 }}>{dateBanner}</div>
              <button onClick={copyTemplate} style={{ ...ghostBtn, padding: '6px 12px', fontSize: 11, marginBottom: 10 }}>Шаблон</button>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}><button onClick={() => setImportTab('paste')} style={tiny(importTab === 'paste')}>Вставить</button><button onClick={() => setImportTab('google')} style={tiny(importTab === 'google')}>Ссылка</button></div>
              {importTab === 'paste' ? <><textarea className="input-field" style={{ width: '100%' }} rows={6} placeholder={'Email\tКол-во звонков\nivanov@co.ru\t120'} value={pasteText} onChange={e => setPasteText(e.target.value)} /><button onClick={() => { const msg = applyRows(parseText(pasteText)); if (msg.startsWith('Применено')) { showSuccess(msg); setImportOpen(false) } else showError(msg) }} style={{ ...ghostBtn, marginTop: 8 }}>Применить</button></> : <><input className="input-field" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…" value={gUrl} onChange={e => setGUrl(e.target.value)} /><button onClick={fetchGoogle} style={{ ...ghostBtn, marginTop: 8 }}>Забрать данные</button></>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default withAuth(AnalyticsAdmin, { permission: 'can_review_tasks' })
