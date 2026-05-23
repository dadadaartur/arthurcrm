import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import PremiumModal from '../components/PremiumModal'

export default function CompanyAdmin() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // Задания
  const [tasks, setTasks] = useState([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    reward_karma: 10,
    reward_energy: 0,
    task_type: 'manual',
    frequency: 'once',
    max_completions: 1,
    is_active: true,
    assign_to_all_mop: true, // по умолчанию назначаем всем МОП
    target_users: []
  })
  const [editingTask, setEditingTask] = useState(null)

  // Приглашения (упрощённые)
  const [newEmail, setNewEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [showAllInvitations, setShowAllInvitations] = useState(false)

  // Редактирование и удаление сотрудников
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRoleId, setEditRoleId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null)
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' })

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, roles(name, is_system)')
        .eq('user_id', user.id)
        .single()

      if (!profile || (!profile.roles?.is_system &&
          profile.roles?.name !== 'РОП' &&
          profile.roles?.name !== 'СМ' &&
          profile.roles?.name !== 'Администратор')) {
        window.location.href = '/'
        return
      }

      setProfile(profile)

      await fetchEmployees(profile.company_id)
      await fetchTasks(profile.company_id)
      await fetchInvitations(profile.company_id)
    }
    checkAccess()
  }, [])

  async function fetchEmployees(companyId) {
    const { data } = await supabase
      .from('profiles')
      .select('*, roles(name), departments(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setEmployees(data || [])
    setLoading(false)
  }

  async function fetchTasks(companyId) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function fetchInvitations(companyId) {
    const { data } = await supabase
      .from('invitations')
      .select('*, roles(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setInvitations(data || [])
  }

  // --- Задания ---
  async function handleCreateTask(e) {
    e.preventDefault()
    if (!newTask.title) return

    // Создаём задание
    const { data: createdTasks, error } = await supabase.from('tasks').insert({
      company_id: profile.company_id,
      title: newTask.title,
      description: newTask.description,
      reward_karma: newTask.reward_karma,
      reward_energy: newTask.reward_energy,
      task_type: newTask.task_type,
      frequency: newTask.frequency,
      max_completions: newTask.max_completions,
      is_active: newTask.is_active,
      created_by: user.id,
    }).select('id')

    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
      return
    }

    const taskId = createdTasks[0].id

    // Определяем, кому назначить
    let targetUserIds = []
    if (newTask.assign_to_all_mop) {
      // Назначаем всем МОПам компании
      const mopIds = employees
        .filter(emp => emp.roles?.name === 'МОП')
        .map(emp => emp.user_id)
      targetUserIds = mopIds
    } else if (newTask.target_users.length > 0) {
      targetUserIds = newTask.target_users
    }

    // Создаём назначения
    if (targetUserIds.length > 0) {
      const assignments = targetUserIds.map(uid => ({
        task_id: taskId,
        user_id: uid,
        status: 'assigned',
      }))
      const { error: assignError } = await supabase.from('task_assignments').insert(assignments)
      if (assignError) {
        setModal({ isOpen: true, title: 'Ошибка назначения', message: assignError.message })
      }
    }

    // Сбрасываем форму
    setNewTask({
      title: '',
      description: '',
      reward_karma: 10,
      reward_energy: 0,
      task_type: 'manual',
      frequency: 'once',
      max_completions: 1,
      is_active: true,
      assign_to_all_mop: true,
      target_users: [],
    })
    setShowNewTask(false)
    fetchTasks(profile.company_id)
  }

  async function toggleTaskActive(task) {
    await supabase.from('tasks').update({ is_active: !task.is_active }).eq('id', task.id)
    fetchTasks(profile.company_id)
  }

  async function deleteTask(id) {
    await supabase.from('task_assignments').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks(profile.company_id)
  }

  // --- Приглашения (оставлены без изменений) ---
  async function handleInvite(e) { /* ... */ }
  async function deleteInvitation(id) { /* ... */ }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="dash-card mb-6">
        <h3>Панель управления компанией</h3>
        <p className="text-sm text-gray-400 mt-2">Добро пожаловать, {profile?.display_name || user?.email}. Ваша роль: {profile?.roles?.name}</p>
      </div>

      {/* Задания */}
      <div className="dash-card mb-6">
        <h3>Задания</h3>
        <button onClick={() => setShowNewTask(!showNewTask)} className="btn-gold mb-4">+ Новое задание</button>
        {showNewTask && (
          <form onSubmit={handleCreateTask} className="space-y-3 mb-4">
            <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Название" className="input-field" required />
            <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Описание" className="input-field" rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={newTask.reward_karma} onChange={e => setNewTask({ ...newTask, reward_karma: parseInt(e.target.value) })} placeholder="Кармики" className="input-field" />
              <input type="number" value={newTask.reward_energy} onChange={e => setNewTask({ ...newTask, reward_energy: parseInt(e.target.value) })} placeholder="Энергия" className="input-field" />
            </div>
            <select value={newTask.task_type} onChange={e => setNewTask({ ...newTask, task_type: e.target.value })} className="input-field">
              <option value="manual">Ручная проверка</option>
              <option value="auto_crm">Автоматическая из CRM</option>
            </select>
            <select value={newTask.frequency} onChange={e => setNewTask({ ...newTask, frequency: e.target.value })} className="input-field">
              <option value="once">Один раз</option>
              <option value="daily">Ежедневно</option>
              <option value="unlimited">Неограниченно</option>
              <option value="limited_count">Ограниченное количество</option>
            </select>
            {newTask.frequency === 'limited_count' && (
              <input type="number" value={newTask.max_completions} onChange={e => setNewTask({ ...newTask, max_completions: parseInt(e.target.value) })} placeholder="Максимум выполнений" className="input-field" />
            )}

            {/* Выбор назначения */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newTask.assign_to_all_mop}
                  onChange={e => setNewTask({ ...newTask, assign_to_all_mop: e.target.checked })}
                />
                <span className="text-sm text-gray-300">Назначить всем МОП</span>
              </label>
            </div>

            <button type="submit" className="btn-gold w-full">Создать и назначить</button>
          </form>
        )}
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.id} className="premium-card flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{task.title}</p>
                <p className="text-xs text-gray-400">{task.task_type} · {task.frequency} · {task.reward_karma} кармиков</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleTaskActive(task)} className={`text-xs ${task.is_active ? 'text-green-400' : 'text-gray-400'}`}>
                  {task.is_active ? 'Акт.' : 'Неакт.'}
                </button>
                <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Приглашения (сокращено для экономии места) */}
      <div className="dash-card mb-6">
        <h3>Приглашения</h3>
        {/* ... форма и список приглашений ... */}
      </div>

      {/* Сотрудники (сокращено) */}
      <div className="dash-card">
        <h3>Сотрудники</h3>
        <div className="mt-4 space-y-2">
          {employees.map(emp => (
            <div key={emp.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
              <div>
                <p className="text-white font-medium">{emp.display_name || 'Без имени'}</p>
                <p className="text-xs text-gray-400">{emp.roles?.name} · {emp.position || '—'}</p>
              </div>
              <span className="text-xs text-gray-500">{emp.user_id === user?.id ? '(вы)' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
