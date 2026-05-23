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
    target_users: [] // массив user_id сотрудников, которым назначить
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
    let targetUserIds = newTask.target_users
    if (targetUserIds.includes('all_mop')) {
      // Назначаем всем МОПам компании
      const mopIds = employees
        .filter(emp => emp.roles?.name === 'МОП')
        .map(emp => emp.user_id)
      targetUserIds = mopIds
    }

    // Создаём назначения
    if (targetUserIds.length > 0) {
      const assignments = targetUserIds.map(uid => ({
        task_id: taskId,
        user_id: uid,
        status: 'assigned',
      }))
      await supabase.from('task_assignments').insert(assignments)
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
    // Удаляем связанные назначения
    await supabase.from('task_assignments').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks(profile.company_id)
  }

  function openEditTask(task) {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      description: task.description || '',
      reward_karma: task.reward_karma,
      reward_energy: task.reward_energy,
      task_type: task.task_type,
      frequency: task.frequency,
      max_completions: task.max_completions || 1,
      is_active: task.is_active,
      target_users: [], // при редактировании можно будет изменить, но пока оставим
    })
  }

  async function saveEditedTask() {
    if (!editingTask) return
    const { error } = await supabase.from('tasks').update({
      title: newTask.title,
      description: newTask.description,
      reward_karma: newTask.reward_karma,
      reward_energy: newTask.reward_energy,
      task_type: newTask.task_type,
      frequency: newTask.frequency,
      max_completions: newTask.max_completions,
      is_active: newTask.is_active,
    }).eq('id', editingTask.id)
    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
    } else {
      setEditingTask(null)
      fetchTasks(profile.company_id)
    }
  }

  // --- Приглашение (магическая ссылка) ---
  async function handleInvite(e) {
    e.preventDefault()
    if (!newEmail) return
    setSendingInvite(true)
    try {
      const token = crypto.randomUUID()
      const { data: rolesData } = await supabase.from('roles').select('id').eq('company_id', profile.company_id).limit(1)
      const defaultRoleId = rolesData?.[0]?.id
      if (!defaultRoleId) {
        setModal({ isOpen: true, title: 'Ошибка', message: 'Не найдена роль для компании' })
        setSendingInvite(false)
        return
      }

      await supabase.from('invitations').insert({
        company_id: profile.company_id,
        role_id: defaultRoleId,
        email: newEmail,
        token,
        created_by: user.id,
        status: 'pending',
      })

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setModal({ isOpen: true, title: 'Успешно', message: 'Приглашение отправлено на email' })
        setNewEmail('')
        fetchInvitations(profile.company_id)
      } else {
        setModal({ isOpen: true, title: 'Ошибка', message: data.error || 'Не удалось отправить приглашение' })
      }
    } catch (err) {
      setModal({ isOpen: true, title: 'Ошибка', message: 'Не удалось отправить приглашение' })
    } finally {
      setSendingInvite(false)
    }
  }

  async function deleteInvitation(id) {
    await supabase.from('invitations').delete().eq('id', id)
    fetchInvitations(profile.company_id)
  }

  function openEdit(emp) {
    setEditingEmployee(emp)
    setEditName(emp.display_name || '')
    setEditEmail(emp.email || '')
    setEditRoleId(emp.role_id || '')
  }

  async function saveEdit() {
    if (!editingEmployee) return
    const { error } = await supabase.from('profiles').update({
      display_name: editName,
      email: editEmail,
      role_id: parseInt(editRoleId),
    }).eq('user_id', editingEmployee.user_id)
    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
    } else {
      setEditingEmployee(null)
      fetchEmployees(profile.company_id)
    }
  }

  function confirmDelete(emp) { setDeleteTarget(emp) }
  async function executeDelete() {
    if (!deleteTarget) return
    await supabase.from('profiles').delete().eq('user_id', deleteTarget.user_id)
    setDeleteTarget(null)
    fetchEmployees(profile.company_id)
  }

  function confirmResetPassword(emp) { setResetPasswordTarget(emp) }
  async function executeResetPassword() {
    if (!resetPasswordTarget) return
    await supabase.auth.resetPasswordForEmail(resetPasswordTarget.email)
    setModal({ isOpen: true, title: 'Готово', message: 'Ссылка для сброса пароля отправлена на email сотрудника' })
    setResetPasswordTarget(null)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const visibleInvitations = showAllInvitations ? invitations : invitations.slice(0, 5)

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
          <form onSubmit={editingTask ? saveEditedTask : handleCreateTask} className="space-y-3 mb-4">
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

            {/* Выбор сотрудников */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Назначить сотрудникам:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (newTask.target_users.includes('all_mop')) {
                      setNewTask({ ...newTask, target_users: [] })
                    } else {
                      setNewTask({ ...newTask, target_users: ['all_mop'] })
                    }
                  }}
                  className={`filter-pill ${newTask.target_users.includes('all_mop') ? 'active' : ''}`}
                >
                  Всем МОП
                </button>
                {employees
                  .filter(emp => emp.roles?.name === 'МОП')
                  .map(emp => (
                    <button
                      key={emp.user_id}
                      type="button"
                      onClick={() => {
                        const current = newTask.target_users.filter(id => id !== 'all_mop')
                        if (current.includes(emp.user_id)) {
                          setNewTask({ ...newTask, target_users: current.filter(id => id !== emp.user_id) })
                        } else {
                          setNewTask({ ...newTask, target_users: [...current, emp.user_id] })
                        }
                      }}
                      className={`filter-pill ${newTask.target_users.includes(emp.user_id) ? 'active' : ''}`}
                    >
                      {emp.display_name || emp.email}
                    </button>
                  ))}
              </div>
            </div>

            <button type="submit" className="btn-gold w-full">{editingTask ? 'Сохранить' : 'Создать и назначить'}</button>
            {editingTask && <button onClick={() => setEditingTask(null)} className="btn-outline w-full mt-2">Отмена</button>}
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
                <button onClick={() => openEditTask(task)} className="text-xs text-blue-400 hover:text-blue-300">Ред.</button>
                <button onClick={() => toggleTaskActive(task)} className={`text-xs ${task.is_active ? 'text-green-400' : 'text-gray-400'}`}>
                  {task.is_active ? 'Акт.' : 'Неакт.'}
                </button>
                <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Приглашения */}
      <div className="dash-card mb-6">
        <h3>Пригласить сотрудника</h3>
        <form onSubmit={handleInvite} className="space-y-3 mb-4">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email сотрудника" className="input-field" required />
          <button type="submit" className="btn-gold w-full" disabled={sendingInvite}>
            {sendingInvite ? 'Отправка...' : 'Отправить приглашение'}
          </button>
        </form>

        <h3 className="mt-6">История приглашений</h3>
        <div className="space-y-4 mt-4">
          {visibleInvitations.map(inv => (
            <div key={inv.id} className="premium-card flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{inv.email}</p>
                <p className="text-xs text-gray-400">{inv.roles?.name} · {inv.status === 'pending' ? 'Ожидает' : 'Принято'}</p>
              </div>
              <div className="flex gap-2">
                {inv.status === 'pending' && (
                  <button onClick={() => deleteInvitation(inv.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {invitations.length > 5 && (
          <button onClick={() => setShowAllInvitations(!showAllInvitations)} className="text-xs text-gray-400 mt-2 hover:text-white transition">
            {showAllInvitations ? 'Скрыть' : `Показать все (${invitations.length})`}
          </button>
        )}
      </div>

      {/* Сотрудники */}
      <div className="dash-card">
        <h3>Сотрудники</h3>
        <div className="mt-4 space-y-2">
          {employees.map(emp => (
            <div key={emp.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
              <div>
                <p className="text-white font-medium">{emp.display_name || 'Без имени'}</p>
                <p className="text-xs text-gray-400">{emp.roles?.name} · {emp.position || '—'}</p>
              </div>
              <div className="flex gap-2">
                {emp.user_id !== user?.id && (
                  <>
                    <button onClick={() => openEdit(emp)} className="text-xs text-blue-400 hover:text-blue-300">Изменить</button>
                    <button onClick={() => confirmDelete(emp)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                    <button onClick={() => confirmResetPassword(emp)} className="text-xs text-yellow-400 hover:text-yellow-300">Пароль</button>
                  </>
                )}
                {emp.user_id === user?.id && <span className="text-xs text-gray-500">(вы)</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Модалки */}
      <PremiumModal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title="Редактировать сотрудника">
        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Имя" className="input-field mb-3" />
        <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" className="input-field mb-3" />
        <button onClick={saveEdit} className="btn-gold w-full">Сохранить</button>
      </PremiumModal>

      <PremiumModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Удалить сотрудника?">
        <p>Вы уверены, что хотите удалить {deleteTarget?.display_name}? Это действие необратимо.</p>
        <button onClick={executeDelete} className="btn-gold w-full mt-4">Удалить</button>
      </PremiumModal>

      <PremiumModal isOpen={!!resetPasswordTarget} onClose={() => setResetPasswordTarget(null)} title="Сброс пароля?">
        <p>Сотрудник получит ссылку для сброса пароля на email.</p>
        <button onClick={executeResetPassword} className="btn-gold w-full mt-4">Отправить ссылку</button>
      </PremiumModal>

      <PremiumModal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title}>
        <p>{modal.message}</p>
      </PremiumModal>
    </div>
  )
}
