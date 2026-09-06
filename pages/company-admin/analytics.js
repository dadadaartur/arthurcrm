import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import DateRangePicker from '../../components/DateRangePicker'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import FillReportModal from '../../components/FillReportModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { bandFor, bandRankOf, BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const shift = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d) }
const today = toISO(new Date())
const tiny = a => ({ padding: '5px 13px', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: a ? 600 : 400, background: a ? 'rgba(184,134,11,0.12)' : 'var(--bg-card)', border: `1px solid ${a ? 'var(--border-gold)' : 'var(--border-subtle)'}`, color: a ? '#8a6208' : 'var(--text-secondary)', transition: 'all 0.2s', whiteSpace: 'nowrap' })
const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 10, padding: '7px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s', whiteSpace: 'nowrap' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 12px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }
// Насыщенная версия BAND_COLORS — общий модуль подобран под тёмный фон,
// используется в непеределанной админке, менять нельзя.
const BAND_TEXT = { none: '#dc2626', min: '#b45309', mid: '#8a6208', top: '#137a39', ultra: '#7c3aed' }
const overallBand = v => v < 0 ? 'none' : v >= 3.5 ? 'ultra' : v >= 2.5 ? 'top' : v >= 1.5 ? 'mid' : v >= 0.5 ? 'min' : 'none'
const PALETTE = ['#8a6208', '#0e7490', '#7c3aed', '#137a39', '#be123c', '#dc2626', '#475569', '#15803d', '#2563eb', '#b45309']
const fmtDate = iso => { const [, m, d] = iso.split('-'); return `${d}.${m}` }

