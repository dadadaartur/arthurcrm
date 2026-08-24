import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }

function AdaptationAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [employees, setEmployees] = useState([])
  const [templates, setTemplates] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ employee_id: '', template_id: '', start_date: '' })
  const [eventsModal, setEventsModal] = useState(null)
  const [reportModal, setReportModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ status: 'active', end_date: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!prof) { window.location.href = '/'; return }
      setCompanyId(prof.company_id)
      await load(prof.company_id)
      setLoading(false)
    }
    init()
  }, [])

  const load = async (cid) => {
    // ТОЛЬКО активные сотрудники своей компании: без удалённых, без админов/суперадмина
    const { data: emps } = await supabase.from('profiles')
      .select('user_id, email, first_name, last_name, display_name, is_company_admin')
      .eq('company_id', cid).is('deleted_at', null)
    const clean = (emps || []).filter(e => !e.is_company_admin)
    const { data: tpls } = await supabase.from('adaptation_templates').select('*').eq('is_active', true).order('id')
    const { data: pl } = await supabase.from('adaptation_plans').select('*').eq('company_id', cid).order('created_at', { ascending: false })
    setEmployees(clean); setTemplates(tpls || []); setPlans(pl || [])
  }

  const empName = id => {
    const e = employees.find(x => x.user_id === id)
    return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—'
  }

  const notify = async (userId, message, link) => {
    await supabase.from('notifications').insert({ user_id: userId, message, link })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.employee_id || !form.template_id || !form.start_date) { showError('Выберите сотрудника, шаблон и дату'); return }
    const tpl = templates.find(t => t.id === Number(form.template_id))
    const start = new Date(form.start_date + 'T00:00:00')
    const end = new Date(start); end.setDate(end.getDate() + 27)
    const { data: plan, error } = await supabase.from('adaptation_plans').insert({
      company_id: companyId, employee_id: form.employee_id, manager_id: (await supabase.auth.getUser()).data.user?.id,
      template_id: tpl.id, start_date: form.start_date, end_date: end.toISOString().slice(0, 10), status: 'active'
    }).select().single()
    if (error) { showError('Ошибка создания: ' + error.message); return }
    const rows = []
    ;(tpl.days || []).forEach(d => (d.events || []).forEach(ev => rows.push({
      plan_id: plan.id, day_number: d.day_number, event_time: ev.time || null, title: ev.title,
      description: ev.description || null, event_type: ev.type || 'control',
      required_action: ev.required_action || null, expected_result: ev.expected_result || null,
      duration_minutes: ev.duration_minutes || null, materials: ev.materials || null, is_mandatory: ev.is_mandatory !== false
    })))
    if (rows.length) await supabase.from('adaptation_plan_events').insert(rows)
    await notify(form.employee_id, `Вам назначен план адаптации «${tpl.name}». Откройте «Моя адаптация».`, '/onboarding')
    showSuccess('План назначен, сотрудник уведомлён')
    setForm({ employee_id: '', template_id: '', start_date: '' })
    load(companyId)
  }

  const openEvents = async (plan) => {
    const { data } = await supabase.from('adaptation_plan_events').select('*').eq('plan_id', plan.id).order('day_number').order('event_time')
    setEventsModal({ plan, events: data || [] })
  }
  const openReport = async (plan) => {
    const { data } = await supabase.from('adaptation_plan_events').select('*').eq('plan_id', plan.id)
    const evs = data || []
    const done = evs.filter(e => e.status === 'done')
    const mand = evs.filter(e => e.is_mandatory)
    const mandDone = mand.filter(e => e.status === 'done')
    const rated = evs.filter(e => e.rating != null)
    setReportModal({
      plan, total: evs.length, done: done.length,
      pct: evs.length ? Math.round(done.length / evs.length * 100) : 0,
      mandPct: mand.length ? Math.round(mandDone.length / mand.length * 100) : 0,
      avg: rated.length ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1) : '—'
    })
  }
  const openEdit = (plan) => { setEditModal(plan); setEditForm({ status: plan.status, end_date: plan.end_date || '' }) }
  const saveEdit = async () => {
    if (!editModal) return
    await supabase.from('adaptation_plans').update({ status: editForm.status, end_date: editForm.end_date || null }).eq('id', editModal.id)
    await notify(editModal.employee_id, `Ваш план адаптации обновлён (статус: ${editForm.status}).`, '/onboarding')
    showSuccess('План обновлён, сотрудник уведомлён')
    setEditModal(null); load(companyId)
  }
  const approveEvent = async (ev) => {
    await supabase.from('adaptation_plan_events').update({ manager_confirmed_at: new Date().toISOString(), rating: 5 }).eq('id', ev.id)
    showSuccess('Событие подтверждено')
    openEvents(eventsModal.plan)
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Адаптация сотрудников" />

        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Назначить план адаптации</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 14, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Сотрудник</label>
              <select className="input-field" style={{ width: '100%' }} value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                <option value="">—</option>
                {employees.map(e => <option key={e.user_id} value={e.user_id}>{empName(e.user_id)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Шаблон</label>
              <select className="input-field" style={{ width: '100%' }} value={form.template_id} onChange={e => setForm({ ...form, template_id: e.target.value })}>
                <option value="">—</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Дата начала</label>
              <DatePicker value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} placeholder="Дата" />
            </div>
            <button type="submit" style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Назначить</button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.length === 0 && <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Планов пока нет</div>}
          {plans.map(p => {
            const tpl = templates.find(t => t.id === p.template_id)
            return (
              <div key={p.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{empName(p.employee_id)}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{tpl?.name || 'План'} · старт {new Date(p.start_date).toLocaleDateString('ru')}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 700, background: p.status === 'active' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', color: p.status === 'active' ? '#4ade80' : '#aaa', border: `1px solid ${p.status === 'active' ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.15)'}` }}>{p.status}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEvents(p)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>События</button>
                  <button onClick={() => openReport(p)} style={{ ...ghostBtn, borderColor: 'rgba(160,233,255,0.4)', color: '#a0e9ff' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Отчёт</button>
                  <button onClick={() => openEdit(p)} style={{ ...ghostBtn, borderColor: 'rgba(192,132,252,0.4)', color: '#c084fc' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Редактировать</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <PremiumModal isOpen={!!eventsModal} onClose={() => setEventsModal(null)} title={`События: ${eventsModal ? empName(eventsModal.plan.employee_id) : ''}`} showCloseButton={false}>
        {eventsModal && (
          <div style={{ maxHeight: '62vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {eventsModal.events.map(ev => (
              <div key={ev.id} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#fff' }}>День {ev.day_number} · {ev.title}</div>
                  <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', background: ev.status === 'done' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', color: ev.status === 'done' ? '#4ade80' : '#aaa' }}>{ev.status}</span>
                </div>
                {ev.employee_feedback && <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Фидбек: {ev.employee_feedback}</div>}
                {ev.status === 'done' && !ev.manager_confirmed_at && (
                  <button onClick={() => approveEvent(ev)} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 11, marginTop: 8 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Подтвердить</button>
                )}
              </div>
            ))}
          </div>
        )}
      </PremiumModal>

      <PremiumModal isOpen={!!reportModal} onClose={() => setReportModal(null)} title="Отчёт по адаптации" showCloseButton={false}>
        {reportModal && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Общий прогресс</div><div style={{ fontSize: 26, fontWeight: 700, color: '#FFD700' }}>{reportModal.pct}%</div></div>
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Обязательные</div><div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>{reportModal.mandPct}%</div></div>
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Выполнено</div><div style={{ fontSize: 26, fontWeight: 700, color: '#a0e9ff' }}>{reportModal.done}/{reportModal.total}</div></div>
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Средняя оценка</div><div style={{ fontSize: 26, fontWeight: 700, color: '#c084fc' }}>{reportModal.avg}</div></div>
          </div>
        )}
      </PremiumModal>

      <PremiumModal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Редактировать план" showCloseButton={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Статус</label>
            <select className="input-field" style={{ width: '100%' }} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
              <option value="active">Активен</option><option value="completed">Завершён</option><option value="cancelled">Отменён</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Дата окончания</label>
            <DatePicker value={editForm.end_date} onChange={v => setEditForm({ ...editForm, end_date: v })} placeholder="Дата" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditModal(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
            <button onClick={saveEdit} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
          </div>
        </div>
      </PremiumModal>
    </div>
  )
}
export default withAuth(AdaptationAdmin, { permission: 'can_manage_employees' })
