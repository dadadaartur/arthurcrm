import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import LoadingScreen from '../../components/LoadingScreen'
import { BAND_LABELS, bandFor } from '../../lib/kpi'
import { withAuth } from '../../components/withAuth'

// Насыщенная версия цветов диапазонов — общий lib/kpi.js подобран под
// тёмный фон и используется на ещё не переделанных страницах, менять
// нельзя (та же логика, что уже применена в goals.js/results.js).
const BAND_TEXT = { none: '#dc2626', min: '#b45309', mid: '#8a6208', top: '#137a39', ultra: '#7c3aed' }
const BAND_ORDER = ['ultra', 'top', 'mid', 'min', 'none']

const today = new Date().toISOString().slice(0, 10)
const shift = (iso, days) => { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }

const empName = e => [e?.first_name, e?.last_name].filter(Boolean).join(' ') || e?.display_name || e?.email || '—'

function MasteryReport() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [entries, setEntries] = useState([])
  const [from, setFrom] = useState(shift(today, -6))
  const [to, setTo] = useState(today)
  const [openMetric, setOpenMetric] = useState(null)
  const [metricFilter, setMetricFilter] = useState('all') // all | achieving | risk

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const h = { Authorization: `Bearer ${session.access_token}` }
    const r = await fetch(`/api/kpi/analytics?from=${from}&to=${to}`, { headers: h })
    if (r.ok) {
      const d = await r.json()
      setMetrics(d.metrics || [])
      setEmployees(d.employees || [])
      setEntries(d.entries || [])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [from, to])

  // Для каждого показателя — последнее значение каждого сотрудника в
  // выбранном периоде и его диапазон (band). Та же идея, что уже
  // работает в analytics.js/results.js, но с фокусом именно на
  // «выполняется цель или нет» по каждому человеку, а не на средних и
  // трендах.
  const report = useMemo(() => {
    return metrics.map(m => {
      const rows = employees.map(emp => {
        const empEntries = entries.filter(e => e.metric_id === m.id && e.user_id === emp.user_id)
        const last = empEntries.length ? empEntries[empEntries.length - 1] : null
        const value = last ? Number(last.value) : null
        const band = value != null ? bandFor(value, m) : 'none'
        return { emp, value, band, hasData: !!last }
      })
      const withData = rows.filter(r => r.hasData)
      const achieving = withData.filter(r => r.band !== 'none').length
      const pct = withData.length ? Math.round((achieving / withData.length) * 100) : null
      const byBand = BAND_ORDER.reduce((acc, k) => { acc[k] = rows.filter(r => r.band === k).length; return acc }, {})
      return { metric: m, rows, achieving, totalWithData: withData.length, totalEmployees: employees.length, pct, byBand }
    })
  }, [metrics, employees, entries])

  const filteredReport = report.filter(r => {
    if (metricFilter === 'achieving') return r.pct != null && r.pct >= 70
    if (metricFilter === 'risk') return r.pct != null && r.pct < 50
    return true
  })

  if (loading && metrics.length === 0) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <BackArrow href="/company-admin/mastery" title="Отчёт по выполнению целей" extra={
          <div style={{ marginLeft: 'auto' }}><DateRangePicker from={from} to={to} onChange={r => { setFrom(r.from); setTo(r.to) }} /></div>
        } />

        {/* Общая сводка по всем показателям сразу */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Показателей активно</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.length}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid rgba(19,122,57,0.25)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Выполняются хорошо (≥70%)</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#137a39' }}>{report.filter(r => r.pct != null && r.pct >= 70).length}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid rgba(220,38,38,0.25)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Требуют внимания (&lt;50%)</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{report.filter(r => r.pct != null && r.pct < 50).length}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[['all', 'Все показатели'], ['achieving', 'Выполняются хорошо'], ['risk', 'Требуют внимания']].map(([k, label]) => (
            <button key={k} onClick={() => setMetricFilter(k)} className={`filter-pill ${metricFilter === k ? 'active' : ''}`}>{label}</button>
          ))}
        </div>

        {loading && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Обновляем...</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredReport.length === 0 && (
            <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Нет показателей по выбранному фильтру</div>
          )}
          {filteredReport.map(r => {
            const isOpen = openMetric === r.metric.id
            const pctColor = r.pct == null ? 'var(--text-muted)' : r.pct >= 70 ? '#137a39' : r.pct >= 40 ? '#b45309' : '#dc2626'
            return (
              <div key={r.metric.id} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                <div onClick={() => setOpenMetric(isOpen ? null : r.metric.id)} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{r.metric.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{r.totalWithData} из {r.totalEmployees} сотрудников внесли данные за период</div>
                  </div>

                  {/* Мини-полоса распределения по диапазонам */}
                  <div style={{ display: 'flex', height: 8, width: 160, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                    {BAND_ORDER.map(k => r.byBand[k] > 0 && (
                      <div key={k} title={`${BAND_LABELS[k]}: ${r.byBand[k]}`} style={{ width: `${(r.byBand[k] / (r.totalEmployees || 1)) * 100}%`, background: BAND_TEXT[k] }} />
                    ))}
                    {r.totalWithData === 0 && <div style={{ width: '100%', background: 'var(--border-subtle)' }} />}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: pctColor }}>{r.pct == null ? '—' : `${r.pct}%`}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>достигают цели</div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 20px 16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>
                          <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 500 }}>Сотрудник</th>
                          <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 500 }}>Значение</th>
                          <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 500 }}>Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...r.rows].sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band)).map(row => (
                          <tr key={row.emp.user_id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '8px 6px', color: 'var(--text-primary)' }}>{empName(row.emp)}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>{row.hasData ? `${row.value}${r.metric.unit || ''}` : 'нет данных'}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: `${BAND_TEXT[row.band]}18`, color: BAND_TEXT[row.band] }}>{row.hasData ? BAND_LABELS[row.band] : '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default withAuth(MasteryReport, { permission: 'can_review_tasks' })