function ForecastBanner({ forecast, onCreateTask }) {
  const [expanded, setExpanded] = useState(false)
  if (!forecast || !forecast.ready) {
    return (
      <div style={{ padding: '14px 18px', borderRadius: 14, background: 'var(--bg-page)', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        Прогноз на месяц появится после первых 3 дней данных в текущем календарном месяце.
      </div>
    )
  }
  const allGood = forecast.atRiskCount === 0
  return (
    <div style={{
      borderRadius: 16, padding: 18, marginBottom: 18,
      background: allGood ? 'linear-gradient(135deg, rgba(19,122,57,0.08), rgba(19,122,57,0.02))' : 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.02))',
      border: `1px solid ${allGood ? 'rgba(19,122,57,0.3)' : 'rgba(220,38,38,0.3)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Прогноз на месяц при текущем темпе</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: allGood ? '#137a39' : '#dc2626' }}>
            {allGood ? `Все ${forecast.totalCount} цели — на пути к выполнению` : `${forecast.totalCount - forecast.atRiskCount} из ${forecast.totalCount} целей на пути, ${forecast.atRiskCount} — под угрозой`}
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ fontSize: 12, fontWeight: 600, color: allGood ? '#137a39' : '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
          {expanded ? 'Свернуть' : 'Разбор по целям →'}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {forecast.items.map(f => (
            <div key={f.metricId} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-card)', border: `1px solid ${f.onTrack ? 'rgba(19,122,57,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.metricName}</span>
                <span style={{ color: f.onTrack ? '#137a39' : '#dc2626', fontWeight: 700 }}>{f.projected}{f.unit} к концу месяца (цель {f.onTrack ? '≥' : '≥'} {f.goal}{f.unit})</span>
              </div>
              {f.lowConfidence && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Прогноз предварительный — мало данных с начала месяца</div>}
              {!f.onTrack && f.cause?.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                  При текущих тенденциях команду вниз тянут: <b style={{ color: 'var(--text-primary)' }}>{f.cause.join(', ')}</b>. Чтобы изменить тренд — начните с них.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const INSIGHT_STYLE = {
  risk: { color: '#dc2626', bg: 'linear-gradient(135deg, rgba(220,38,38,0.06), rgba(220,38,38,0.02))', border: 'rgba(220,38,38,0.3)', label: 'Требует внимания' },
  anomaly: { color: '#7c3aed', bg: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))', border: 'rgba(124,58,237,0.28)', label: 'Аномалия' },
  training: { color: '#0e7490', bg: 'linear-gradient(135deg, rgba(14,116,144,0.06), rgba(14,116,144,0.02))', border: 'rgba(14,116,144,0.28)', label: 'Обучение' },
  win: { color: '#137a39', bg: 'linear-gradient(135deg, rgba(19,122,57,0.06), rgba(19,122,57,0.02))', border: 'rgba(19,122,57,0.28)', label: 'Победа' },
}

function InsightCard({ insight, onCreateTask, compact }) {
  const s = INSIGHT_STYLE[insight.type]
  const isPriority = insight.type === 'risk'
  return (
    <div style={{
      background: 'var(--bg-card)', backgroundImage: s.bg, borderRadius: 14,
      padding: compact ? 12 : 16, border: `1px solid ${s.border}`,
      boxShadow: isPriority ? '0 0 0 1px rgba(220,38,38,0.08), 0 4px 16px rgba(220,38,38,0.1)' : 'var(--shadow-card)',
      animation: isPriority ? 'insightPulse 3s ease-in-out infinite' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-card)', color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
        {insight.changePct != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{insight.changePct > 0 ? '+' : ''}{insight.changePct}%</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 8px' }}>{insight.text}</p>
      {insight.advice && !compact && (
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px', fontStyle: 'italic' }}>{insight.advice}</p>
      )}
      {(insight.type === 'risk' || insight.type === 'anomaly') && onCreateTask && (
        <button onClick={() => onCreateTask(insight)} style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: 'var(--bg-card)', border: `1px solid ${s.border}`, color: s.color, cursor: 'pointer' }}>
          Назначить задание →
        </button>
      )}
    </div>
  )
}

function InsightsPanel({ from, to, empName }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState([])
  const [forecast, setForecast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showAllWins, setShowAllWins] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`/api/company-admin/insights?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) { const d = await r.json(); setInsights(d.insights || []); setForecast(d.forecast || null) }
      setLoading(false)
    }
    load()
  }, [from, to])

  const createTaskFor = (insight) => {
    router.push(`/company-admin/tasks?tab=create&prefill_user=${insight.userId}&prefill_title=${encodeURIComponent(`Подтянуть «${insight.metricName}»`)}`)
  }

  const priority = insights.filter(i => i.type === 'risk' || i.type === 'anomaly' || i.type === 'training')
  const wins = insights.filter(i => i.type === 'win')
  const shownPriority = filter === 'all' ? priority : priority.filter(i => i.type === filter)
  const shownWins = filter === 'all' || filter === 'win' ? (showAllWins ? wins : wins.slice(0, 3)) : []
  const counts = { risk: insights.filter(i => i.type === 'risk').length, anomaly: insights.filter(i => i.type === 'anomaly').length, training: insights.filter(i => i.type === 'training').length, win: wins.length }

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(184,134,11,0.04) 50%, rgba(19,122,57,0.03))', borderRadius: 18, padding: 20, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #7c3aed, #8a6208)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ИИ-аналитик</h3>
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0 }}>Сам находит, что заслуживает внимания</p>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={tiny(filter === 'all')}>Все · {insights.length}</button>
          {counts.risk > 0 && <button onClick={() => setFilter('risk')} style={{ ...tiny(filter === 'risk'), color: filter === 'risk' ? '#dc2626' : undefined, borderColor: filter === 'risk' ? 'rgba(220,38,38,0.4)' : undefined }}>Внимание · {counts.risk}</button>}
          {counts.anomaly > 0 && <button onClick={() => setFilter('anomaly')} style={{ ...tiny(filter === 'anomaly'), color: filter === 'anomaly' ? '#7c3aed' : undefined, borderColor: filter === 'anomaly' ? 'rgba(124,58,237,0.4)' : undefined }}>Аномалии · {counts.anomaly}</button>}
          {counts.training > 0 && <button onClick={() => setFilter('training')} style={{ ...tiny(filter === 'training'), color: filter === 'training' ? '#0e7490' : undefined, borderColor: filter === 'training' ? 'rgba(14,116,144,0.4)' : undefined }}>Обучение · {counts.training}</button>}
          {counts.win > 0 && <button onClick={() => setFilter('win')} style={{ ...tiny(filter === 'win'), color: filter === 'win' ? '#137a39' : undefined, borderColor: filter === 'win' ? 'rgba(19,122,57,0.4)' : undefined }}>Победы · {counts.win}</button>}
        </div>
      </div>
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Анализируем показатели команды…</p>
      ) : (
        <>
          <ForecastBanner forecast={forecast} />
          {insights.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>За этот период явных находок нет — команда идёт ровно.</p>
      ) : (
        <>
          {shownPriority.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginBottom: shownWins.length > 0 ? 18 : 0 }}>
              {shownPriority.map((ins, i) => <InsightCard key={i} insight={ins} onCreateTask={createTaskFor} />)}
            </div>
          )}
          {shownWins.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Победы</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {shownWins.map((ins, i) => <InsightCard key={i} insight={ins} compact />)}
              </div>
              {wins.length > 3 && filter !== 'win' && (
                <button onClick={() => setShowAllWins(v => !v)} style={{ marginTop: 10, fontSize: 11.5, color: '#137a39', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {showAllWins ? 'Свернуть' : `Показать все победы (${wins.length})`}
                </button>
              )}
            </div>
          )}
        </>
          )}
        </>
      )}
      <style jsx global>{`@keyframes insightPulse { 0%, 100% { box-shadow: 0 0 0 1px rgba(220,38,38,0.08), 0 4px 16px rgba(220,38,38,0.1); } 50% { box-shadow: 0 0 0 1px rgba(220,38,38,0.16), 0 4px 22px rgba(220,38,38,0.18); } }`}</style>
    </div>
  )
}

function AnalyticsAdmin() {
  const { showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [scope, setScope] = useState('company')
  const [employees, setEmployees] = useState([])
  const [cur, setCur] = useState([])
  const [prev, setPrev] = useState([])
  const [from, setFrom] = useState(shift(today, -6))
  const [to, setTo] = useState(today)
  const [chartId, setChartId] = useState(null)
  const [sortAsc, setSortAsc] = useState(false)
  const [fillOpen, setFillOpen] = useState(false)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const load = async () => {
    setLoading(true)
    try {
      const h = await auth()
      const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)
      const [r1, r2] = await Promise.all([
        fetch(`/api/kpi/analytics?from=${from}&to=${to}`, { headers: h }),
        fetch(`/api/kpi/analytics?from=${shift(from, -days)}&to=${shift(from, -1)}`, { headers: h })
      ])
      if (r1.ok) { const d = await r1.json(); setMetrics(d.metrics || []); setEmployees(d.employees || []); setCur(d.entries || []); setChartId(c => c || d.metrics?.[0]?.id || null); setScope(d.scope || 'company') }
      else showError('Не удалось загрузить аналитику')
      if (r2.ok) { const d = await r2.json(); setPrev(d.entries || []) }
    } catch (e) { showError('Сетевая ошибка') }
    setLoading(false)
  }
  useEffect(() => { if (from && to) load() }, [from, to])

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
    // Для накопительных — среднее на запись отдельно от суммы (пункт 3
    // фидбека от 6 сентября 2026: «звонки нужно 2 цифры, общее
    // количество и среднее»). Для процентных типов — подозрение на
    // неверный тип, если сумма (а не честная доля) выдаёт нереальное
    // значение — явно на карточке, не только в переписке.
    const perEntryAvg = isSum(m) && cl.length ? Math.round((cl.reduce((s, e) => s + Number(e.value), 0) / cl.length) * 10) / 10 : null
    const suspicious = (m.kpi_type === 'ratio' || m.kpi_type === 'plan') && cv != null && cv > 200
    return { m, cv, delta, below, goal: scaled(m).thr_top, perEntryAvg, suspicious }
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
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
          <a href="/company-admin" style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 10px rgba(138,98,8,0.3)' }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#8a6208" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Аналитика команды</h1>
          <span style={{ fontSize: 10.5, padding: '3px 11px', borderRadius: 20, background: scope === 'team' ? 'rgba(124,58,237,0.08)' : 'rgba(184,134,11,0.08)', color: scope === 'team' ? '#7c3aed' : '#8a6208', border: `1px solid ${scope === 'team' ? 'rgba(124,58,237,0.3)' : 'var(--border-gold)'}`, whiteSpace: 'nowrap' }}>
            {scope === 'team' ? 'Команда' : 'Вся компания'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <DateRangePicker from={from} to={to} onChange={r => { setFrom(r.from); setTo(r.to) }} />
            <button onClick={() => setFillOpen(true)} style={{ ...ghostBtn, borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Заполнить показатели</button>
          </div>
        </div>

        {/* Карточки показателей */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
          {metricSummary.map(({ m, cv, delta, below, goal, perEntryAvg, suspicious }) => {
            const b = bandOf(m, cv)
            return (
              <div key={m.id} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: `1px solid ${suspicious ? 'rgba(220,38,38,0.4)' : b ? BAND_TEXT[b] + '33' : 'var(--border-subtle)'}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span title={m.name} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.25 }}>{m.name}</span>
                  {suspicious ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>Тип настроен неверно</span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: b ? BAND_TEXT[b] : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{cv != null ? `${cv}${m.unit}` : '—'}</span>
                  )}
                </div>
                {suspicious && (
                  <div style={{ fontSize: 10.5, color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '6px 10px', lineHeight: 1.4 }}>
                    Сумма за период вместо честной доли ({cv}{m.unit} — так не бывает). Откройте «Управление целями» → этот показатель → смените тип на «Доля/конверсия».
                  </div>
                )}
                {perEntryAvg != null && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>в среднем {perEntryAvg}{m.unit} в день на сотрудника</div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {delta != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: delta >= 0 ? '#137a39' : '#dc2626' }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>цель ≥ {goal}{m.unit}</span>
                </div>
                {below > 0 && <div style={{ fontSize: 11, color: '#dc2626' }}>ниже порога: {below} чел.</div>}
              </div>
            )
          })}
          {metricSummary.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Показателей пока нет</div>}
        </div>

        {/* Топ периода + Требуют внимания */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 20, border: '1px solid rgba(19,122,57,0.25)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#137a39', marginBottom: 6 }}>Топ периода</h3>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>Средняя оценка = среднее уровней по показателям (0–4), где 0 — ниже порога, 1 — мин, 2 — средний, 3 — топ, 4 — ультра.</p>
            {top.map((r, i) => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-page)', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{i + 1}. {empName(r.emp.user_id)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: BAND_TEXT[overallBand(r.overall)] }}>{r.overall.toFixed(1)} / 4</span>
              </div>
            ))}
            {top.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет данных за период</p>}
          </div>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 20, border: '1px solid rgba(220,38,38,0.2)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Требуют внимания</h3>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>Число показателей ниже порога за период. Чем выше — тем больше зон риска у сотрудника.</p>
            {anti.map(r => (
              <div key={r.emp.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-page)', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{empName(r.emp.user_id)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{r.belowCount} показ.</span>
              </div>
            ))}
            {anti.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Все показатели в норме</p>}
          </div>
        </div>

        {/* ИИ-аналитик — вместо диаграммы, которая становится
            нечитаемой при большом числе сотрудников (фидбек от
            6 сентября 2026), система сама находит, что заслуживает
            внимания, и объясняет простым языком. */}
        <InsightsPanel from={from} to={to} empName={empName} />


        {/* Таблица сотрудник × показатели */}
        <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Сотрудник × показатели</h3>
            <button onClick={() => setSortAsc(a => !a)} style={tiny(false)}>{sortAsc ? 'Слабые первые' : 'Сильные первые'}</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <div>Сотрудник</div>
                {metrics.map(m => <div key={m.id} style={{ textAlign: 'center', minWidth: 0 }}><div title={m.name} style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 11, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.25 }}>{m.name}</div><div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>цель ≥ {scaled(m).thr_top}{m.unit}</div></div>)}
                <div style={{ textAlign: 'center' }}>Итог</div>
              </div>
              {rows.map(r => (
                <div key={r.emp.user_id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '12px 20px', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(r.emp.user_id)}</div>
                  {r.cells.map(c => (
                    <div key={c.m.id} style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.band ? BAND_TEXT[c.band] : 'var(--text-muted)' }}>{c.v != null ? `${c.v}${c.m.unit}` : '—'}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: r.overall >= 0 ? BAND_TEXT[overallBand(r.overall)] : 'var(--text-muted)' }}>{r.overall >= 0 ? r.overall.toFixed(1) : '—'}</div>
                </div>
              ))}
              {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Нет данных за период</div>}
            </div>
          </div>
        </div>
      </div>
      <FillReportModal open={fillOpen} onClose={() => { setFillOpen(false); load() }} />
    </div>
  )
}
export default withAuth(AnalyticsAdmin, { permission: 'can_review_tasks' })
