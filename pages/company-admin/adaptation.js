import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }
const pillBtn = { padding: '4px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.35)', color: '#FFD700', cursor: 'pointer', transition: 'all .2s' }

function AdaptationAdmin() {
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [templates, setTemplates] = useState([])
  const [employees, setEmployees] = useState([])
  const [msg, setMsg] = useState('')
  const [creating, setCreating] = useState(false)
  const [draftPlan, setDraftPlan] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [rating, setRating] = useState('')
  const [managerFeedback, setManagerFeedback] = useState('')
  const [reportModal, setReportModal] = useState(null)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionForm, setCorrectionForm] = useState({ planId: '', eventId: null, description: '', title: '', dayNumber: 1 })

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session.access_token}` }
  }
  const load = async () => {
    const h = await auth()
    const [pr, tpl] = await Promise.all([
      fetch('/api/adaptation/plans', { headers: h }).then(r => r.ok ? r.json() : []),
      fetch('/api/adaptation/templates', { headers: h }).then(r => r.ok ? r.json() : [])
    ])
    setPlans(pr)
    setTemplates(tpl)
    const { data: emps } = await supabase.from('profiles').select('user_id, display_name, email, first_name, last_name').is('deleted_at', null).eq('is_company_admin', false)
    setEmployees(emps || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openDraft = async (planId) => {
    const h = await auth()
    const r = await fetch(`/api/adaptation/my?planId=${planId}`, { headers: h })
    if (!r.ok) return
    const d = await r.json()
    if (!d) return
    setDraftPlan(d.plan)
    setEvents(d.events || [])
  }

  const createPlan = async (employeeId, templateId, startDate) => {
    setCreating(true)
    const h = await auth()
    const r = await fetch('/api/adaptation/plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ employeeId, templateId, startDate })
    })
    setCreating(false)
    if (r.ok) { setMsg('План создан — отредактируйте и активируйте'); await load() }
    else { const e = await r.json(); setMsg('Ошибка: ' + (e.error || '')) }
  }

  const updateEvent = (id, fields) => setEvents(ev => ev.map(e => e.id === id ? { ...e, ...fields } : e))
  const deleteEvent = (id) => setEvents(ev => ev.filter(e => e.id !== id))
  const addCustomEvent = () => {
    const newEv = { id: 'new-' + Date.now(), day_number: 1, event_time: '09:00', title: 'Новое событие', event_type: 'practice', is_mandatory: true, is_custom: true }
    setEvents(ev => [...ev, newEv])
  }
  const saveDraft = async () => {
    if (!draftPlan) return
    const h = await auth()
    const updates = events.filter(e => typeof e.id === 'number').map(({ id, ...f }) => ({ id, ...f }))
    const adds = events.filter(e => typeof e.id === 'string').map(e => ({ ...e, id: undefined }))
    const originalIds = new Set(events.filter(e => typeof e.id === 'number').map(e => e.id))
    await fetch('/api/adaptation/plan-update', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ planId: draftPlan.id, updates, adds, deletes: [] })
    })
    setMsg('Изменения сохранены')
    setDraftPlan(null); setEvents([]); await load()
  }
  const activatePlan = async (planId) => {
    const h = await auth()
    await fetch('/api/adaptation/activate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ planId }) })
    setMsg('План активирован, сотрудник получил уведомление'); await load()
  }

  const approveEvent = async () => {
    if (!selectedEvent) return
    const h = await auth()
    await fetch('/api/adaptation/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ eventId: selectedEvent.id, rating: rating ? Number(rating) : null, feedback: managerFeedback })
    })
    setSelectedEvent(null); setRating(''); setManagerFeedback('')
    setMsg('Обратная связь отправлена сотруднику'); await load()
  }

  const loadReport = async (planId) => {
    const h = await auth()
    const r = await fetch(`/api/adaptation/report?planId=${planId}`, { headers: h })
    if (r.ok) setReportModal(await r.json())
  }

  const handleCorrection = async () => {
    const h = await auth()
    await fetch('/api/adaptation/correction', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ planId: correctionForm.planId, eventId: correctionForm.eventId, description: correctionForm.description, title: correctionForm.title, dayNumber: Number(correctionForm.dayNumber) })
    })
    setCorrectionOpen(false); setCorrectionForm({ planId: '', eventId: null, description: '', title: '', dayNumber: 1 })
    setMsg('Корректировка добавлена'); await load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  const empName = id => {
    const e = employees.find(x => x.user_id === id)
    return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Адаптация сотрудников" extra={
          <button onClick={() => setCorrectionOpen(true)} style={{ marginLeft: 'auto', ...pillBtn }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.22)'} onMouseLeave={e => e.currentTarget.style.background = pillBtn.background}>
            + Корректировка
          </button>
        } />
        {msg && <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: 13 }}>{msg}</div>}

        {/* Создание плана */}
        {!draftPlan && (
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>Создать план адаптации</h3>
            <NewPlanForm templates={templates} employees={employees} creating={creating} onCreate={createPlan} />
          </div>
        )}

        {/* Редактор черновика */}
        {draftPlan && (
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,215,0,0.4)', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Редактирование плана: {empName(draftPlan.employee_id)}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addCustomEvent} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Событие</button>
                <button onClick={saveDraft} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
                <button onClick={() => { setDraftPlan(null); setEvents([]) }} style={{ ...ghostBtn, borderColor: 'rgba(244,67,54,0.4)', color: '#f87171' }}>Закрыть</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.sort((a, b) => a.day_number - b.day_number || (a.event_time || '').localeCompare(b.event_time || '')).map(ev => (
                <div key={ev.id} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${ev.is_custom ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr auto', gap: 8, alignItems: 'center' }}>
                    <input type="number" min="1" value={ev.day_number} onChange={e => updateEvent(ev.id, { day_number: Number(e.target.value) })} className="input-field" placeholder="День" />
                    <input type="time" value={ev.event_time || ''} onChange={e => updateEvent(ev.id, { event_time: e.target.value })} className="input-field" />
                    <input type="text" value={ev.title} onChange={e => updateEvent(ev.id, { title: e.target.value })} className="input-field" />
                    <button onClick={() => deleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => activatePlan(draftPlan.id)} style={{ ...ghostBtn, marginTop: 16 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Активировать план</button>
          </div>
        )}

        {/* Список планов */}
        <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>Активные планы ({plans.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.length === 0 && <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#777' }}>Планов пока нет</div>}
          {plans.map(p => {
            const pct = p.progress?.total ? Math.round((p.progress.done / p.progress.total) * 100) : 0
            const pendingReview = (events || []).filter(e => e.status === 'done' && !e.manager_confirmed_at).length
            return (
              <div key={p.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 14, padding: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{empName(p.employee_id)}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {new Date(p.start_date).toLocaleDateString('ru')} — {new Date(p.end_date).toLocaleDateString('ru')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#FFD700', fontWeight: 700 }}>{pct}%</span>
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: p.status === 'active' ? 'rgba(74,222,128,0.15)' : 'rgba(255,215,0,0.15)', color: p.status === 'active' ? '#4ade80' : '#FFD700' }}>{p.status === 'active' ? 'Активен' : 'Черновик'}</span>
                  </div>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: 'linear-gradient(90deg, rgba(255,215,0,0.4), #FFD700)' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.status === 'draft' && <button onClick={() => openDraft(p.id)} style={{ ...pillBtn }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.22)'} onMouseLeave={e => e.currentTarget.style.background = pillBtn.background}>Редактировать</button>}
                  <button onClick={() => openDraft(p.id)} style={{ ...pillBtn }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.22)'} onMouseLeave={e => e.currentTarget.style.background = pillBtn.background}>События</button>
                  <button onClick={() => loadReport(p.id)} style={{ ...pillBtn }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.22)'} onMouseLeave={e => e.currentTarget.style.background = pillBtn.background}>Отчёт</button>
                  <button onClick={() => { setCorrectionForm({ ...correctionForm, planId: String(p.id) }); setCorrectionOpen(true) }} style={{ ...pillBtn, borderColor: 'rgba(249,115,22,0.4)', color: '#f97316' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'}>Корректировка</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Модалка оценки события */}
      <PremiumModal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title} showCloseButton={false}>
        {selectedEvent && (
          <div style={{ textAlign: 'left' }}>
            {selectedEvent.employee_feedback && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.2)', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Фидбек сотрудника</div>
                <div style={{ fontSize: 13, color: '#fff' }}>{selectedEvent.employee_feedback}</div>
              </div>
            )}
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Оценка (1–5)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} onClick={() => setRating(String(v))} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${rating === String(v) ? '#FFD700' : 'rgba(255,255,255,0.1)'}`, background: rating === String(v) ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.03)', color: '#FFD700', fontWeight: 700, cursor: 'pointer' }}>{v}</button>
              ))}
            </div>
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Обратная связь</label>
            <textarea value={managerFeedback} onChange={e => setManagerFeedback(e.target.value)} placeholder="Что получилось, над чем работать" className="input-field" style={{ width: '100%' }} rows={3} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setSelectedEvent(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={approveEvent} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Отправить</button>
            </div>
          </div>
        )}
      </PremiumModal>

      {/* Модалка отчёта */}
      <PremiumModal isOpen={!!reportModal} onClose={() => setReportModal(null)} title="Отчёт о перспективности">
        {reportModal && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ padding: 16, borderRadius: 14, background: `${reportModal.color}15`, border: `1px solid ${reportModal.color}44`, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: reportModal.color }}>{reportModal.recommendation}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}><div style={{ fontSize: 11, color: '#888' }}>Выполнено КТ</div><div style={{ fontSize: 18, fontWeight: 700, color: '#FFD700' }}>{reportModal.pct}%</div></div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}><div style={{ fontSize: 11, color: '#888' }}>Средняя оценка</div><div style={{ fontSize: 18, fontWeight: 700, color: '#a0e9ff' }}>{reportModal.avgRating}/5</div></div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}><div style={{ fontSize: 11, color: '#888' }}>Динамика</div><div style={{ fontSize: 18, fontWeight: 700, color: reportModal.dynamics >= 0 ? '#4ade80' : '#f87171' }}>{reportModal.dynamics > 0 ? '+' : ''}{reportModal.dynamics}</div></div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}><div style={{ fontSize: 11, color: '#888' }}>Корректировок</div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{reportModal.corrections}</div></div>
            </div>
          </div>
        )}
      </PremiumModal>

      {/* Модалка корректировки */}
      <PremiumModal isOpen={correctionOpen} onClose={() => setCorrectionOpen(false)} title="Корректировка плана" showCloseButton={false}>
        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>План</label>
          <select className="input-field" style={{ width: '100%', marginBottom: 12 }} value={correctionForm.planId} onChange={e => setCorrectionForm({ ...correctionForm, planId: e.target.value })}>
            <option value="">—</option>
            {plans.map(p => <option key={p.id} value={p.id}>{empName(p.employee_id)} ({new Date(p.start_date).toLocaleDateString('ru')})</option>)}
          </select>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Новое событие (название)</label>
          <input className="input-field" style={{ width: '100%', marginBottom: 12 }} value={correctionForm.title} onChange={e => setCorrectionForm({ ...correctionForm, title: e.target.value })} placeholder="Проработка возражений" />
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>День</label>
          <input type="number" min="1" className="input-field" style={{ width: '100%', marginBottom: 12 }} value={correctionForm.dayNumber} onChange={e => setCorrectionForm({ ...correctionForm, dayNumber: e.target.value })} />
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Причина</label>
          <textarea className="input-field" style={{ width: '100%' }} rows={2} value={correctionForm.description} onChange={e => setCorrectionForm({ ...correctionForm, description: e.target.value })} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => setCorrectionOpen(false)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
            <button onClick={handleCorrection} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить</button>
          </div>
        </div>
      </PremiumModal>
    </div>
  )
}

function NewPlanForm({ templates, employees, creating, onCreate }) {
  const [employeeId, setEmployeeId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [startDate, setStartDate] = useState('')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
      <div>
        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Сотрудник</label>
        <select className="input-field" style={{ width: '100%' }} value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
          <option value="">—</option>
          {employees.map(emp => <option key={emp.user_id} value={emp.user_id}>{[emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Шаблон</label>
        <select className="input-field" style={{ width: '100%' }} value={templateId} onChange={e => setTemplateId(e.target.value)}>
          <option value="">—</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Дата начала</label>
        <DatePicker value={startDate} onChange={setStartDate} placeholder="Дата" />
      </div>
      <button onClick={() => onCreate(employeeId, templateId, startDate)} disabled={creating || !employeeId || !templateId || !startDate}
        style={{ ...ghostBtn, opacity: creating || !employeeId || !templateId || !startDate ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        {creating ? 'Создаём…' : 'Создать'}
      </button>
    </div>
  )
}
export default withAuth(AdaptationAdmin, { permission: 'can_manage_employees' })
