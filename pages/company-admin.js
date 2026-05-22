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
  })
  const [editingTask, setEditingTask] = useState(null)

  // Сотрудники (форма приглашения)
  const [showNewEmployee, setShowNewEmployee] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  const [roles, setRoles] = useState([])
  const [inviteResult, setInviteResult] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [copied, setCopied] = useState({ link: false, pass: false })

  // Редактирование и удаление сотрудников
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRoleId, setEditRoleId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null)
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' })

  // Задания на проверку
  const [pendingReviews, setPendingReviews] = useState([])

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

      const { data: rolesData } = await supabase.from('roles').select('*').eq('company_id', profile.company_id)
      setRoles(rolesData || [])
      if (rolesData && rolesData.length > 0 && !newRoleId) setNewRoleId(rolesData[0].id)

      await fetchEmployees(profile.company_id)
      await fetchTasks(profile.company_id)
      await fetchPendingReviews(profile.company_id)
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

  async function fetchPendingReviews(companyId) {
    // Назначения со статусом pending_review, задача которых принадлежит компании
    const { data } = await supabase
      .from('task_assignments')
      .select('*, tasks(*)')
      .eq('status', 'pending_review')
      .in('task_id', tasks.map(t => t.id))
    setPendingReviews(data || [])
  }

  // --- Задания ---
  async function handleCreateTask(e) {
    e.preventDefault()
    const { error } = await supabase.from('tasks').insert({
      company_id: profile.company_id,
      ...newTask,
      created_by: user.id,
    })
    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
    } else {
      setNewTask({ title: '', description: '', reward_karma: 10, reward_energy: 0, task_type: 'manual', frequency: 'once', max_completions: 1, is_active: true })
      setShowNewTask(false)
      fetchTasks(profile.company_id)
    }
  }

  async function toggleTaskActive(task) {
    await supabase.from('tasks').update({ is_active: !task.is_active }).eq('id', task.id)
    fetchTasks(profile.company_id)
  }

  async function deleteTask(id) {
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
    })
  }

  async function saveEditedTask() {
    if (!editingTask) return
    const { error } = await supabase.from('tasks').update(newTask).eq('id', editingTask.id)
    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
    } else {
      setEditingTask(null)
      fetchTasks(profile.company_id)
    }
  }

  // --- Проверка заданий ---
  async function approveReview(assignmentId) {
    // Подтверждаем выполнение, начисляем кармики и энергию
    const { data: assignment } = await supabase
      .from('task_assignments')
      .select('*, tasks(*)')
      .eq('id', assignmentId)
      .single()

    if (!assignment) return

    // Обновляем статус
    await supabase.from('task_assignments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', assignmentId)

    // Начисляем кармики
    if (assignment.tasks.reward_karma > 0) {
      await supabase.from('karma_events').insert({
        user_id: assignment.user_id,
        description: `Задание: ${assignment.tasks.title}`,
        amount: assignment.tasks.reward_karma,
        status: 'auto_approved',
        category: 'task',
      })
    }

    // Обновляем баланс (функция update_balance сама сработает через триггер, но на всякий случай можно явно)
    // Энергию пока просто записываем в поле energy в profiles (если оно есть) — позже доработаем

    setModal({ isOpen: true, title: 'Готово', message: 'Задание подтверждено, кармики начислены' })
    fetchPendingReviews(profile.company_id)
  }

  async function rejectReview(assignmentId) {
    await supabase.from('task_assignments').update({ status: 'in_progress' }).eq('id', assignmentId)
    setModal({ isOpen: true, title: 'Отклонено', message: 'Задание возвращено на доработку' })
    fetchPendingReviews(profile.company_id)
  }

  // --- Сотрудники ---
  async function handleCreateEmployee(e) {
    e.preventDefault()
    if (!newName || !newEmail || !newRoleId) return
    try {
      const token = crypto.randomUUID()
      const tempPassword = Math.random().toString(36).slice(-8)
      await supabase.from('invitations').insert({
        company_id: profile.company_id,
        role_id: parseInt(newRoleId),
        email: newEmail,
        token,
        temp_password: tempPassword,
        created_by: user.id,
      })
      setInviteResult({
        link: `${window.location.origin}/login?token=${token}`,
        tempPassword,
      })
      setNewName('')
      setNewEmail('')
      setNewRoleId(roles[0]?.id || '')
    } catch (err) {
      setModal({ isOpen: true, title: 'Ошибка', message: err.message })
    }
  }

  async function sendInviteEmail() { /* ... как раньше ... */ }

  async function copyToClipboard(text, field) { /* ... как раньше ... */ }

  function openEdit(emp) { /* ... как раньше ... */ }
  async function saveEdit() { /* ... как раньше ... */ }
  function confirmDelete(emp) { setDeleteTarget(emp) }
  async function executeDelete() { /* ... как раньше ... */ }
  function confirmResetPassword(emp) { setResetPasswordTarget(emp) }
  async function executeResetPassword() { /* ... как раньше ... */ }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="dash-card mb-6">
        <h3>Панель управления компанией</h3>
        <p className="text-sm text-gray-400 mt-2">Добро пожаловать, {profile?.display_name || user?.email}. Ваша роль: {profile?.roles?.name}</p>
      </div>

      {/* Задания на проверку */}
      {pendingReviews.length > 0 && (
        <div className="dash-card mb-6">
          <h3>Задания на проверку</h3>
          <div className="space-y-4 mt-4">
            {pendingReviews.map(rev => (
              <div key={rev.id} className="premium-card flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{rev.tasks?.title}</p>
                  <p className="text-xs text-gray-400">Сотрудник: {rev.user_id}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveReview(rev.id)} className="text-xs text-green-400 hover:text-green-300">Подтвердить</button>
                  <button onClick={() => rejectReview(rev.id)} className="text-xs text-red-400 hover:text-red-300">Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <button type="submit" className="btn-gold w-full">{editingTask ? 'Сохранить' : 'Создать задание'}</button>
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

      {/* Сотрудники */}
      <div className="dash-card mb-6">
        <h3>Новый сотрудник</h3>
        <button onClick={() => setShowNewEmployee(!showNewEmployee)} className="btn-gold mb-4">+ Добавить сотрудника</button>
        {showNewEmployee && (
          <form onSubmit={handleCreateEmployee} className="space-y-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ФИО" className="input-field" required />
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" className="input-field" required />
            <select value={newRoleId} onChange={e => setNewRoleId(e.target.value)} className="input-field">
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button type="submit" className="btn-gold w-full">Создать приглашение</button>
            {inviteResult && (
              <div className="mt-3 p-3 bg-gray-800 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-300 mb-1">Ссылка для активации:</p>
                  <div className="flex gap-2 items-center">
                    <input type="text" value={inviteResult.link} readOnly className="input-field text-xs text-green-400 bg-gray-900 border-gray-700 flex-1" style={{ cursor: 'text', userSelect: 'text' }} />
                    <button onClick={() => copyToClipboard(inviteResult.link, 'link')} className="btn-gold text-xs px-3 py-1.5 whitespace-nowrap">
                      {copied.link ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-300 mb-1">Временный пароль:</p>
                  <div className="flex gap-2 items-center">
                    <input type="text" value={inviteResult.tempPassword} readOnly className="input-field text-xs text-yellow-400 bg-gray-900 border-gray-700 flex-1 font-mono" style={{ cursor: 'text', userSelect: 'text' }} />
                    <button onClick={() => copyToClipboard(inviteResult.tempPassword, 'pass')} className="btn-gold text-xs px-3 py-1.5 whitespace-nowrap">
                      {copied.pass ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                </div>
                <button onClick={sendInviteEmail} disabled={sendingEmail} className="btn-gold w-full text-xs">
                  {sendingEmail ? 'Отправка...' : 'Отправить на email'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>

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
        <select value={editRoleId} onChange={e => setEditRoleId(e.target.value)} className="input-field mb-3">
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={saveEdit} className="btn-gold w-full">Сохранить</button>
      </PremiumModal>

      <PremiumModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Удалить сотрудника?">
        <p>Вы уверены, что хотите удалить {deleteTarget?.display_name}? Это действие необратимо.</p>
        <button onClick={executeDelete} className="btn-gold w-full mt-4">Удалить</button>
      </PremiumModal>

      <PremiumModal isOpen={!!resetPasswordTarget} onClose={() => setResetPasswordTarget(null)} title="Сброс пароля?">
        <p>Будет сгенерирован новый временный пароль для {resetPasswordTarget?.display_name}.</p>
        <button onClick={executeResetPassword} className="btn-gold w-full mt-4">Сбросить</button>
      </PremiumModal>

      <PremiumModal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title}>
        <p>{modal.message}</p>
      </PremiumModal>
    </div>
  )
}
