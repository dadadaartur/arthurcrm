import { useEffect, useState } from 'react'
import BackArrow from '../../components/BackArrow'
import LoadingScreen from '../../components/LoadingScreen'
import { supabase } from '../../lib/supabaseClient'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

function PersonalGoalsReport() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [adjustingId, setAdjustingId] = useState(null)
  const [comment, setComment] = useState('')

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    const h = await auth()
    const r = await fetch('/api/company-admin/personal-goals-report', { headers: h })
    if (r.ok) setEmployees((await r.json()).employees || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const decide = async (id, decision, commentText = null) => {
    const h = await auth()
    const r = await fetch('/api/company-admin/personal-goal-approve', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, decision, comment: commentText }) })
    if (r.ok) { showSuccess(decision === 'approved' ? 'Цель одобрена' : 'Отправлено на корректировку'); setAdjustingId(null); setComment(''); load() }
    else showError('Не удалось сохранить решение')
  }

  if (loading) return <LoadingScreen />

  const pending = employees.flatMap(emp => emp.goals.filter(g => g.goal_type === 'global' && g.approval_status === 'pending').map(g => ({ ...g, empName: emp.name })))

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Личные цели команды" />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 640 }}>
          Глобальные цели ждут вашего одобрения перед тем, как заработать — направьте, если цель слишком скромная, или поправьте, если нереалистичная. Промежуточные шаги и прогресс — личное пространство сотрудника, не редактируется.
        </p>

        {pending.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ea580c', marginBottom: 12 }}>Ждут одобрения ({pending.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map(g => (
                <div key={g.id} style={{ padding: 16, borderRadius: 14, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-gold)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.empName} — «{g.title}»</span>
                  </div>
                  {g.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>{g.description}</p>}
                  {g.target_value != null && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Цель: {g.target_value}{g.target_unit}{g.target_date ? ` до ${new Date(g.target_date).toLocaleDateString('ru')}` : ''}</div>}
                  {adjustingId === g.id ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input autoFocus className="input-field" style={{ flex: 1, minWidth: 200, fontSize: 12 }} placeholder="Что скорректировать?" value={comment} onChange={e => setComment(e.target.value)} />
                      <button onClick={() => decide(g.id, 'needs_adjustment', comment)} className="btn-glass" style={{ padding: '7px 16px', fontSize: 12 }}>Отправить</button>
                      <button onClick={() => setAdjustingId(null)} className="btn-outline" style={{ padding: '7px 16px', fontSize: 12 }}>Отмена</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => decide(g.id, 'approved')} style={{ fontSize: 11.5, fontWeight: 600, color: '#137a39', background: 'rgba(19,122,57,0.08)', border: '1px solid rgba(19,122,57,0.3)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>Одобрить</button>
                      <button onClick={() => setAdjustingId(g.id)} style={{ fontSize: 11.5, fontWeight: 600, color: '#ea580c', background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.3)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>Предложить скорректировать</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {employees.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Пока никто не поставил себе личных целей</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {employees.map(emp => (
              <div key={emp.userId} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{emp.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {emp.goals.map(g => (
                    <div key={g.id} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-page)', border: g.goal_type === 'global' ? '1px solid var(--border-gold)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{g.title}</span>
                        {g.goal_type === 'global' && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: g.approval_status === 'approved' ? '#137a39' : g.approval_status === 'needs_adjustment' ? '#dc2626' : 'var(--accent-gold)' }}>
                            {g.approval_status === 'approved' ? 'Одобрена' : g.approval_status === 'needs_adjustment' ? 'На доработке' : 'Ждёт одобрения'}
                          </span>
                        )}
                      </div>
                      {g.target_value != null ? (
                        <>
                          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-card)', overflow: 'hidden', marginBottom: 3 }}>
                            <div style={{ height: '100%', width: `${g.progressPct}%`, borderRadius: 3, background: 'linear-gradient(90deg, #ea580c, #7c3aed)' }} />
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{g.current_value}{g.target_unit} из {g.target_value}{g.target_unit} ({g.progressPct}%)</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>без числового прогресса</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default withAuth(PersonalGoalsReport, { permission: 'can_manage_employees' })
