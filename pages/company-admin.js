import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function CompanyAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [invites, setInvites] = useState([])

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

  useEffect(() => {
    fetchProfile()
  }, [])

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
      .select('*, roles(name)')
      .eq('user_id', user.id)
      .single()
    if (data && (data.role_id === 1 || data.role_id === 2)) {
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
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      setForm({ title: '', description: '', reward_karma: 10, task_type: 'one_time', frequency: 'once', target_role: 'all', min_energy_level: 0, requires_review: false, deadline_hours: '' })
      fetchTasks()
    }
  }

  const handleSendInvite = async (email) => {
    await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    fetchInvites()
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    )
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
          <div className="dash-card lg:w-1/2">
            <h3 className="text-lg font-bold mb-4">Создать задание</h3>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Название задания"
                className="input-field"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
              <textarea
                placeholder="Описание и условия"
                className="input-field"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ height: '80px', resize: 'vertical' }}
              />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Награда (кармики)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.reward_karma}
                    onChange={e => setForm({ ...form, reward_karma: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Тип задания</label>
                  <select
                    className="input-field"
                    value={form.task_type}
                    onChange={e => setForm({ ...form, task_type: e.target.value })}
                  >
                    <option value="one_time">Разовое</option>
                    <option value="recurring">Регулярное</option>
                    <option value="auto_crm">Автоматическое (CRM)</option>
                  </select>
                </div>
              </div>
              {form.task_type === 'recurring' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Периодичность</label>
                    <select
                      className="input-field"
                      value={form.frequency}
                      onChange={e => setForm({ ...form, frequency: e.target.value })}
                    >
                      <option value="daily">Ежедневно</option>
                      <option value="weekly">Еженедельно</option>
                      <option value="monday">По понедельникам</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Для кого</label>
                  <select
                    className="input-field"
                    value={form.target_role}
                    onChange={e => setForm({ ...form, target_role: e.target.value })}
                  >
                    <option value="all">Все МОП</option>
                    <option value="new">Только новые (&lt; 1 мес.)</option>
                    <option value="experienced">Опытные (&gt; 1 мес.)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Мин. уровень энергии</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.min_energy_level}
                    onChange={e => setForm({ ...form, min_energy_level: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <input
                    type="checkbox"
                    checked={form.requires_review}
                    onChange={e => setForm({ ...form, requires_review: e.target.checked })}
                  />
                  Требуется проверка руководителем
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Дедлайн (часов)"
                    className="input-field"
                    value={form.deadline_hours}
                    onChange={e => setForm({ ...form, deadline_hours: e.target.value })}
                  />
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
                  <h4 style={{ color: '#fff' }}>{task.title}</h4>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {task.task_type === 'one_time' ? 'Разовое' : task.task_type === 'recurring' ? 'Регулярное' : 'Авто'}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{task.description}</p>
                <div className="flex justify-between mt-2 text-sm" style={{ color: 'rgba(249,115,22,0.9)' }}>
                  <span>+{task.reward_karma} кармиков</span>
                  <span>{task.target_role === 'all' ? 'Все' : task.target_role === 'new' ? 'Новые' : 'Опытные'}</span>
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
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Нет сотрудников</p>
          ) : (
            <div className="flex flex-col gap-2">
              {employees.map(emp => (
                <div key={emp.id} className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span>{emp.display_name || emp.email}</span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>ID: {emp.user_id?.slice(0,8)}</span>
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
            <input
              type="email"
              placeholder="Email сотрудника"
              className="input-field"
              id="inviteEmail"
            />
            <button
              onClick={() => {
                const email = document.getElementById('inviteEmail').value
                if (email) handleSendInvite(email)
              }}
              className="btn-gold"
            >
              Отправить
            </button>
          </div>
          {invites.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Нет приглашений</p>
          ) : (
            <div className="flex flex-col gap-2">
              {invites.map(inv => (
                <div key={inv.id} className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span>{inv.email}</span>
                  <span className="text-sm" style={{ color: inv.status === 'accepted' ? 'rgba(50,205,50,0.8)' : 'rgba(255,215,0,0.8)' }}>
                    {inv.status === 'pending' ? 'Ожидает' : 'Принято'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
