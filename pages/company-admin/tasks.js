import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = {
  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12,
  padding: '10px 22px', color: '#fff', cursor: 'pointer', fontSize: 13,
  transition: 'all .25s', letterSpacing: 0.3
}
const hoverOn = e => {
  e.currentTarget.style.borderColor = '#FFD700'
  e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
const hoverOff = e => {
  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'
  e.currentTarget.style.boxShadow = 'none'
  e.currentTarget.style.transform = 'translateY(0)'
}

const pillTab = a => ({
  padding: '8px 18px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
  color: a ? '#FFD700' : '#aaa', fontWeight: a ? 700 : 400,
  transition: 'all 0.2s'
})

function TasksPage() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('create') // create | active
  const [form, setForm] = useState({
    title: '', description: '', reward_karma: 10,
    task_type: 'one_time', frequency: 'once', target_role: 'all',
    min_energy_level: 0, requires_review: true, requires_proof: false,
    proof_type: 'any', deadline_datetime: '',
    is_auto: false, crm_action_type: '', crm_target_count: 0,
    image_file: null
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!profileData) { router.push('/'); return }
      const compId = profileData.company_id
      setCompanyId(compId)
      await loadData(compId)
      setLoading(false)
    }
    init()
  }, [router])

  const loadData = async (compId) => {
    const { data } = await supabase
      .from('tasks').select('*').eq('company_id', compId).eq('is_active', true)
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  const uploadImage = async (file) => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `task-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, file)
    if (error) { showError('Ошибка загрузки изображения: ' + error.message); return null }
    const { data } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
    return data?.publicUrl || null
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { showError('Укажите название задания'); return }
    if (!form.reward_karma || form.reward_karma <= 0) { showError('Укажите награду больше 0'); return }

    setCreating(true)
    let imageUrl = null
    if (form.image_file) {
      imageUrl = await uploadImage(form.image_file)
      if (!imageUrl) { setCreating(false); return }
    }
    const deadlineAt = form.deadline_datetime ? new Date(form.deadline_datetime).toISOString() : null

    const { data: task, error: taskError } = await supabase
      .from('tasks').insert({
        company_id: companyId, title: form.title, description: form.description,
        reward_karma: form.reward_karma, task_type: form.task_type, frequency: form.frequency,
        target_role: form.target_role, min_energy_level: form.min_energy_level,
        requires_review: form.requires_review, requires_proof: form.requires_proof,
        proof_type: form.requires_proof ? form.proof_type : null,
        deadline_at: deadlineAt, is_active: true, is_auto: form.is_auto,
        crm_action_type: form.crm_action_type, crm_target_count: form.crm_target_count,
        image_url: imageUrl
      }).select().single()

    if (taskError) { showError('Ошибка создания: ' + taskError.message); setCreating(false); return }

    const { data: employeesList } = await supabase
      .from('profiles').select('user_id').eq('company_id', companyId)
      .eq('is_company_admin', false).is('deleted_at', null)

    if (employeesList && employeesList.length > 0) {
      const assignments = employeesList.map(emp => ({
        task_id: task.id, user_id: emp.user_id, status: 'assigned', deadline_at: deadlineAt
      }))
      const { error: assignError } = await supabase.from('task_assignments').insert(assignments)
      if (assignError) {
        await supabase.from('tasks').delete().eq('id', task.id)
        showError('Ошибка назначения: ' + assignError.message); setCreating(false); return
      }
      showSuccess(`Задание создано и назначено ${employeesList.length} сотрудникам`)
    } else {
      showSuccess('Задание создано (в компании пока нет сотрудников)')
    }

    setForm({
      title: '', description: '', reward_karma: 10, task_type: 'one_time', frequency: 'once',
      target_role: 'all', min_energy_level: 0, requires_review: true, requires_proof: false,
      proof_type: 'any', deadline_datetime: '', is_auto: false,
      crm_action_type: '', crm_target_count: 0, image_file: null
    })
    setCreating(false)
    loadData(companyId)
  }

  const handleDelete = async (taskId) => {
    await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
    showSuccess('Задание удалено')
    loadData(companyId)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление заданиями" extra={
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#888', alignSelf: 'center' }}>
            Всего активных заданий: <b style={{ color: '#FFD700' }}>{tasks.length}</b>
          </div>
        } />

        {/* Табы */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => setTab('create')} style={pillTab(tab === 'create')}>Новое задание</button>
          <button onClick={() => setTab('active')} style={pillTab(tab === 'active')}>Активные задания</button>
        </div>

        {tab === 'create' && (
          <div style={{
            background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)',
            borderRadius: 20, padding: 32, border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: '#fff' }}>Создать задание</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 24, maxWidth: 700, lineHeight: 1.5 }}>
              Задание автоматически назначится всем сотрудникам компании. После создания изменить его будет нельзя — удалите и создайте новое.
            </p>

            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
                {/* Левая колонка: основное */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название задания</label>
                    <input className="input-field" style={{ width: '100%' }} placeholder="Например: 30 звонков за смену"
                      value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание</label>
                    <textarea className="input-field" style={{ width: '100%' }} rows={3}
                      placeholder="Что конкретно должен сделать сотрудник"
                      value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Дедлайн</label>
                    <input type="datetime-local" className="input-field" style={{ width: '100%' }}
                      value={form.deadline_datetime} onChange={e => setForm({...form, deadline_datetime: e.target.value})} />
                  </div>
                </div>

                {/* Правая колонка: параметры */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Награда (кармики)</label>
                      <input type="number" className="input-field" style={{ width: '100%' }} min="1"
                        value={form.reward_karma} onChange={e => setForm({...form, reward_karma: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Тип</label>
                      <select className="input-field" style={{ width: '100%' }}
                        value={form.task_type} onChange={e => setForm({...form, task_type: e.target.value})}>
                        <option value="one_time">Разовое</option>
                        <option value="recurring">Регулярное</option>
                        <option value="auto_crm">Авто из CRM</option>
                      </select>
                    </div>
                  </div>

                  {form.task_type === 'recurring' && (
                    <div>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Периодичность</label>
                      <select className="input-field" style={{ width: '100%' }}
                        value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                        <option value="daily">Ежедневно</option>
                        <option value="weekly">Еженедельно</option>
                        <option value="monday">По понедельникам</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Для кого</label>
                    <select className="input-field" style={{ width: '100%' }}
                      value={form.target_role} onChange={e => setForm({...form, target_role: e.target.value})}>
                      <option value="all">Все сотрудники</option>
                      <option value="new">Новые (менее 1 мес.)</option>
                      <option value="experienced">Опытные (более 1 мес.)</option>
                    </select>
                  </div>

                  {/* Флаги */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.requires_review}
                        onChange={e => setForm({...form, requires_review: e.target.checked})}
                        style={{ accentColor: '#FFD700' }} />
                      Требуется проверка руководителем
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.requires_proof}
                        onChange={e => setForm({...form, requires_proof: e.target.checked})}
                        style={{ accentColor: '#FFD700' }} />
                      Нужно медиа-подтверждение
                    </label>
                    {form.requires_proof && (
                      <div style={{ display: 'flex', gap: 14, marginLeft: 26, marginTop: 4 }}>
                        {[{v:'photo',l:'Фото'},{v:'video',l:'Видео'},{v:'any',l:'Любое'}].map(opt => (
                          <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
                            <input type="radio" name="proof_type" value={opt.v}
                              checked={form.proof_type === opt.v}
                              onChange={() => setForm({...form, proof_type: opt.v})}
                              style={{ accentColor: '#FFD700' }} />
                            {opt.l}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Загрузка изображения */}
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Аватар задания (необязательно)</label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 10, border: '1px dashed rgba(255,215,0,0.3)',
                      background: 'rgba(255,255,255,0.02)', cursor: 'pointer', fontSize: 13, color: '#aaa'
                    }}>
                      <span style={{ color: '#FFD700' }}>+</span>
                      {form.image_file ? form.image_file.name : 'Выбрать изображение'}
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => setForm({...form, image_file: e.target.files[0]})} />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button type="submit" disabled={creating} style={{ ...ghostBtn, opacity: creating ? 0.5 : 1 }}
                  onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                  {creating ? 'Создаём...' : 'Создать задание'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'active' && (
          <div>
            {tasks.length === 0 ? (
              <div style={{
                background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60,
                textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                Нет активных заданий
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {tasks.map((task, i) => (
                  <div key={task.id} style={{
                    background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)',
                    borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.08)',
                    opacity: 0, animation: `fadeUp 0.5s ${i * 0.04}s ease-out forwards`,
                    transition: 'border-color 0.25s, box-shadow 0.25s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(255,215,0,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                      {task.image_url && <img src={task.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                        <div style={{ color: '#888', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.description?.slice(0, 60) || 'Без описания'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#FFD700', fontWeight: 600 }}>+{task.reward_karma} кармиков</span>
                      <button onClick={() => handleDelete(task.id)} style={{
                        background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)',
                        borderRadius: 8, padding: '5px 14px', color: '#f87171', fontSize: 11,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.boxShadow = '0 0 10px rgba(244,67,54,0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(244,67,54,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <style jsx>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}
export default withAuth(TasksPage, { permission: 'can_create_tasks' })
