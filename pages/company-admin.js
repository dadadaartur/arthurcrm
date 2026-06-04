import { useState, useEffect, useRef } from 'react'
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

  // Сотрудники и должности
  const [positions, setPositions] = useState([])
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: 6 })
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [editingPosition, setEditingPosition] = useState(null)
  const [editPositionTitle, setEditPositionTitle] = useState('')
  const [deletePositionId, setDeletePositionId] = useState(null)

  // Настройки компании
  const [companyName, setCompanyName] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [companyLogoFile, setCompanyLogoFile] = useState(null)
  const [companyLogoSaving, setCompanyLogoSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchProfile() }, [])
  useEffect(() => {
    if (profile) {
      if (activeTab === 'tasks') fetchTasks()
      if (activeTab === 'employees') { fetchEmployees(); fetchPositions() }
      if (activeTab === 'review') fetchPendingReviews()
      if (activeTab === 'history') { setHistoryPage(0); fetchHistory() }
      if (activeTab === 'settings') fetchCompanySettings()
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

  const fetchPositions = async () => {
    const { data } = await supabase.from('positions').select('*').eq('company_id', profile.company_id).order('title')
    setPositions(data || [])
  }

  const fetchCompanySettings = async () => {
    const { data } = await supabase.from('companies').select('*').eq('id', profile.company_id).single()
    if (data) {
      setCompanyName(data.name || '')
      setCompanyDescription(data.description || '')
    }
  }

  const uploadImage = async (file, bucket = BUCKET_NAME) => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const { error } = await supabase.storage.from(bucket).upload(`public/${fileName}`, file)
    if (error) return null
    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(`public/${fileName}`)
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

  // Управление должностями
  const handleAddPosition = async () => {
    if (!newPositionTitle.trim()) return
    const { error } = await supabase.from('positions').insert({
      company_id: profile.company_id,
      title: newPositionTitle.trim()
    })
    if (!error) {
      await logAction('position_created', 'position', null, { title: newPositionTitle })
      setNewPositionTitle('')
      fetchPositions()
    }
  }

  const handleEditPosition = async (id) => {
    if (!editPositionTitle.trim()) return
    const { error } = await supabase.from('positions').update({ title: editPositionTitle.trim() }).eq('id', id)
    if (!error) {
      await logAction('position_updated', 'position', id, { new_title: editPositionTitle })
      setEditingPosition(null)
      setEditPositionTitle('')
      fetchPositions()
    }
  }

  const handleDeletePosition = async (id) => {
    await supabase.from('positions').delete().eq('id', id)
    await logAction('position_deleted', 'position', id)
    setDeletePositionId(null)
    fetchPositions()
  }

  // Добавление сотрудника
  const handleAddEmployee = async () => {
    if (!newEmployee.email) return
    // Проверка на существование
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', newEmployee.email).maybeSingle()
    if (existing) {
      setSuccessModal({ show: true, message: 'Сотрудник с таким email уже существует' })
      return
    }

    const { error } = await supabase.from('profiles').insert({
      email: newEmployee.email,
      first_name: newEmployee.first_name,
      last_name: newEmployee.last_name,
      position_id: newEmployee.position_id || null,
      role_id: newEmployee.role_id,
      company_id: profile.company_id,
      display_name: `${newEmployee.first_name} ${newEmployee.last_name}`.trim() || newEmployee.email
    })

    if (!error) {
      await logAction('employee_added', 'profile', null, { email: newEmployee.email })
      setShowAddEmployee(false)
      setNewEmployee({ email: '', first_name: '', last_name: '', position_id: '', role_id: 6 })
      fetchEmployees()
      setSuccessModal({ show: true, message: 'Сотрудник добавлен' })
    } else {
      setSuccessModal({ show: true, message: 'Ошибка: ' + error.message })
    }
  }

  const handleDeleteEmployee = async (employeeId, comment) => {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString(), delete_comment: comment })
      .eq('id', employeeId)
    if (!error) {
      await logAction('employee_deleted', 'profile', employeeId, { comment })
      fetchEmployees()
      setSuccessModal({ show: true, message: 'Сотрудник удалён' })
    }
  }

  // Сохранение настроек компании
  const handleSaveCompanySettings = async (e) => {
    e.preventDefault()
    setCompanyLogoSaving(true)
    let logoUrl = null
    if (companyLogoFile) {
      logoUrl = await uploadImage(companyLogoFile, 'avatars')
    }

    const updates = {
      name: companyName,
      description: companyDescription,
    }
    if (logoUrl) updates.logo_url = logoUrl

    const { error } = await supabase.from('companies').update(updates).eq('id', profile.company_id)
    if (!error) {
      setSuccessModal({ show: true, message: 'Настройки сохранены' })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      setSuccessModal({ show: true, message: 'Ошибка: ' + error.message })
    }
    setCompanyLogoSaving(false)
  }

  if (!profile) return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {['tasks', 'employees', 'review', 'history', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`filter-pill ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'tasks' && 'Задания'}
            {tab === 'employees' && 'Сотрудники'}
            {tab === 'review' && 'Проверка'}
            {tab === 'history' && 'История'}
            {tab === 'settings' && 'Настройки'}
          </button>
        ))}
      </div>

      {/* --- Вкладка Задания --- */}
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

      {/* --- Вкладка Проверка --- */}
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

      {/* --- Вкладка История --- */}
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

      {/* --- Вкладка Сотрудники --- */}
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

      {/* --- Вкладка Настройки компании --- */}
      {activeTab === 'settings' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">Настройки компании</h3>
          <form onSubmit={handleSaveCompanySettings} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Название компании</label>
              <input type="text" className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-gray-400">Описание</label>
              <textarea className="input-field" rows={3} value={companyDescription} onChange={e => setCompanyDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400">Логотип</label>
              <input type="file" accept="image/*" onChange={e => setCompanyLogoFile(e.target.files[0])} ref={fileInputRef} className="mt-2 text-sm text-gray-400" />
            </div>
            <button type="submit" disabled={companyLogoSaving} className="btn-gold">
              {companyLogoSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}

      {/* Модалки */}
      {showAddEmployee && (
        <div className="modal-overlay" onClick={() => setShowAddEmployee(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gold">Добавить сотрудника</h3>
            <div className="space-y-4">
              <input type="email" className="input-field" placeholder="Email" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
              <input type="text" className="input-field" placeholder="Имя" value={newEmployee.first_name} onChange={e => setNewEmployee({ ...newEmployee, first_name: e.target.value })} />
              <input type="text" className="input-field" placeholder="Фамилия" value={newEmployee.last_name} onChange={e => setNewEmployee({ ...newEmployee, last_name: e.target.value })} />
              <select className="input-field" value={newEmployee.position_id} onChange={e => setNewEmployee({ ...newEmployee, position_id: e.target.value })}>
                <option value="">Без должности</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <select className="input-field" value={newEmployee.role_id} onChange={e => setNewEmployee({ ...newEmployee, role_id: parseInt(e.target.value) })}>
                <option value={6}>Сотрудник</option>
                <option value={4}>Модератор</option>
                <option value={2}>Администратор</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddEmployee(false)} className="btn-outline">Отмена</button>
              <button onClick={handleAddEmployee} className="btn-gold">Добавить</button>
            </div>
          </div>
        </div>
      )}

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
