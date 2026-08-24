import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { BAND_COLORS, BAND_LABELS } from '../../lib/kpi'

// Минимальный тест-стенд для проверки автозачёта по внешнему источнику
// (п.7 ТЗ — «настроить и тестировать автопроверку и зачисление наград по
// интеграции с внешними источниками»). Специально без имитации целой CRM
// (сделки/чаты/звонки) — по вашему выбору это тестовый стенд, а не
// полноценный модуль. Логика реальная, не бутафорская: тестовые данные
// уходят через тот же source_config.url -> pullAutoValues() -> начисление,
// каким пойдёт и настоящая внешняя система, разница только в том, что
// источник — наш собственный эндпоинт-заглушка вместо чужого сервера.
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 18px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

function CrmSandbox() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [rows, setRows] = useState({}) // metricId -> [{email, value}]
  const [saving, setSaving] = useState(null)
  const [running, setRunning] = useState(null)
  const [results, setResults] = useState({}) // metricId -> результат последнего запуска

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    if (!prof) { router.push('/'); return }
    setCompanyId(prof.company_id)
    const [{ data: m }, { data: emps }] = await Promise.all([
      supabase.from('kpi_metrics').select('*').eq('company_id', prof.company_id).eq('is_active', true).eq('source', 'auto').order('name'),
      supabase.from('profiles').select('user_id, email, display_name').eq('company_id', prof.company_id).eq('is_company_admin', false).is('deleted_at', null)
    ])
    setMetrics(m || [])
    setEmployees(emps || [])
    const initRows = {}
    ;(m || []).forEach(metric => { initRows[metric.id] = metric.source_config?.mock_data?.length ? metric.source_config.mock_data : [{ email: emps?.[0]?.email || '', value: '' }] })
    setRows(initRows)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setRow = (metricId, i, patch) => setRows(r => ({ ...r, [metricId]: r[metricId].map((row, idx) => idx === i ? { ...row, ...patch } : row) }))
  const addRow = metricId => setRows(r => ({ ...r, [metricId]: [...r[metricId], { email: '', value: '' }] }))
  const delRow = (metricId, i) => setRows(r => ({ ...r, [metricId]: r[metricId].filter((_, idx) => idx !== i) }))

  const save = async metric => {
    setSaving(metric.id)
    const h = await auth()
    const mock_data = rows[metric.id].filter(r => r.email && r.value !== '').map(r => ({ email: r.email, value: Number(r.value) || 0 }))
    const url = `${window.location.origin}/api/company-admin/kpi/mock-source?metricId=${metric.id}`
    const res = await fetch('/api/company-admin/kpi/metrics', {
      method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: metric.id, source: 'auto', source_config: { url, emailField: 'email', valueField: 'value', mock_data } })
    })
    setSaving(null)
    if (res.ok) { showSuccess('Тестовые данные сохранены, источник указывает сюда же'); load() }
    else showError('Не удалось сохранить тестовые данные')
  }

  const run = async metric => {
    setRunning(metric.id)
    const h = await auth()
    const res = await fetch('/api/company-admin/kpi/run-auto-source', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ metricId: metric.id }) })
    const data = await res.json()
    setRunning(null)
    if (res.ok) { setResults(r => ({ ...r, [metric.id]: data })); showSuccess(`Проверка выполнена: ${data.matched} из ${data.pulled} сопоставлено`) }
    else showError(data.error || 'Ошибка проверки')
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <BackArrow href="/company-admin/mastery" title="Тест-стенд автозачёта" extra={
          <span style={{ fontSize: 11, color: '#888', maxWidth: 340, textAlign: 'right' }}>Проверка цепочки «внешний источник → авто-зачёт порога → награда» без реальной CRM</span>
        } />

        {metrics.length === 0 ? (
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>
            Нет показателей с автоматическим источником.<br />
            Откройте <Link href="/company-admin/mastery" style={{ color: '#4ade80' }}>Управление целями</Link>, создайте или отредактируйте показатель и переключите «Источник значений» на «Авто (внешний источник)» — он появится здесь.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {metrics.map(metric => (
              <div key={metric.id} style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 18, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{metric.name}</span>
                  <span style={{ fontSize: 10, color: '#4ade80', padding: '2px 10px', borderRadius: 20, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>источник: авто</span>
                </div>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 14px', wordBreak: 'break-all' }}>{metric.source_config?.url || '— сохраните тестовые данные, чтобы получить ссылку источника —'}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {(rows[metric.id] || []).map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 30px', gap: 8 }}>
                      <select className="input-field" style={{ width: '100%', fontSize: 12 }} value={row.email} onChange={e => setRow(metric.id, i, { email: e.target.value })}>
                        <option value="">Сотрудник…</option>
                        {employees.map(emp => <option key={emp.user_id} value={emp.email}>{emp.display_name || emp.email}</option>)}
                      </select>
                      <input type="number" step="0.1" className="input-field" style={{ width: '100%', fontSize: 12 }} placeholder={`Значение, ${metric.unit}`} value={row.value} onChange={e => setRow(metric.id, i, { value: e.target.value })} />
                      <button type="button" onClick={() => delRow(metric.id, i)} disabled={(rows[metric.id] || []).length <= 1}
                        style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: (rows[metric.id] || []).length > 1 ? '#f87171' : '#555', cursor: (rows[metric.id] || []).length > 1 ? 'pointer' : 'not-allowed' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => addRow(metric.id)} style={{ ...ghostBtn, fontSize: 11 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Строка</button>
                  <button type="button" onClick={() => save(metric)} disabled={saving === metric.id} style={{ ...ghostBtn, fontSize: 11, opacity: saving === metric.id ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{saving === metric.id ? 'Сохранение…' : 'Сохранить тестовые данные'}</button>
                  <button type="button" onClick={() => run(metric)} disabled={running === metric.id || !metric.source_config?.url}
                    style={{ ...ghostBtn, fontSize: 11, borderColor: 'rgba(74,222,128,0.5)', color: '#4ade80', opacity: running === metric.id ? 0.5 : 1 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.boxShadow = '0 0 14px rgba(74,222,128,0.25)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.5)'; e.currentTarget.style.boxShadow = 'none' }}>
                    {running === metric.id ? 'Проверяю…' : 'Проверить сейчас'}
                  </button>
                </div>

                {results[metric.id] && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Результат: получено {results[metric.id].pulled}, сопоставлено с сотрудниками {results[metric.id].matched}</span>
                    {results[metric.id].results.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                        <span>{r.matched ? (r.name || r.email) : `${r.email} — не найден среди сотрудников`}</span>
                        {r.matched && (
                          <span style={{ color: BAND_COLORS[r.band], fontWeight: 600 }}>
                            {r.value}{metric.unit} · {BAND_LABELS[r.band]}
                            {r.improved ? ` · +${r.energyGranted} эн. +${r.karmaGranted} карм.` : ' · без изменений'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default withAuth(CrmSandbox, { adminOnly: true })
