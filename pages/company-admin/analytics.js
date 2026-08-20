import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import FillReportModal from '../../components/FillReportModal'
import { withAuth } from '../../components/withAuth'
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
const PALETTE = ['#FFD700', '#a0e9ff', '#c084fc', '#4ade80', '#fda4af', '#f87171', '#e2e8f0', '#86efac', '#60a5fa', '#f97316']

function AnalyticsAdmin() {
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
          <button onClick={() => setFillOpen(true)} style={{ ...ghostBtn, marginLeft: 'auto', borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Запол
