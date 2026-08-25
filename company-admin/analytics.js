import { useEffect, useState } from 'react'
import DatePicker from '../../components/DatePicker'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import FillReportModal from '../../components/FillReportModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { bandFor, bandRankOf, BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const shift = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d) }
const today = toISO(new Date())
const dateInput = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 12, padding: '6px 10px', outline: 'none', colorScheme: 'dark', width: 140 }
const tiny = a => ({ padding: '5px 13px', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: a ? 600 : 400, background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`, color: a ? '#FFD700' : '#aaa', transition: 'all 0.2s', whiteSpace: 'nowrap' })
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 10, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s', whiteSpace: 'nowrap' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }
const overallBand = v => v < 0 ? 'none' : v >= 3.5 ? 'ultra' : v >= 2.5 ? 'top' : v >= 1.5 ? 'mid' : v >= 0.5 ? 'min' : 'none'
const PALETTE = ['#FFD700', '#a0e9ff', '#c084fc', '#4ade80', '#fda4af', '#f87171', '#e2e8f0', '#86efac', '#60a5fa', '#f97316']
const fmtDate = iso => { const [, m, d] = iso.split('-'); return `${d}.${m}` }

function AnalyticsAdmin() {
  const { showError } = useFeedback()
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
  const [fillOpen, setFillOpen] = useState(false)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const applyPreset = k => { setP(k); if (k === 'yesterday') { setFrom(shift(today, -1)); setTo(shift(today, -1)) } if (k === 'week') { setFrom(shift(today, -6)); setTo(today) } if (k === 'month') { setFrom(shift(today, -29)); setTo(today) } }

  const load = async () => {
    setLoading(true)
    try {
      const h = await auth()
      const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)
      const [r1, r2] = await Promise.all([
        fetch(`/api/kpi/analytics?from=${from}&to=${to}`, { headers: h }),
        fetch(`/api/kpi/analytics?from=${shift(from, -days)}&to=${shift(from, -1)}`, { headers: h })
      ])
      if (r1.ok) { const d = await r1.json(); setMetrics(d.metrics || []); setEmployees(d.employees || []); setCur(d.entries || []); setChartId(c => c || d.metrics?.[0]?.id || null) }
      else showError('Не удалось загрузить аналитику')
      if (r2.ok) { const d = await r2.json(); setPrev(d.entries || []) }
    } catch (e) { showError('Сетевая ошибка') }
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
    return { m, cv, delta, below, goal: scaled(m).thr_top }
  })

  const rows = employees.map(emp => {
    const cells = metrics.map(m => { const v = agg(m, cur.filter(e => e.user_id === emp.user_id && e.metric_id === m.id)); return { m, v, band: bandOf(m, v) } })
    const rated = cells.filter(c => c.band)
    // bandRankOf(c.m, ...) — ранг именно в рамках показателя этой ячейки;
    // для стандартных 4-уровневых показателей число совпадает со старым
    // BAND_RANK[band] один в один. Если когда-нибудь в «Общий рейтинг»
    // попадут вперемешку показатели с 4 уровнями и, например, с 6 кастомными
    // — среднее будет слегка смещено в пользу показателей с большим числом
    // уровней; для типичного случая (все показатели на стандартном шаблоне)
    // разницы нет вообще.
    const overall = rated.length ? rated.reduce((s, c) => s + bandRankOf(c.m, c.band), 0) / rated.length : -1
    const belowCount = cells.filter(c => c.band === 'none').length
    return { emp, cells, overall, belowCount, hasData: rated.length > 0 }
  }).filter(r => r.hasData)
  rows.sort((a, b) => sortAsc ? a.overall - b.overall : b.overall - a.overall)

  const top = [...rows].sort((a, b) => b.overall - a.overall).slice(0, 3)
  const anti = rows.filter(r => r.belowCount > 0).sort((a, b) => b.belowCount - a.belowCount || a.overall - b.overall).slice(0, 3)

  const cm = metrics.find(x => x.id === chartId) || metrics[0]
  const cDates = cm ? [...new Set(cur.filter(e => e.metric_id === cm.id).map(e => e.entry_date))].sort() : []
  const cVals = cm ? cur.filter(e => e.metric_id === cm.id).map(e => Number(e.value) || 0) : []
  const cThr = cm ? [Number(cm.thr_min), Number(cm.thr_mid), Number(cm.thr_top), Number(cm.thr_ultra)] : []
  const cMax = Math.max(...cThr, ...cVals, 1) * 1.15
  const W = 760, H = 250, PL = 48, PB = 28, PT = 14, PR = 10
  const cy = v => H - PB - ((Number(v) / cMax) * (H - PB - PT))
  const cx = i => PL + (i / Math.max(1, cDates.length - 1)) * (W - PL - PR)
  const chartEmps = rows.slice(0, 10)
  const segsFor = uid => {
    if (!cm) return []
    const map = Object.fromEntries(cur.filter(e => e.metric_id === cm.id && e.user_id === uid).map(e => [e.entry_date, Number(e.value)]))
    const segs = []; let seg = []
    cDates.forEach((d, i) => {
      const v = map[d]
      if (v == null || isNaN(v)) { if (seg.length) { segs.push(seg); seg = [] } }
      else seg.push({ x: cx(i), y: cy(v) })
    })
    if (seg.length) segs.push(seg)
    return segs
  }

  if (loading) return <LoadingScreen />

  const gridCols = `180px repeat(${metrics.length}, minmax(90px, 1fr)) 70px`

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Аналитика команды" />

        {/* Тонкая строка периода */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 14, background: 'rgba(15,20,35,0.85)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 18 }}>
          <span style={{ fontSize: 12, color: '#888' }}>Период</span>
          <DatePicker value={from} onChange={v => { setFrom(v); setP('') }} placeholder="С даты" />
          <span style={{ color: '#555' }}>—</span>
          <DatePicker value={to} onChange={v => { setTo(v); setP('') }} placeholder="По дату" />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => applyPreset('yesterday')} style={tiny(p === 'yesterday')}>Вчера</button>
            <button onClick={() => applyPreset('week')} style={tiny(p === 'week')}>Неделя</button>
            <button onClick={() => applyPreset('month')} style={tiny(p === 'month')}>Месяц</button>
          </div>
          <span style={{ fontSize: 11, color: '#666' }}>{days} дн.</span>
          <button onClick={() => setFillOpen(true)} style={{ ...ghostBtn, marginLeft: 'auto', borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Заполнить показатели</button>
        </div>

        {/* Карточки показателей */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
          {metricSummary.map(({ m, cv, delta, below, goal }) => {
            const b = bandOf(m, cv)
            return (
              <div key={m.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: `1px solid ${b ? BAND_COLORS[b] + '33' : 'rgba(255,255,255,0.08)'}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: b ? BAND_COLORS[b] : '#666', whiteSpace: 'nowrap' }}>{cv != null ? `${cv}${m.unit}` : '—'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {delta != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: delta >= 0 ? '#4ade80' : '#f87171' }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>
                  )}
                  <span style={{ fontSize: 11, color: '#888' }}>цель ≥ {goal}{m.unit}</span>
                </div>
                {below > 0 && <div style={{ fontSize: 11, color: '#f87171' }}>ниже порога: {below} чел.</div>}
              </div>
            )
          })}
          {metricSummary.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Показателей пока нет</div>}
        </div>

        {/* Топ периода + Требуют внимания */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(74,222,128,0.2)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#4ade80', marginBottom: 6 }}>Топ периода</h3>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Средняя оценка = среднее уровней по показателям (0–4), где 0 — ниже порога, 1 — мин, 2 — средний, 3 — топ, 4 — ультра.</p>
            {top.map((r, i) => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#fff' }}>{i + 1}. {empName(r.emp.user_id)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: BAND_COLORS[overallBand(r.overall)] }}>{r.overall.toFixed(1)} / 4</span>
              </div>
            ))}
            {top.length === 0 && <p style={{ fontSize: 12, color: '#666' }}>Нет данных за период</p>}
          </div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(248,113,113,0.2)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f87171', marginBottom: 6 }}>Требуют внимания</h3>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Число показателей ниже порога за период. Чем выше — тем больше зон риска у сотрудника.</p>
            {anti.map(r => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#fff' }}>{empName(r.emp.user_id)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>{r.belowCount} показ.</span>
              </div>
            ))}
            {anti.length === 0 && <p style={{ fontSize: 12, color: '#666' }}>Все показатели в норме</p>}
          </div>
        </div>

        {/* Динамика по дням */}
        {cm && cDates.length > 0 && (
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Динамика по дням</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {metrics.map(m => <button key={m.id} onClick={() => setChartId(m.id)} style={tiny(chartId === m.id)}>{m.name}</button>)}
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {[{ k: 'min', v: cm.thr_min }, { k: 'mid', v: cm.thr_mid }, { k: 'top', v: cm.thr_top }, { k: 'ultra', v: cm.thr_ultra }].map(t => (
                <g key={t.k}>
                  <line x1={PL} x2={W - PR} y1={cy(t.v)} y2={cy(t.v)} stroke={BAND_COLORS[t.k]} strokeDasharray="5 5" strokeOpacity="0.5" strokeWidth="1" />
                  <text x={W - PR - 2} y={cy(t.v) - 3} fontSize="9" fill={BAND_COLORS[t.k]} textAnchor="end" opacity="0.8">{BAND_LABELS[t.k]} {t.v}{cm.unit}</text>
                </g>
              ))}
              {chartEmps.map((r, ei) => (
                <g key={r.emp.user_id}>
                  {segsFor(r.emp.user_id).map((seg, si) => (
                    <polyline key={si} points={seg.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke={PALETTE[ei % PALETTE.length]} strokeWidth="1.8" strokeOpacity="0.85" />
                  ))}
                  {segsFor(r.emp.user_id).flatMap((seg, si) => seg.map((pt, pi) => (
                    <circle key={`${si}-${pi}`} cx={pt.x} cy={pt.y} r="2.4" fill={PALETTE[ei % PALETTE.length]} />
                  )))}
                </g>
              ))}
              {cDates.map((d, i) => (cDates.length <= 12 || i % Math.ceil(cDates.length / 12) === 0) && (
                <text key={d} x={cx(i)} y={H - 8} fontSize="9" fill="#666" textAnchor="middle">{fmtDate(d)}</text>
              ))}
            </svg>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
              {chartEmps.map((r, ei) => (
                <div key={r.emp.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE[ei % PALETTE.length] }} />
                  <span style={{ fontSize: 11, color: '#ccc' }}>{empName(r.emp.user_id)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Таблица сотрудник × показатели */}
        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Сотрудник × показатели</h3>
            <button onClick={() => setSortAsc(a => !a)} style={tiny(false)}>{sortAsc ? 'Слабые первые' : 'Сильные первые'}</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <div>Сотрудник</div>
                {metrics.map(m => <div key={m.id} style={{ textAlign: 'center' }}><div style={{ color: '#fff', fontWeight: 600, fontSize: 11 }}>{m.name}</div><div style={{ color: '#666', fontSize: 10 }}>цель ≥ {scaled(m).thr_top}{m.unit}</div></div>)}
                <div style={{ textAlign: 'center' }}>Итог</div>
              </div>
              {rows.map(r => (
                <div key={r.emp.user_id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '12px 20px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={empName(r.emp.user_id)}>{empName(r.emp.user_id)}</div>
                  {r.cells.map(c => (
                    <div key={c.m.id} style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.band ? BAND_COLORS[c.band] : '#555' }}>{c.v != null ? `${c.v}${c.m.unit}` : '—'}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: r.overall >= 0 ? BAND_COLORS[overallBand(r.overall)] : '#555' }}>{r.overall >= 0 ? r.overall.toFixed(1) : '—'}</div>
                </div>
              ))}
              {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#777' }}>Нет данных за период</div>}
            </div>
          </div>
        </div>
      </div>
      <FillReportModal open={fillOpen} onClose={() => setFillOpen(false)} onSaved={load} />
    </div>
  )
}
export default withAuth(AnalyticsAdmin, { permission: 'can_review_tasks' })
