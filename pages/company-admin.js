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
    assign_to_all_mop: true,
    target_users: [],
  })

  // Приглашения (сокращено)
  const [newEmail, setNewEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [invitations, setInvitations] = useState([])

  // Сотрудники (управление)
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
    }
    checkAccess()
  }, [])

  async function fetchEmployees(companyId) {
    const { data } = await supabase
      .from('profiles')
      .select('*, roles(name)')
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

  // Создание задания с диагностикой
  async function handleCreateTask(e) {
    e.preventDefault()
    if (!newTask.title.trim()) return

    const { data: createdTasks, error } = await supabase.from('tasks').insert({
      company_id: profile.company_id,
      title: newTask.title,
      description: newTask.description,
      reward_karma: newTask.reward_karma,
      reward_energy: newTask.reward_energy,
      task_type: newTask.task_type,
      frequency: newTask.frequency,
      max_completions: newTask.frequency === 'limited_count' ? newTask.max_completions : null,
      is_active: true,
      created_by: user.id,
    }).select('id')

    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
      return
    }

    const taskId = createdTasks[0].id

    // Кому назначить
    let targetIds = []
    if (newTask.assign_to_all_mop) {
      targetIds = employees
        .filter(emp => emp.roles?.name === 'МОП')
        .map(emp => emp.user_id)
      console.log('Назначение всем МОП:', targetIds)
    } else {
      targetIds = newTask.target_users
      console.log('Назначение выбранным:', targetIds)
    }

    if (targetIds.length > 0) {
      const assignments = targetIds.map(uid => ({
        task_id: taskId,
        user_id: uid,
        status: 'assigned',
      }))
      const { error: assignError } = await supabase.from('task_assignments').insert(assignments)
      if (assignError) {
        setModal({ isOpen: true, title: 'Ошибка назначения', message: assignError.message })
        console.error('Ошибка вставки назначений:', assignError)
      } else {
        setModal({ isOpen: true, title: 'Успешно', message: `Задание создано и назначено ${targetIds.length} сотрудникам` })
        console.log('Назначения созданы успешно')
      }
    } else {
      setModal({ isOpen: true, title: 'Предупреждение', message: 'Нет сотрудников для назначения (возможно, нет МОП или не выбраны)' })
    }

    setNewTask({
      title: '',
      description: '',
      reward_karma: 10,
      reward_energy: 0,
      task_type: 'manual',
      frequency: 'once',
      max_completions: 1,
      assign_to_all_mop: true,
      target_users: [],
    })
    setShowNewTask(false)
    fetchTasks(profile.company_id)
  }

  async function deleteTask(id) {
    await supabase.from('task_assignments').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks(profile.company_id)
  }

  // Остальные функции (приглашения, управление сотрудниками) оставим без изменений для краткости
  // ...

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
          <form onSubmit={handleCreateTask} className="space-y-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Название задания</label>
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Введите название" className="input-field" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Описание</label>
              <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Что нужно сделать" className="input-field" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Награда (кармики)</label>
                <input type="number" value={newTask.reward_karma} onChange={e => setNewTask({ ...newTask, reward_karma: parseInt(e.target.value) || 0 })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Награда (энергия)</label>
                <input type="number" value={newTask.reward_energy} onChange={e => setNewTask({ ...newTask, reward_energy: parseInt(e.target.value) || 0 })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Тип проверки</label>
              <select value={newTask.task_type} onChange={e => setNewTask({ ...newTask, task_type: e.target.value })} className="input-field">
                <option value="manual">Ручная проверка</option>
                <option value="auto_crm">Автоматическая из CRM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Периодичность</label>
              <select value={newTask.frequency} onChange={e => setNewTask({ ...newTask, frequency: e.target.value })} className="input-field">
                <option value="once">Один раз</option>
                <option value="daily">Ежедневно</option>
                <option value="unlimited">Неограниченно</option>
                <option value="limited_count">Ограниченное количество</option>
              </select>
            </div>
            {newTask.frequency === 'limited_count' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Максимальное количество выполнений</label>
                <input type="number" value={newTask.max_completions} onChange={e => setNewTask({ ...newTask, max_completions: parseInt(e.target.value) || 1 })} className="input-field" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="all_mop"
                checked={newTask.assign_to_all_mop}
                onChange={e => setNewTask({ ...newTask, assign_to_all_mop: e.target.checked })}
              />
              <label htmlFor="all_mop" className="text-sm text-gray-300">Назначить всем МОП</label>
            </div>
            <button type="submit" className="btn-gold w-full">Создать и назначить</button>
          </form>
        )}
        <div className="space-y-4">
          {tasks.length === 0 && <p className="text-gray-400">Нет созданных заданий</p>}
          {tasks.map(task => (
            <div key={task.id} className="premium-card flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{task.title}</p>
                <p className="text-xs text-gray-400">{task.task_type} · {task.frequency} · +{task.reward_karma} кармиков, +{task.reward_energy} энергии</p>
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
            </div>
          ))}
        </div>
      </div>

      {/* Сотрудники (кратко) */}
      <div className="dash-card">
        <h3>Сотрудники</h3>
        <div className="mt-4 space-y-2">
          {employees.map(emp => (
            <div key={emp.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
              <div>
                <p className="text-white font-medium">{emp.display_name || 'Без имени'}</p>
                <p className="text-xs text-gray-400">{emp.roles?.name}</p>
              </div>
              <span className="text-xs text-gray-500">{emp.user_id === user?.id ? '(вы)' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Модалка */}
      <PremiumModal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title}>
        <p>{modal.message}</p>
      </PremiumModal>
    </div>
  )
}
