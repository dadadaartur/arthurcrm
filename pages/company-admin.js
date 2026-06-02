import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase, getAccessToken } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-gold">Подтверждение</h3>
        <p className="mb-6 text-white">Вы уверены, что хотите удалить задание и все его назначения?</p>
        <div className="flex justify-center gap-4">
          <button onClick={onCancel} className="btn-outline">Отмена</button>
          <button onClick={onConfirm} className="btn-gold">Удалить</button>
        </div>
      </div>
    </div>
  )
}

export default function CompanyAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [invites, setInvites] = useState([])
  const [deleteModal, setDeleteModal] = useState(null)
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })
  const [pendingReviews, setPendingReviews] = useState([])
  const [history, setHistory] = useState([])
  const [historyFilter, setHistoryFilter] = useState({ status: '', employee: '', dateFrom: '', dateTo: '' })

  const [form, setForm] = useState({
    title: '',
    description: '',
    reward_karma: 10,
    task_type: 'one_time',
    frequency: 'once',
    target_role: 'all',
    min_energy_level: 0,
    requires_review: true,
    deadline_hours: '',
    is_auto: false,
    crm_action_type: '',
    crm_target_count: 0
  })

  useEffect(() => { fetchProfile() }, [])
  useEffect(() => {
    if (profile) {
      if (activeTab === 'tasks') fetchTasks()
      if (activeTab === 'employees') fetchEmployees()
      if (activeTab === 'invites') fetchInvites()
      if (activeTab === 'review') fetchPendingReviews()
      if (activeTab === 'history') fetchHistory()
    }
  }, [profile, activeTab])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*, roles(name, is_system)')
      .eq('user_id', user.id)
      .single()
    if (data && (data.roles?.is_system === true || data.role_id === 2)) {
      setProfile(data)
    } else {
      router.push('/')
    }
  }

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
    setEmployees(data || [])
  }

  const fetchInvites = async () => {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('company_id', profile.company_id)
    setInvites(data || [])
  }

  const fetchPendingReviews = async () => {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, deadline_at, task_id, user_id, tasks!inner( id, title, company_id, reward_karma )')
      .eq('status', 'pending_review')
      .eq('tasks.company_id', profile.company_id)

    if (!error && data) {
      const enriched = await Promise.all(data.map(async (item) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('user_id', item.user_id)
          .single()
        return { ...item, employee_email: profileData?.email || '', employee_name: profileData?.display_name || '' }
      }))
      setPendingReviews(enriched)
    } else setPendingReviews([])
  }

  const fetchHistory = async () => {
    let query = supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, completed_at, reviewed_at, task_id, user_id, tasks( id, title, reward_karma )')
      .eq('tasks.company_id', profile.company_id)
      .not('status', 'in', ['assigned', 'in_progress', 'pending_review'])

    if (historyFilter.status) query = query.eq('status', historyFilter.status)
    if (historyFilter.dateFrom) query = query.gte('completed_at', historyFilter.dateFrom)
    if (historyFilter.dateTo) query = query.lte('completed_at', historyFilter.dateTo)

    const { data, error } = await query.order('completed_at', { ascending: false }).limit(50)

    if (!error && data) {
      const enriched = await Promise.all(data.map(async (item) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('user_id', item.user_id)
          .single()
        return { ...item, employee_email: profileData?.email || '', employee_name: profileData?.display_name || '' }
      }))
      let filtered = enriched
      if (historyFilter.employee) {
        filtered = filtered.filter(h => h.employee_email === historyFilter.employee || h.employee_name === historyFilter.employee)
      }
      setHistory(filtered)
    } else setHistory([])
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!form.reward_karma || form.reward_karma <= 0) {
      setSuccessModal({ show: true, message: 'Укажите награду больше 0' })
      return
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        company_id: profile.company_id,
        title: form.title,
        description: form.description,
        reward_karma: form.reward_karma,
        task_type: form.task_type,
        frequency: form.frequency,
        target_role: form.target_role,
        min_energy_level: form.min_energy_level,
        requires_review: form.requires_review,
        deadline_hours: form.deadline_hours ? Number(form.deadline_hours) : null,
        created_by: profile.user_id,
        is_active: true,
        is_auto: form.is_auto,
        crm_action_type: form.crm_action_type,
        crm_target_count: form.crm_target_count
      })
      .select()
      .single()
    if (taskError) {
      setSuccessModal({ show: true, message: 'Ошибка создания задания: ' + taskError.message })
      return
    }

    const { data: employeesList } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('company_id', profile.company_id)
      .not('role_id', 'in', '(1,2)')
      .not('user_id', 'is', null)

    if (employeesList && employeesList.length > 0) {
      const assignments = employeesList.map(emp => ({
        task_id: task.id,
        user_id: emp.user_id,
        status: 'assigned',
        deadline_at: form.deadline_hours ? new Date(Date.now() + form.deadline_hours * 3600000).toISOString() : null
      }))
      const { error: assignError } = await supabase.from('task_assignments').insert(assignments)
      if (assignError) {
        await supabase.from('tasks').delete().eq('id', task.id)
        setSuccessModal({ show: true, message: 'Ошибка назначения: ' + assignError.message })
        return
      }
      setSuccessModal({ show: true, message: `Задание создано и назначено ${employeesList.length} сотрудникам.` })
    } else {
      setSuccessModal({ show: true, message: 'Задание создано, но в компании нет сотрудников для назначения' })
    }

    setForm({ title: '', description: '', reward_karma: 10, task_type: 'one_time', frequency: 'once', target_role: 'all', min_energy_level: 0, requires_review: true, deadline_hours: '', is_auto: false, crm_action_type: '', crm_target_count: 0 })
    fetchTasks()
  }

  const handleDeleteClick = (taskId) => setDeleteModal(taskId)
  const confirmDelete = async () => {
    const taskId = deleteModal
    setDeleteModal(null)
    if (!taskId) return
    await supabase.from('task_assignments').delete().eq('task_id', taskId)
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) setSuccessModal({ show: true, message: 'Ошибка удаления: ' + error.message })
    else fetchTasks()
  }

  const handleReview = async (assignmentId, action) => {
    const token = await getAccessToken()
    if (!token) {
      setSuccessModal({ show: true, message: 'Ошибка авторизации' })
      return
    }

    const res = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ assignmentId, action })
    })

    if (res.ok) {
      const json = await res.json()
      const message = json.result === 'OK'
        ? (action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено')
        : json.result
      fetchPendingReviews()
      setSuccessModal({ show: true, message })
    } else {
      const err = await res.json()
      setSuccessModal({ show: true, message: 'Ошибка: ' + (err.error || 'Неизвестная ошибка') })
    }
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="flex gap-4 mb-8">
        {['tasks', 'employees', 'invites', 'review', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`filter-pill ${activeTab === tab ? 'active' : ''}`}>
            {tab === 'tasks' && 'Задания'}
            {tab === 'employees' && 'Сотрудники'}
            {tab === 'invites' && 'Приглашения'}
            {tab === 'review' && 'Проверка'}
            {tab === 'history' && 'История'}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="dash-card lg:w-1/2">
            <h3 className="text-lg font-bold mb-4">Создать задание</h3>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <input type="text" placeholder="Название задания" className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <textarea placeholder="Описание и условия" className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ height: '80px', resize: 'vertical' }} required />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-gray-400">Награда (кармики)</label>
                  <input type="number" className="input-field" value={form.reward_karma} onChange={e => setForm({ ...form, reward_karma: parseInt(e.target.value) || 0 })} min="1" />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-400">Тип задания</label>
                  <select className="input-field" value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })}>
                    <option value="one_time">Разовое</option>
                    <option value="recurring">Регулярное</option>
                    <option value="auto_crm">Автоматическое (CRM)</option>
                  </select>
                </div>
              </div>
              {form.task_type === 'recurring' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-gray-400">Периодичность</label>
                    <select className="input-field" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                      <option value="daily">Ежедневно</option>
                      <option value="weekly">Еженедельно</option>
                      <option value="monday">По понедельникам</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-gray-400">Для кого</label>
                  <select className="input-field" value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })}>
                    <option value="all">Все МОП</option>
                    <option value="new">Только новые (&lt; 1 мес.)</option>
                    <option value="experienced">Опытные (&gt; 1 мес.)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-400">Мин. уровень энергии</label>
                  <input type="number" className="input-field" value={form.min_energy_level} onChange={e => setForm({ ...form, min_energy_level: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-4 items-center flex-wrap">
                <label className="flex items-center gap-2 text-gray-400">
                  <input type="checkbox" checked={form.requires_review} onChange={e => setForm({ ...form, requires_review: e.target.checked })} />
                  Требуется проверка руководителем
                </label>
                <label className="flex items-center gap-2 text-gray-400">
                  <input type="checkbox" checked={form.is_auto} onChange={e => setForm({ ...form, is_auto: e.target.checked })} />
                  Автоматическая проверка (CRM)
                </label>
                {form.is_auto && (
                  <>
                    <input type="text" placeholder="Тип действия (call)" className="input-field w-32" value={form.crm_action_type} onChange={e => setForm({ ...form, crm_action_type: e.target.value })} />
                    <input type="number" placeholder="Кол-во" className="input-field w-20" value={form.crm_target_count} onChange={e => setForm({ ...form, crm_target_count: parseInt(e.target.value) || 0 })} />
                  </>
                )}
                <div className="flex-1">
                  <input type="number" placeholder="Дедлайн (часов)" className="input-field" value={form.deadline_hours} onChange={e => setForm({ ...form, deadline_hours: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn-gold w-full">Создать задание</button>
            </form>
          </div>

          <div className="lg:w-1/2 flex flex-col gap-4">
            <h3 className="text-lg font-bold">Все задания ({tasks.length})</h3>
            {tasks.map(task => (
              <div key={task.id} className="dash-card">
                <div className="flex justify-between">
                  <h4 className="text-white">{task.title}</h4>
                  <span className="text-sm text-gray-400">
                    {task.task_type === 'one_time' ? 'Разовое' : task.task_type === 'recurring' ? 'Регулярное' : 'Авто'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-yellow-400">+{task.reward_karma} кармиков</span>
                  <button onClick={() => handleDeleteClick(task.id)} className="text-xs underline hover:text-red-400 text-red-400">Удалить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">Задания на проверке</h3>
          {pendingReviews.length === 0 ? (
            <p className="text-gray-400">Нет заданий, ожидающих проверки</p>
          ) : (
            <div className="space-y-6">
              {pendingReviews.map(item => (
                <div key={item.id} className="premium-card flex flex-col">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="text-white font-semibold">{item.tasks.title}</h4>
                      <p className="text-sm text-gray-400">Сотрудник: {item.employee_name || item.employee_email}</p>
                      <p className="text-sm text-yellow-400">Награда: +{item.tasks.reward_karma} кармиков</p>
                      {item.comment && (
                        <p className="text-sm text-gray-300 mt-1">Комментарий: {item.comment}</p>
                      )}
                    </div>
                    <div className="flex gap-2 items-start">
                      <button onClick={() => handleReview(item.id, 'approve')} className="btn-gold text-xs px-3 py-1.5">Одобрить</button>
                      <button onClick={() => handleReview(item.id, 'reject')} className="btn-outline text-xs px-3 py-1.5">Отклонить</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">История заданий</h3>
          <div className="flex flex-wrap gap-4 mb-4">
            <select className="input-field w-auto" value={historyFilter.status} onChange={e => setHistoryFilter({ ...historyFilter, status: e.target.value })}>
              <option value="">Все статусы</option>
              <option value="completed">Выполнено</option>
              <option value="rejected">Отклонено</option>
            </select>
            <input type="text" placeholder="Сотрудник (email)" className="input-field w-auto" value={historyFilter.employee} onChange={e => setHistoryFilter({ ...historyFilter, employee: e.target.value })} />
            <input type="date" className="input-field w-auto" value={historyFilter.dateFrom} onChange={e => setHistoryFilter({ ...historyFilter, dateFrom: e.target.value })} />
            <input type="date" className="input-field w-auto" value={historyFilter.dateTo} onChange={e => setHistoryFilter({ ...historyFilter, dateTo: e.target.value })} />
            <button onClick={fetchHistory} className="btn-gold text-xs px-4">Применить</button>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-400">Нет записей</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                  <div>
                    <span className="text-white">{h.tasks.title}</span>
                    <span className="text-gray-400 ml-2">({h.status})</span>
                    <span className="text-gray-500 ml-2">{h.employee_email}</span>
                    {h.comment && <span className="text-gray-500 ml-2">— {h.comment}</span>}
                  </div>
                  <span className="text-sm text-yellow-400">+{h.tasks.reward_karma}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">Сотрудники</h3>
          {employees.length === 0 ? (
            <p className="text-gray-400">Нет сотрудников</p>
          ) : (
            <div className="flex flex-col gap-2">
              {employees.map(emp => (
                <div key={emp.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-800">
                  <span>{emp.display_name || emp.email}</span>
                  <span className="text-sm text-gray-400">ID: {emp.user_id?.slice(0,8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">Приглашения</h3>
          <p className="text-gray-400">Функция приглашений временно недоступна</p>
        </div>
      )}

      {deleteModal && <ConfirmModal onConfirm={confirmDelete} onCancel={() => setDeleteModal(null)} />}
      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}
