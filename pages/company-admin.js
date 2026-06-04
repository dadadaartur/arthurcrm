import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'

function ConfirmModal({ onConfirm, onCancel, children }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children || (
          <>
            <h3 className="text-lg font-bold mb-4 text-gold">Подтверждение</h3>
            <p className="mb-6 text-white">Вы уверены?</p>
            <div className="flex justify-center gap-4">
              <button onClick={onCancel} className="btn-outline">Отмена</button>
              <button onClick={onConfirm} className="btn-gold">Подтвердить</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const BUCKET_NAME = 'task-images'

export default function CompanyAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [deleteModal, setDeleteModal] = useState(null)
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })
  const [pendingReviews, setPendingReviews] = useState([])
  const [history, setHistory] = useState([])
  const [historyFilter, setHistoryFilter] = useState({ status: '', employee: '', dateFrom: '', dateTo: '' })
  const [historyPage, setHistoryPage] = useState(0)
  const ITEMS_PER_PAGE = 20

  const [form, setForm] = useState({
    title: '',
    description: '',
    reward_karma: 10,
    task_type: 'one_time',
    frequency: 'once',
    target_role: 'all',
    min_energy_level: 0,
    requires_review: true,
    deadline_datetime: '',
    is_auto: false,
    crm_action_type: '',
    crm_target_count: 0,
    image_file: null
  })

  // Цели
  const [goals, setGoals] = useState([])
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    user_id: '',
    goal_type: 'calls',
    target_value: 10,
    period: 'day',
    deadline_mode: 'auto',   // 'auto' или 'manual'
    manual_deadline: '',     // дата для ручного выбора
    reward_mode: 'none',     // 'none' | 'rubles' | 'karma' | 'combo'
    reward_rubles: 0,
    reward_karma: 0
  })

  useEffect(() => { fetchProfile() }, [])
  useEffect(() => {
    if (profile) {
      if (activeTab === 'tasks') fetchTasks()
      if (activeTab === 'employees') fetchEmployees()
      if (activeTab === 'review') fetchPendingReviews()
      if (activeTab === 'history') { setHistoryPage(0); fetchHistory() }
      if (activeTab === 'goals') fetchGoals()
    }
  }, [profile, activeTab])

  const logAction = async (action, entityType, entityId, details = {}) => {
    await supabase.from('audit_logs').insert({
      user_id: profile?.user_id,
      action,
      entity_type: entityType,
      entity_id: entityId?.toString(),
      details
    })
  }

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*, roles(name, is_system)')
      .eq('user_id', user.id)
      .single()
    if (data && (data.roles?.is_system === true || data.role_id === 2)) setProfile(data)
    else router.push('/')
  }

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, positions(title)')
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
    setEmployees(data || [])
  }

  const fetchPendingReviews = async () => {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, deadline_at, task_id, user_id, tasks!inner( id, title, company_id, reward_karma )')
      .eq('status', 'pending_review')
      .eq('tasks.company_id', profile.company_id)

    if (!error && data) {
      const enriched = await Promise.all(data.map(async (item) => {
        const { data: profileData } = await supabase.from('profiles').select('email, display_name').eq('user_id', item.user_id).single()
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
      .in('status', ['completed', 'rejected'])
      .order('completed_at', { ascending: false })
      .range(historyPage * ITEMS_PER_PAGE, (historyPage + 1) * ITEMS_PER_PAGE - 1)

    if (historyFilter.status) query = query.eq('status', historyFilter.status)
    if (historyFilter.dateFrom) query = query.gte('completed_at', historyFilter.dateFrom)
    if (historyFilter.dateTo) query = query.lte('completed_at', historyFilter.dateTo)

    const { data, error } = await query
    if (!error && data) {
      const enriched = await Promise.all(data.map(async (item) => {
        const { data: profileData } = await supabase.from('profiles').select('email, display_name').eq('user_id', item.user_id).single()
        return { ...item, employee_email: profileData?.email || '', employee_name: profileData?.display_name || '' }
      }))
      let filtered = enriched
      if (historyFilter.employee) filtered = filtered.filter(h => h.employee_email === historyFilter.employee || h.employee_name === historyFilter.employee)
      setHistory(filtered)
    } else setHistory([])
  }

  const fetchGoals = async () => {
    const { data } = await supabase
      .from('goals')
      .select('*, profiles(email, display_name)')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setGoals(data || [])
  }

  const uploadImage = async (file) => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(`public/${fileName}`, file)
    if (error) return null
    const { data: publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`public/${fileName}`)
    return publicUrl.publicUrl
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!form.reward_karma || form.reward_karma <= 0) {
      setSuccessModal({ show: true, message: 'Укажите награду больше 0' })
      return
    }

    let imageUrl = null
    if (form.image_file) imageUrl = await uploadImage(form.image_file)

    const deadlineAt = form.deadline_datetime ? new Date(form.deadline_datetime).toISOString() : null

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
        deadline_at: deadlineAt,
        created_by: profile.user_id,
        is_active: true,
        is_auto: form.is_auto,
        crm_action_type: form.crm_action_type,
        crm_target_count: form.crm_target_count,
        image_url: imageUrl
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
        deadline_at: deadlineAt
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

    await logAction('task_created', 'task', task.id, { title: task.title, reward: task.reward_karma })
    setForm({ title: '', description: '', reward_karma: 10, task_type: 'one_time', frequency: 'once', target_role: 'all', min_energy_level: 0, requires_review: true, deadline_datetime: '', is_auto: false, crm_action_type: '', crm_target_count: 0, image_file: null })
    fetchTasks()
  }

  const handleDeleteClick = (taskId) => setDeleteModal(taskId)
  const confirmDelete = async () => {
    const taskId = deleteModal
    setDeleteModal(null)
    if (!taskId) return
    await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
    await logAction('task_deleted', 'task', taskId)
    fetchTasks()
  }

  const handleReview = async (assignmentId, action) => {
    const res = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, action })
    })

    if (res.ok) {
      fetchPendingReviews()
      setSuccessModal({ show: true, message: action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено' })
      await logAction(action === 'approve' ? 'task_approved' : 'task_rejected', 'task', assignmentId)
    } else {
      const err = await res.json()
      setSuccessModal({ show: true, message: 'Ошибка: ' + (err.error || 'Неизвестная ошибка') })
    }
  }

  // ===== ЦЕЛИ =====
  const handleCreateGoal = async () => {
    if (!newGoal.user_id || !newGoal.target_value) return

    let title = ''
    switch (newGoal.goal_type) {
      case 'calls': title = 'Звонки'; break
      case 'emails': title = 'Письма'; break
      case 'deals': title = 'Изменения статусов сделок'; break
      case 'comments': title = 'Комментарии в сделке'; break
      case 'chats': title = 'Чаты'; break
    }

    let deadline = null
    if (newGoal.deadline_mode === 'auto') {
      const now = new Date()
      if (newGoal.period === 'day') {
        deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      } else if (newGoal.period === 'week') {
        const nextWeek = new Date(now)
        nextWeek.setDate(now.getDate() + (7 - now.getDay()))
        deadline = nextWeek.toISOString()
      } else if (newGoal.period === 'month') {
        deadline = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      }
    } else {
      deadline = newGoal.manual_deadline ? new Date(newGoal.manual_deadline).toISOString() : null
    }

    const rewardRubles = newGoal.reward_mode === 'rubles' || newGoal.reward_mode === 'combo' ? newGoal.reward_rubles : 0
    const rewardKarma = newGoal.reward_mode === 'karma' || newGoal.reward_mode === 'combo' ? newGoal.reward_karma : 0

    const { error } = await supabase.from('goals').insert({
      company_id: profile.company_id,
      user_id: newGoal.user_id,
      goal_type: newGoal.goal_type,
      title,
      target_value: newGoal.target_value,
      period: newGoal.period,
      reward_rubles: rewardRubles,
      reward_karma: rewardKarma,
      deadline,
      created_by: profile.user_id
    })

    if (!error) {
      await logAction('goal_created', 'goal', null, { ...newGoal })
      setShowGoalModal(false)
      setNewGoal({ user_id: '', goal_type: 'calls', target_value: 10, period: 'day', deadline_mode: 'auto', manual_deadline: '', reward_mode: 'none', reward_rubles: 0, reward_karma: 0 })
      fetchGoals()
      setSuccessModal({ show: true, message: 'Цель создана' })
    } else {
      setSuccessModal({ show: true, message: 'Ошибка: ' + error.message })
    }
  }

  const handleDeleteGoal = async (goalId) => {
    const { error } = await supabase.from('goals').update({ is_active: false }).eq('id', goalId)
    if (!error) {
      await logAction('goal_deleted', 'goal', goalId)
      fetchGoals()
      setSuccessModal({ show: true, message: 'Цель удалена' })
    }
  }

  if (!profile) return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {['tasks', 'employees', 'review', 'history', 'goals'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`filter-pill ${activeTab === tab ? 'active' : ''}`}>
            {tab === 'tasks' && 'Задания'}
            {tab === 'employees' && 'Сотрудники'}
            {tab === 'review' && 'Проверка'}
            {tab === 'history' && 'История'}
            {tab === 'goals' && 'Цели'}
          </button>
        ))}
      </div>

      {/* ===== ВКЛАДКА ЗАДАНИЯ ===== */}
      {activeTab === 'tasks' && (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="dash-card lg:w-1/2">
            <h3 className="text-lg font-bold mb-4">Создать задание</h3>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-400">Название</label>
                <input type="text" className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm text-gray-400">Описание</label>
                <textarea className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} required />
              </div>
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
                <div>
                  <label className="text-sm text-gray-400">Периодичность</label>
                  <select className="input-field" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                    <option value="monday">По понедельникам</option>
                  </select>
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
              <div>
                <label className="text-sm text-gray-400">Дедлайн (дата и время)</label>
                <input type="datetime-local" className="input-field" value={form.deadline_datetime} onChange={e => setForm({ ...form, deadline_datetime: e.target.value })} />
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
                  <div className="flex gap-2">
                    <input type="text" placeholder="Тип действия (call)" className="input-field w-32" value={form.crm_action_type} onChange={e => setForm({ ...form, crm_action_type: e.target.value })} />
                    <input type="number" placeholder="Кол-во" className="input-field w-20" value={form.crm_target_count} onChange={e => setForm({ ...form, crm_target_count: parseInt(e.target.value) || 0 })} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-400">Аватар задания</label>
                <label className="action-btn text-xs px-4 py-2 cursor-pointer mt-2 inline-block">
                  Загрузить изображение
                  <input type="file" accept="image/*" onChange={e => setForm({ ...form, image_file: e.target.files[0] })} className="hidden" />
                </label>
              </div>
              <button type="submit" className="btn-gold w-full">Создать задание</button>
            </form>
          </div>

          <div className="lg:w-1/2">
            <h3 className="text-lg font-bold mb-4">Активные задания ({tasks.length})</h3>
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
              {tasks.map(task => (
                <div key={task.id} className="dash-card">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      {task.image_url && <img src={task.image_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                      <h4 className="text-white">{task.title}</h4>
                    </div>
                    <span className="text-sm text-gray-400">
                      {task.task_type === 'one_time' ? 'Разовое' : task.task_type === 'recurring' ? 'Регулярное' : 'Авто'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <span className="text-yellow-400">+ {task.reward_karma} кармиков</span>
                    <button onClick={() => handleDeleteClick(task.id)} className="text-xs underline hover:text-red-400 text-red-400">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== ВКЛАДКА СОТРУДНИКИ ===== */}
      {activeTab === 'employees' && (
        <div className="dash-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Сотрудники и должности</h3>
            <button onClick={() => setShowAddEmployee(true)} className="action-btn text-xs px-4 py-2">Добавить сотрудника</button>
          </div>

          {/* Блок должностей */}
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-2">Должности</h4>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Название должности"
                value={newPositionTitle}
                onChange={e => setNewPositionTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPosition()}
              />
              <button onClick={handleAddPosition} className="action-btn text-xs px-4">Добавить</button>
            </div>
            {positions.length === 0 ? (
              <p className="text-gray-400 text-sm">Нет должностей</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {positions.map(pos => (
                  <div key={pos.id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1">
                    {editingPosition === pos.id ? (
                      <>
                        <input
                          type="text"
                          className="input-field w-32 py-0.5"
                          value={editPositionTitle}
                          onChange={e => setEditPositionTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleEditPosition(pos.id)}
                        />
                        <button onClick={() => handleEditPosition(pos.id)} className="text-xs text-green-400">✓</button>
                        <button onClick={() => setEditingPosition(null)} className="text-xs text-red-400">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-white text-sm">{pos.title}</span>
                        <button onClick={() => { setEditingPosition(pos.id); setEditPositionTitle(pos.title); }} className="text-xs text-blue-400 ml-2">✎</button>
                        <button onClick={() => setDeletePositionId(pos.id)} className="text-xs text-red-400 ml-1">✕</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Список сотрудников */}
          <h4 className="text-md font-semibold text-white mb-2">Сотрудники</h4>
          {employees.length === 0 ? (
            <p className="text-gray-400 text-sm">Нет сотрудников</p>
          ) : (
            <div className="flex flex-col gap-2">
              {employees.map(emp => (
                <div key={emp.id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                  <div>
                    <span className="text-white">{emp.display_name || emp.email}</span>
                    <span className="ml-3 text-xs text-gray-400">
                      {emp.positions?.title || 'Без должности'} — {emp.role_id === 2 ? 'Администратор' : emp.role_id === 4 ? 'Модератор' : 'Сотрудник'}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteEmployee(emp.id, 'Удаление')} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ВКЛАДКА ПРОВЕРКА ===== */}
      {activeTab === 'review' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">Задания на проверке</h3>
          {pendingReviews.length === 0 ? (
            <p className="text-gray-400">Нет заданий, ожидающих проверки</p>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map(item => (
                <div key={item.id} className="premium-card flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-semibold">{item.tasks.title}</h4>
                    <p className="text-sm text-gray-400">Сотрудник: {item.employee_name || item.employee_email}</p>
                    <p className="text-sm text-yellow-400">Награда: + {item.tasks.reward_karma} кармиков</p>
                    {item.comment && <p className="text-sm text-gray-300 mt-1">Комментарий: {item.comment}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReview(item.id, 'approve')} className="btn-gold text-xs px-3 py-1.5">Одобрить</button>
                    <button onClick={() => handleReview(item.id, 'reject')} className="btn-outline text-xs px-3 py-1.5">Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ВКЛАДКА ИСТОРИЯ ===== */}
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
            <button onClick={() => { setHistoryPage(0); fetchHistory(); }} className="btn-gold text-xs px-4">Применить</button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {history.length === 0 ? (
              <p className="text-gray-400">Нет записей</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                  <div>
                    <span className="text-white">{h.tasks.title}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${h.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{h.status === 'completed' ? 'Выполнено' : 'Отклонено'}</span>
                    <span className="text-gray-500 ml-2">{h.employee_email}</span>
                    {h.comment && <span className="text-gray-500 ml-2">— {h.comment}</span>}
                    <span className="text-xs text-gray-500 ml-2">{new Date(h.completed_at).toLocaleString('ru')}</span>
                  </div>
                  <span className="text-sm text-yellow-400">+ {h.tasks.reward_karma} кармиков</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0} className="btn-outline text-xs">Назад</button>
            <button onClick={() => setHistoryPage(p => p + 1)} className="btn-outline text-xs">Вперед</button>
          </div>
        </div>
      )}

      {/* ===== ВКЛАДКА ЦЕЛИ ===== */}
      {activeTab === 'goals' && (
        <div className="dash-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Цели компании</h3>
            <button onClick={() => setShowGoalModal(true)} className="action-btn text-xs px-4 py-2">Добавить цель</button>
          </div>
          {goals.length === 0 ? (
            <p className="text-gray-400">Нет активных целей</p>
          ) : (
            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="premium-card flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-semibold">{goal.title}</h4>
                    <p className="text-sm text-gray-400">
                      Сотрудник: {goal.profiles?.display_name || goal.profiles?.email || '—'} |
                      Тип: {goal.goal_type === 'calls' ? 'Звонки' : goal.goal_type === 'emails' ? 'Письма' : goal.goal_type === 'deals' ? 'Сделки' : goal.goal_type === 'comments' ? 'Комментарии' : 'Чаты'} |
                      Период: {goal.period}
                    </p>
                    <p className="text-sm text-yellow-400 mt-1">
                      Прогресс: {goal.current_value} / {goal.target_value}
                      {goal.reward_karma > 0 && ` | +${goal.reward_karma} кармиков`}
                      {goal.reward_rubles > 0 && ` | +${goal.reward_rubles} ₽`}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteGoal(goal.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Модальное окно создания цели */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 className="text-lg font-bold mb-4 text-gold">Новая цель</h3>
            <div className="space-y-4">
              {/* Сотрудник */}
              <div>
                <label className="text-sm text-gray-400">Сотрудник</label>
                <select className="input-field" value={newGoal.user_id} onChange={e => setNewGoal({ ...newGoal, user_id: e.target.value })}>
                  <option value="">Выберите сотрудника</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.user_id}>{emp.display_name || emp.email}</option>
                  ))}
                </select>
              </div>
              {/* Тип цели */}
              <div>
                <label className="text-sm text-gray-400">Тип цели</label>
                <select className="input-field" value={newGoal.goal_type} onChange={e => setNewGoal({ ...newGoal, goal_type: e.target.value })}>
                  <option value="calls">Звонки</option>
                  <option value="emails">Письма</option>
                  <option value="deals">Изменения статусов сделок</option>
                  <option value="comments">Кол-во комментариев в сделке</option>
                  <option value="chats">Чаты</option>
                </select>
              </div>
              {/* Количество */}
              <div>
                <label className="text-sm text-gray-400">Количество</label>
                <input type="number" className="input-field" value={newGoal.target_value} onChange={e => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 0 })} min="1" />
              </div>
              {/* Период */}
              <div>
                <label className="text-sm text-gray-400">Период</label>
                <select className="input-field" value={newGoal.period} onChange={e => setNewGoal({ ...newGoal, period: e.target.value })}>
                  <option value="day">День</option>
                  <option value="week">Неделя</option>
                  <option value="month">Месяц</option>
                </select>
              </div>
              {/* Режим дедлайна */}
              <div>
                <label className="text-sm text-gray-400">Дедлайн</label>
                <select className="input-field" value={newGoal.deadline_mode} onChange={e => setNewGoal({ ...newGoal, deadline_mode: e.target.value })}>
                  <option value="auto">Автоматически (по периоду)</option>
                  <option value="manual">Вручную</option>
                </select>
              </div>
              {newGoal.deadline_mode === 'manual' && (
                <div>
                  <label className="text-sm text-gray-400">Дата</label>
                  <input type="date" className="input-field" value={newGoal.manual_deadline} onChange={e => setNewGoal({ ...newGoal, manual_deadline: e.target.value })} />
                </div>
              )}
              {/* Режим награды */}
              <div>
                <label className="text-sm text-gray-400">Награда</label>
                <select className="input-field" value={newGoal.reward_mode} onChange={e => setNewGoal({ ...newGoal, reward_mode: e.target.value })}>
                  <option value="none">Без награды</option>
                  <option value="rubles">Только рубли</option>
                  <option value="karma">Только кармики</option>
                  <option value="combo">Комбо (рубли + кармики)</option>
                </select>
              </div>
              {(newGoal.reward_mode === 'rubles' || newGoal.reward_mode === 'combo') && (
                <div>
                  <label className="text-sm text-gray-400">Рубли</label>
                  <input type="number" className="input-field" value={newGoal.reward_rubles} onChange={e => setNewGoal({ ...newGoal, reward_rubles: parseInt(e.target.value) || 0 })} min="0" />
                </div>
              )}
              {(newGoal.reward_mode === 'karma' || newGoal.reward_mode === 'combo') && (
                <div>
                  <label className="text-sm text-gray-400">Кармики</label>
                  <input type="number" className="input-field" value={newGoal.reward_karma} onChange={e => setNewGoal({ ...newGoal, reward_karma: parseInt(e.target.value) || 0 })} min="0" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowGoalModal(false)} className="btn-outline">Отмена</button>
              <button onClick={handleCreateGoal} className="btn-gold">Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалки удаления заданий и должностей (без изменений) */}
      {deleteModal && <ConfirmModal onConfirm={confirmDelete} onCancel={() => setDeleteModal(null)} />}
      {deletePositionId && (
        <ConfirmModal onConfirm={() => handleDeletePosition(deletePositionId)} onCancel={() => setDeletePositionId(null)}>
          <h3 className="text-lg font-bold mb-4 text-gold">Удалить должность?</h3>
          <div className="flex justify-center gap-4">
            <button onClick={() => setDeletePositionId(null)} className="btn-outline">Отмена</button>
            <button onClick={() => handleDeletePosition(deletePositionId)} className="btn-gold">Удалить</button>
          </div>
        </ConfirmModal>
      )}
      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}
