import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const Seg = ({ active, onClick, children, color = '#8a6208' }) => (
  <button type="button" onClick={onClick} style={{ padding: '7px 16px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? `linear-gradient(135deg, ${color}22, ${color}0d)` : 'var(--bg-card)', border: `1px solid ${active ? color + '88' : 'var(--border-subtle)'}`, color: active ? color : 'var(--text-secondary)', transition: 'all 0.2s ease' }}>{children}</button>
)
const TYPE_LABELS = { control: 'Контроль', test: 'Тестирование', meeting: 'Встреча', feedback: 'Обратная связь', training: 'Обучение', rework: 'Доработка' }
const RatingStars = ({ value, onChange, size = 18 }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? '#8a6208' : 'none'} stroke="#8a6208" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    ))}
  </div>
)

function AdaptationAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [kind, setKind] = useState('onboarding') // 'onboarding' | 'development'
  const [employees, setEmployees] = useState([])
  const [templates, setTemplates] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ employee_id: '', template_id: '', start_date: '' })
  const [empSearch, setEmpSearch] = useState('')
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false)
  const [panel, setPanel] = useState(null) // { plan, tab: 'events'|'journal', events, history }
  const [approveDraft, setApproveDraft] = useState({}) // eventId -> { rating, feedback }
  const [reportModal, setReportModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ status: 'active', end_date: '' })

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  useEffect(() => { load() }, [kind])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    if (!prof) { window.location.href = '/'; return }
    const { data: emps } = await supabase.from('profiles')
      .select('user_id, email, first_name, last_name, display_name, is_company_admin, avatar_url')
      .eq('company_id', prof.company_id).is('deleted_at', null)
    setEmployees((emps || []).filter(e => !e.is_company_admin))
    const h = await auth()
    const [tplRes, planRes] = await Promise.all([
      fetch(`/api/adaptation/templates?kind=${kind}`, { headers: h }),
      fetch(`/api/adaptation/plans?kind=${kind}`, { headers: h }),
    ])
    setTemplates(tplRes.ok ? await tplRes.json() : [])
    setPlans(planRes.ok ? await planRes.json() : [])
    setLoading(false)
  }

  const empName = id => {
    const e = employees.find(x => x.user_id === id)
    return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—'
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.employee_id || !form.template_id || !form.start_date) { showError('Выберите сотрудника, шаблон и дату'); return }
    const h = await auth()
    const r = await fetch('/api/adaptation/plans', {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: form.employee_id, templateId: Number(form.template_id), startDate: form.start_date, kind })
    })
    const data = await r.json()
    if (!r.ok) { showError('Ошибка создания: ' + (data.error || '')); return }
    // Сразу активируем — админ назначает план и ждёт, что сотрудник увидит
    // его немедленно, отдельного шага «черновик -> ревью -> активация» в
    // интерфейсе пока нет (черновик доступен через API на будущее).
    const actRes = await fetch('/api/adaptation/activate', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: data.id }) })
    if (!actRes.ok) { showError('План создан, но не удалось активировать'); return }
    showSuccess('План назначен, сотрудник уведомлён')
    setForm({ employee_id: '', template_id: '', start_date: '' })
    load()
  }

  const openPanel = async (plan) => {
    const h = await auth()
    const [evRes, histRes] = await Promise.all([
      supabase.from('adaptation_plan_events').select('*').eq('plan_id', plan.id).order('day_number').order('event_time'),
      fetch(`/api/adaptation/history?planId=${plan.id}`, { headers: h }),
    ])
    setPanel({ plan, tab: 'events', events: evRes.data || [], history: histRes.ok ? await histRes.json() : [] })
  }
  const refreshPanel = async () => { if (panel) openPanel(panel.plan) }

  const openReport = async (plan) => {
    const h = await auth()
    const r = await fetch(`/api/adaptation/report?planId=${plan.id}`, { headers: h })
    if (r.ok) setReportModal({ plan, ...(await r.json()) })
  }
  const openEdit = (plan) => { setEditModal(plan); setEditForm({ status: plan.status, end_date: plan.end_date || '' }) }
  const saveEdit = async () => {
    if (!editModal) return
    await supabase.from('adaptation_plans').update({ status: editForm.status, end_date: editForm.end_date || null }).eq('id', editModal.id)
    await supabase.from('notifications').insert({ user_id: editModal.employee_id, message: `Ваш план обновлён (статус: ${editForm.status}).`, link: kind === 'development' ? '/development' : '/onboarding' })
    showSuccess('План обновлён, сотрудник уведомлён')
    setEditModal(null); load()
  }

  const submitApprove = async (ev) => {
    const draft = approveDraft[ev.id] || { rating: 5, feedback: '' }
    const h = await auth()
    const r = await fetch('/api/adaptation/approve', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: ev.id, rating: draft.rating, feedback: draft.feedback || null }) })
    if (!r.ok) { showError('Не удалось подтвердить'); return }
    showSuccess('Обратная связь отправлена сотруднику')
    refreshPanel()
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Адаптация и развитие" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Seg active={kind === 'onboarding'} onClick={() => setKind('onboarding')}>Адаптация новичков</Seg>
            <Seg active={kind === 'development'} onClick={() => setKind('development')} color="#7c3aed">Развитие опытных</Seg>
          </div>
        } />

        <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 28, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>{kind === 'onboarding' ? 'Назначить план адаптации' : 'Назначить план развития'}</h3>
          {templates.length === 0 && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>Нет активных шаблонов {kind === 'development' ? 'развития' : 'адаптации'} — обратитесь к администратору площадки, чтобы добавить.</p>}
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 14, alignItems: 'end' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Сотрудник</label>
              {form.employee_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'rgba(14,116,144,0.06)', border: '1px solid rgba(14,116,144,0.3)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(14,116,144,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#0e7490', overflow: 'hidden' }}>
                    {employees.find(e => e.user_id === form.employee_id)?.avatar_url
                      ? <img src={employees.find(e => e.user_id === form.employee_id).avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : empName(form.employee_id).charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(form.employee_id)}</span>
                  <button type="button" onClick={() => { setForm({ ...form, employee_id: '' }); setEmpSearch('') }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <>
                  <input className="input-field" style={{ width: '100%' }} placeholder="Начните вводить имя…" value={empSearch}
                    onChange={e => { setEmpSearch(e.target.value); setEmpDropdownOpen(true) }} onFocus={() => setEmpDropdownOpen(true)} autoComplete="off" />
                  {empDropdownOpen && (
                    <div style={{ position: 'absolute', zIndex: 20, marginTop: 4, width: '100%', maxHeight: 240, overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card-hover)' }}>
                      {employees.filter(e => empName(e.user_id).toLowerCase().includes(empSearch.toLowerCase()) || e.email?.toLowerCase().includes(empSearch.toLowerCase())).length === 0 ? (
                        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Никого не найдено</div>
                      ) : employees.filter(e => empName(e.user_id).toLowerCase().includes(empSearch.toLowerCase()) || e.email?.toLowerCase().includes(empSearch.toLowerCase())).map(e => (
                        <button type="button" key={e.user_id} onClick={() => { setForm({ ...form, employee_id: e.user_id }); setEmpDropdownOpen(false); setEmpSearch('') }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--bg-hover)' }} onMouseLeave={ev => { ev.currentTarget.style.background = 'none' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(184,134,11,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#8a6208', overflow: 'hidden' }}>
                            {e.avatar_url ? <img src={e.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : empName(e.user_id).charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(e.user_id)}</div>
                            {e.email && <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Шаблон</label>
              <select className="input-field" style={{ width: '100%' }} value={form.template_id} onChange={e => setForm({ ...form, template_id: e.target.value })}>
                <option value="">—</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Дата начала</label>
              <DatePicker value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} placeholder="Дата" />
            </div>
            <button type="submit" style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Назначить</button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.length === 0 && <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Планов пока нет</div>}
          {plans.map(p => {
            const pct = p.progress.total ? Math.round(p.progress.done / p.progress.total * 100) : 0
            const statusLabel = { active: 'Активен', completed: 'Завершён', cancelled: 'Отменён', draft: 'Черновик' }[p.status] || p.status
            return (
            <div key={p.id} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.employee_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>старт {new Date(p.start_date).toLocaleDateString('ru')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--bg-page)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#137a39,#0e7490)' : 'linear-gradient(90deg,#8a6208,#7c3aed)', transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{p.progress.done}/{p.progress.total} · {pct}%</span>
                  {p.progress.avgRating && <span style={{ fontSize: 11, color: '#8a6208', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="#8a6208" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg> {p.progress.avgRating}</span>}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 700, background: p.status === 'active' ? 'rgba(19,122,57,0.1)' : 'var(--bg-page)', color: p.status === 'active' ? '#137a39' : 'var(--text-secondary)', border: `1px solid ${p.status === 'active' ? 'rgba(19,122,57,0.35)' : 'var(--border-subtle)'}` }}>{statusLabel}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openPanel(p)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>События и журнал</button>
                <button onClick={() => openReport(p)} style={{ ...ghostBtn, borderColor: 'rgba(14,116,144,0.35)', color: '#0e7490' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Отчёт</button>
                <button onClick={() => openEdit(p)} style={{ ...ghostBtn, borderColor: 'rgba(124,58,237,0.35)', color: '#7c3aed' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Редактировать</button>
              </div>
            </div>
            )
          })}
        </div>
      </div>

      {/* Панель событий + журнала — отдельная широкая панель вместо тесной
          универсальной модалки (была рассчитана на короткий текст, не на
          прокручиваемый список с датами/статусами/оценками). */}
      {panel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setPanel(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setPanel(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px', paddingRight: 30, color: 'var(--text-primary)' }}>{empName(panel.plan.employee_id)}</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <Seg active={panel.tab === 'events'} onClick={() => setPanel({ ...panel, tab: 'events' })}>События</Seg>
              <Seg active={panel.tab === 'journal'} onClick={() => setPanel({ ...panel, tab: 'journal' })} color="#0e7490">Журнал взаимодействий</Seg>
            </div>

            {panel.tab === 'events' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {panel.events.map(ev => {
                  const draft = approveDraft[ev.id] || { rating: 5, feedback: '' }
                  const needsApproval = ev.status === 'done' && !ev.manager_confirmed_at
                  return (
                    <div key={ev.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          День {ev.day_number}{ev.event_time && <span style={{ color: '#0e7490' }}> · {ev.event_time}</span>} · {ev.title}
                          {ev.event_type && <span style={{ marginLeft: 8, fontSize: 9, padding: '1px 8px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}>{TYPE_LABELS[ev.event_type] || ev.event_type}</span>}
                        </div>
                        <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', background: ev.status === 'done' ? 'rgba(19,122,57,0.1)' : 'var(--bg-card)', color: ev.status === 'done' ? '#137a39' : 'var(--text-secondary)' }}>{ev.status}</span>
                      </div>
                      {ev.employee_feedback && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>Комментарий сотрудника: {ev.employee_feedback}</div>}
                      {ev.manager_confirmed_at && (
                        <div style={{ fontSize: 11, color: '#137a39', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          Подтверждено{ev.rating != null && <RatingStars value={ev.rating} size={13} onChange={() => {}} />}
                        </div>
                      )}
                      {needsApproval && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Оценка:</span>
                            <RatingStars value={draft.rating} onChange={r => setApproveDraft(d => ({ ...d, [ev.id]: { ...draft, rating: r } }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input className="input-field" style={{ flex: 1 }} placeholder="Комментарий обратной связи (необязательно)" value={draft.feedback} onChange={e => setApproveDraft(d => ({ ...d, [ev.id]: { ...draft, feedback: e.target.value } }))} />
                            <button onClick={() => submitApprove(ev)} style={{ ...ghostBtn, flexShrink: 0 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Подтвердить</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {panel.history.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Записей пока нет</p>}
                {panel.history.map(h => (
                  <div key={h.id} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-page)', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text-secondary)' }}>
                      <span>{h.author_role === 'manager' ? 'Вы' : h.author_role === 'employee' ? 'Сотрудник' : 'Система'} · {TYPE_LABELS[h.type] || h.type}</span>
                      <span>{new Date(h.created_at).toLocaleString('ru')}</span>
                    </div>
                    {h.description && <div style={{ color: 'var(--text-primary)', marginTop: 4 }}>{h.description}</div>}
                    {h.rating != null && <div style={{ marginTop: 4 }}><RatingStars value={h.rating} size={12} onChange={() => {}} /></div>}
                    {h.employee_rating != null && <div style={{ fontSize: 11, color: '#0e7490', marginTop: 4 }}>Оценка сотрудником этой обратной связи: {h.employee_rating}/5</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setReportModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px, 94vw)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 26 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>Отчёт по {empName(reportModal.plan.employee_id)}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ padding: 16, borderRadius: 14, background: 'rgba(184,134,11,0.06)', border: '1px solid var(--border-gold)' }}><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Обязательные события</div><div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-gold)' }}>{reportModal.pct}%</div></div>
              <div style={{ padding: 16, borderRadius: 14, background: 'rgba(19,122,57,0.05)', border: '1px solid rgba(19,122,57,0.2)' }}><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Выполнено</div><div style={{ fontSize: 26, fontWeight: 700, color: '#137a39' }}>{reportModal.done}/{reportModal.total}</div></div>
              <div style={{ padding: 16, borderRadius: 14, background: 'rgba(14,116,144,0.05)', border: '1px solid rgba(14,116,144,0.2)' }}><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Средняя оценка</div><div style={{ fontSize: 26, fontWeight: 700, color: '#0e7490' }}>{reportModal.avgRating || '—'}</div></div>
              <div style={{ padding: 16, borderRadius: 14, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)' }}><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Динамика оценок</div><div style={{ fontSize: 26, fontWeight: 700, color: reportModal.dynamics >= 0 ? '#137a39' : '#dc2626' }}>{reportModal.dynamics > 0 ? '+' : ''}{reportModal.dynamics}</div></div>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: `${reportModal.color}15`, border: `1px solid ${reportModal.color}44`, color: reportModal.color, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>{reportModal.recommendation}</div>
            <button onClick={() => setReportModal(null)} className="btn-outline" style={{ width: '100%' }}>Закрыть</button>
          </div>
        </div>
      )}

      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setEditModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 94vw)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 26 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>Редактировать план</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Статус</label>
                <select className="input-field" style={{ width: '100%' }} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="active">Активен</option><option value="completed">Завершён</option><option value="cancelled">Отменён</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Дата окончания</label>
                <DatePicker value={editForm.end_date} onChange={v => setEditForm({ ...editForm, end_date: v })} placeholder="Дата" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditModal(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
                <button onClick={saveEdit} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default withAuth(AdaptationAdmin, { permission: 'can_manage_employees' })
