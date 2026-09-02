import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import LoadingScreen from '../../components/LoadingScreen'
import { withAuth } from '../../components/withAuth'

const TYPE_LABELS = { regular: 'Обычные', auto_goal: 'По целям', partner: 'От партнёров' }
const today = new Date().toISOString().slice(0, 10)
const shift = (iso, days) => { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
const fmtHours = h => h == null ? '—' : h < 1 ? `${Math.round(h * 60)} мин` : h < 48 ? `${Math.round(h)} ч` : `${Math.round(h / 24)} дн.`

function TasksAnalytics() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [from, setFrom] = useState(shift(today, -29))
  const [to, setTo] = useState(today)
  const [sortBy, setSortBy] = useState('completed')

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`/api/company-admin/tasks/analytics?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (r.ok) setData(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [from, to])

  if (loading && !data) return <LoadingScreen />
  const s = data?.summary
  const sortedEmployees = data ? [...data.employees].sort((a, b) => sortBy === 'karma' ? b.karma - a.karma : sortBy === 'rate' ? (b.completionRate ?? -1) - (a.completionRate ?? -1) : b.completed - a.completed) : []

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <BackArrow href="/company-admin/tasks" title="Аналитика заданий" extra={
          <div style={{ marginLeft: 'auto' }}><DateRangePicker from={from} to={to} onChange={r => { setFrom(r.from); setTo(r.to) }} /></div>
        } />

        {/* Сводка */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Всего назначений</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{s?.total ?? '—'}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid rgba(19,122,57,0.25)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Доля выполнения</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#137a39' }}>{s?.completionRate != null ? `${s.completionRate}%` : '—'}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Среднее время выполнения</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-gold)' }}>{fmtHours(s?.avgHours)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid rgba(220,38,38,0.25)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Отклонено / пропущено</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#dc2626' }}>{(s?.rejected ?? 0) + (s?.missed ?? 0)}</div>
          </div>
        </div>

        {/* По типам */}
        {s?.byType && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {Object.entries(s.byType).map(([ty, v]) => v.total > 0 && (
              <div key={ty} style={{ flex: '1 1 200px', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{TYPE_LABELS[ty]}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{v.completed}/{v.total}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.total ? Math.round((v.completed / v.total) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Сотрудники */}
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>По сотрудникам</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['completed', 'Выполнено'], ['rate', '% выполнения'], ['karma', 'Кармики']].map(([k, l]) => (
                  <button key={k} onClick={() => setSortBy(k)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${sortBy === k ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: sortBy === k ? 'rgba(184,134,11,0.08)' : 'transparent', color: sortBy === k ? '#8a6208' : 'var(--text-secondary)', cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '8px 20px', fontWeight: 500 }}>Сотрудник</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500 }}>Выполнено</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500 }}>%</th>
                    <th style={{ textAlign: 'right', padding: '8px 20px', fontWeight: 500 }}>Кармики</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map(e => (
                    <tr key={e.user_id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 20px', color: 'var(--text-primary)' }}>{e.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{e.completed}/{e.assigned}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: e.completionRate >= 70 ? '#137a39' : e.completionRate >= 40 ? '#b45309' : '#dc2626', fontWeight: 600 }}>{e.completionRate != null ? `${e.completionRate}%` : '—'}</td>
                      <td style={{ padding: '8px 20px', textAlign: 'right', color: 'var(--accent-gold)', fontWeight: 600 }}>{e.karma}</td>
                    </tr>
                  ))}
                  {sortedEmployees.length === 0 && <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Нет данных за период</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Проблемные и самые долгие задания */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid rgba(220,38,38,0.2)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', margin: '0 0 4px' }}>Выполняются хуже всего</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Наименьшая доля выполнения (от 2 назначений)</p>
              {(data?.tasks || []).slice(0, 5).map(t => (
                <div key={t.task_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border-subtle)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>{t.completionRate}%</span>
                </div>
              ))}
              {(!data?.tasks || data.tasks.length === 0) && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Недостаточно данных</p>}
            </div>

            <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid var(--border-gold)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-gold)', margin: '0 0 4px' }}>Выполняются дольше всего</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Среднее время от назначения до зачёта</p>
              {(data?.slowest || []).map(t => (
                <div key={t.task_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border-subtle)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span style={{ color: '#8a6208', fontWeight: 700, flexShrink: 0 }}>{fmtHours(t.avgHours)}</span>
                </div>
              ))}
              {(!data?.slowest || data.slowest.length === 0) && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Недостаточно данных</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default withAuth(TasksAnalytics, { permission: 'can_review_tasks' })
