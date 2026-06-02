import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase, getAccessToken } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'

export default function CompanyAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [invites, setInvites] = useState([])

  // Состояния для модалок
  const [modal, setModal] = useState({ show: false, title: '', message: '', onClose: null })

  const [form, setForm] = useState({
    title: '',
    description: '',
    reward_karma: 10,
    task_type: 'one_time',
    frequency: 'once',
    target_role: 'all',
    min_energy_level: 0,
    requires_review: false,
    deadline_hours: ''
  })

  // Удаление задания: храним ID для подтверждения
  const [deleteTaskId, setDeleteTaskId] = useState(null)

  useEffect(() => { fetchProfile() }, [])
  useEffect(() => {
    if (profile) {
      if (activeTab === 'tasks') fetchTasks()
      if (activeTab === 'employees') fetchEmployees()
      if (activeTab === 'invites') fetchInvites()
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
      .neq('role_id', 1)
    setEmployees(data || [])
  }

  const fetchInvites = async () => {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('company_id', profile.company_id)
    setInvites(data || [])
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    const token = await getAccessToken()
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        rewardKarma: form.reward_karma,
        taskType: form.task_type,
        frequency: form.frequency,
        targetRole: form.target_role,
        minEnergyLevel: form.min_energy_level,
        requiresReview: form.requires_review,
        deadlineHours: form.deadline_hours ? Number(form.deadline_hours) : null
      })
    })
    if (res.ok) {
      const result = await res.json()
      setModal({
        show: true,
        title: 'Успешно',
        message: `Задание создано! Назначено сотрудников: ${result.assigned}`,
        onClose: () => {
          setModal({ show: false })
          fetchTasks()
          setForm({ title: '', description: '', reward_karma: 10, task_type: 'one_time', frequency: 'once', target_role: 'all', min_energy_level: 0, requires_review: false, deadline_hours: '' })
        }
      })
    } else {
      const err = await res.json()
      setModal({ show: true, title: 'Ошибка', message: err.error || 'Не удалось создать задание' })
    }
  }

  const handleDeleteClick = (taskId) => {
    setDeleteTaskId(taskId)
    setModal({
      show: true,
      title: 'Подтверждение',
      message: 'Вы уверены, что хотите удалить задание и все его назначения?',
      onClose: null // кнопка "Понятно" не подходит, нужно два действия
    })
  }

  const confirmDelete = async () => {
    const taskId = deleteTaskId
    setDeleteTaskId(null)
    setModal({ show: false })
    if (!taskId) return

    const token = await getAccessToken()
    const res = await fetch('/api/tasks/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ taskId })
    })
    if (res.ok) {
      fetchTasks()
    } else {
      const err = await res.json()
      setModal({ show: true, title: 'Ошибка', message: err.error || 'Не удалось удалить' })
    }
  }

  const handleSendInvite = async (email) => {
    // Заглушка: позже можно тоже через API, но пока alert не будем использовать
    // Оставим как есть или сделаем модалку
    setModal({ show: true, title: 'Информация', message: 'Функция приглашений временно не реализована' })
  }

  // Кастомное модальное окно для подтверждения удаления
  if (modal.show && deleteTaskId !== null && modal.onClose === null) {
    // Это окно подтверждения удаления
    return (
      <div className="modal-overlay" onClick={() => { setModal({ show: false }); setDeleteTaskId(null) }}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold mb-4 text-gold">Подтверждение</h3>
          <p className="mb-6 text-white">{modal.message}</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => { setModal({ show: false }); setDeleteTaskId(null) }} className="btn-outline">Отмена</button>
            <button onClick={confirmDelete} className="btn-gold">Удалить</button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="flex gap-4 mb-8">
        {['tasks', 'employees', 'invites'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`filter-pill ${activeTab === tab ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            {tab === 'tasks' && 'Задания'}
            {tab === 'employees' && 'Сотрудники'}
            {tab === 'invites' && 'Приглашения'}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Левая колонка: форма создания */}
          <div className="dash-card lg:w-1/2">
            <h3 className="text-lg font-bold mb-4">Создать задание</h3>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <input type="text" placeholder="Название задания" className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <textarea placeholder="Описание и условия" className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ height: '80px', resize: 'vertical' }} required />
              {/* ... (все те же поля формы, что и раньше) */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-gray-400">Награда (кармики)</label>
                  <input type="number" className="input-field" value={form.reward_karma} onChange={e => setForm({ ...form, reward_karma: parseInt(e.target.value) || 0 })} />
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
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-gray-400">
                  <input type="checkbox" checked={form.requires_review} onChange={e => setForm({ ...form, requires_review: e.target.checked })} />
                  Требуется проверка руководителем
                </label>
                <div className="flex-1">
                  <input type="number" placeholder="Дедлайн (часов)" className="input-field" value={form.deadline_hours} onChange={e => setForm({ ...form, deadline_hours: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn-gold w-full">Создать задание</button>
            </form>
          </div>

          {/* Правая колонка: список заданий */}
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
                  <span style={{ color: '#f59e0b' }}>+{task.reward_karma} кармиков</span>
                  <button
                    onClick={() => handleDeleteClick(task.id)}
                    className="text-xs underline hover:text-red-400 text-red-400"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
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
          <div className="flex gap-2 mb-4">
            <input type="email" placeholder="Email сотрудника" className="input-field" id="inviteEmail" />
            <button onClick={() => {
              const email = document.getElementById('inviteEmail').value
              if (email) handleSendInvite(email)
            }} className="btn-gold">Отправить</button>
          </div>
          {invites.length === 0 ? (
            <p className="text-gray-400">Нет приглашений</p>
          ) : (
            <div className="flex flex-col gap-2">
              {invites.map(inv => (
                <div key={inv.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-800">
                  <span>{inv.email}</span>
                  <span className="text-sm" style={{ color: inv.status === 'accepted' ? '#32cd32' : '#ffd700' }}>
                    {inv.status === 'pending' ? 'Ожидает' : 'Принято'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Обычное информационное окно */}
      <PremiumModal
        isOpen={modal.show && deleteTaskId === null}
        onClose={() => { if (modal.onClose) modal.onClose(); else setModal({ show: false }) }}
        title={modal.title}
      >
        <p className="text-white">{modal.message}</p>
      </PremiumModal>
    </div>
  )
}
