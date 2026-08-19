import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }

function TasksAdmin() {
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ title: '', description: '', reward_karma: 10, deadline_hours: 24, requires_proof: false, proof_type: 'any' })
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async (compId) => {
    const [t, e] = await Promise.all([
      supabase.from('tasks').select('*, task_assignments(id, status)').eq('company_id', compId).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id').eq('company_id', compId).is('deleted_at', null).eq('is_company_admin', false)
    ])
    setTasks(t.data || [])
    setEmployees(e.data || [])
    setLoading(false)
  }
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!p) return
      setCompanyId(p.company_id)
      await load(p.company_id)
    }
    init()
  }, [])

  const createTask = async (e) => {
    e.preventDefault()
    const { data: task, error } = await supabase.from('tasks').insert({ ...form, reward_karma: Number(form.reward_karma) || 0, deadline_hours: Number(form.deadline_hours) || null, company_id: companyId, is_active: true }).select().single()
    if (error) { setMsg('Ошибка: ' + error.message); return }
    if (employees.length) {
      await supabase.from('task_assignments').insert(employees.map(emp => ({ task_id: task.id, user_id: emp.user_id, status: 'assigned' })))
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/notifications/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ recipients: employees.map(x => x.user_id), type: 'task_new', message: `Новое задание: «${task.title}» (+${task.reward_karma} кармиков)`, link: '/tasks' }) })
    }
    setMsg('Задание создано и назначено команде')
    setForm({ title: '', description: '', reward_karma: 10, deadline_hours: 24, requires_proof: false, proof_type: 'any' })
    load(companyId)
  }
  const deactivate = async (id) => { await supabase.from('tasks').update({ is_active: false }).eq('id', id); load(companyId) }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление заданиями" />
        {msg && <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: 13 }}>{msg}</div>}

        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>Новое задание</h3>
          <form onSubmit={createTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input className="input-field" placeholder="Название" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input type="number" className="input-field" placeholder="Награда (кармики)" value={form.reward_karma} onChange={e => setForm({ ...form, reward_karma: e.target.value })} />
            <textarea className="input-field" style={{ gridColumn: '1 / -1' }} rows={2} placeholder="Описание и условия" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="number" className="input-field" style={{ width: 120 }} placeholder="Срок, ч" value={form.deadline_hours} onChange={e => setForm({ ...form, deadline_hours: e.target.value })} />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#aaa', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.requires_proof} onChange={e => setForm({ ...form, requires_proof: e.target.checked })} /> Нужно медиа-подтверждение
              </label>
              {form.requires_proof && (
                <select className="input-field" value={form.proof_type} onChange={e => setForm({ ...form, proof_type: e.target.value })}><option value="any">Фото или видео</option><option value="photo">Только фото</option><option value="video">Только видео</option></select>
              )}
            </div>
            <div><button type="submit" style={ghostBtn}>Создать и назначить всем</button></div>
          </form>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {tasks.map(t => {
            const done = (t.task_assignments || []).filter(a => a.status === 'completed').length
            const total = (t.task_assignments || []).length
            return (
              <div key={t.id} onClick={() => setSelected(t)}
                style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all .25s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,215,0,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: 15 }}>{t.title}</h4>
                  <span style={{ fontSize: 12, color: '#FFD700', fontWeight: 700 }}>+{t.reward_karma}</span>
                </div>
                <p style={{ fontSize: 12, color: '#888', margin: '8px 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666' }}>
                  <span>Выполнено {done} из {total}</span>
                  {t.requires_proof && <span style={{ color: '#a0e9ff' }}>с медиа-отчётом</span>}
                </div>
              </div>
            )
          })}
          {tasks.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#777' }}>Активных заданий нет</div>}
        </div>
      </div>

      <PremiumModal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.title} showCloseButton={false}>
        {selected && (
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: '#ddd', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Награда</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#FFD700' }}>+{selected.reward_karma} кармиков</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.25)' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Срок выполнения</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#a0e9ff' }}>{selected.deadline_hours ? selected.deadline_hours + ' ч' : 'без срока'}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Подтверждение</div>
                <div style={{ fontSize: 14, color: '#fff' }}>{selected.requires_proof ? (selected.proof_type === 'photo' ? 'Фото' : selected.proof_type === 'video' ? 'Видео' : 'Фото или видео') : 'Не требуется'}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Прогресс команды</div>
                <div style={{ fontSize: 14, color: '#fff' }}>{(selected.task_assignments || []).filter(a => a.status === 'completed').length} / {(selected.task_assignments || []).length} выполнено</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSelected(null)} style={{ ...ghostBtn, flex: 1 }}>Закрыть</button>
              <button onClick={() => { deactivate(selected.id); setSelected(null) }} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(244,67,54,0.4)', color: '#f87171' }}>Деактивировать</button>
            </div>
          </div>
        )}
      </PremiumModal>
    </div>
  )
}
export default withAuth(TasksAdmin, { permission: 'can_create_tasks' })
