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

  // Управление сотрудниками и должностями
  const [positions, setPositions] = useState([])
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: 6 })
  const [editingPosition, setEditingPosition] = useState(null)
  const [editPositionTitle, setEditPositionTitle] = useState('')

  useEffect(() => { fetchProfile() }, [])
  useEffect(() => {
    if (profile) {
      if (activeTab === 'tasks') fetchTasks()
      if (activeTab === 'employees') { fetchEmployees(); fetchPositions(); }
      if (activeTab === 'review') fetchPendingReviews()
      if (activeTab === 'history') { setHistoryPage(0); fetchHistory() }
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

  const fetchPositions = async () => {
    const { data } = await supabase.from('positions').select('*').eq('company_id', profile.company_id).order('title')
    setPositions(data || [])
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

    const { data: task, error: taskError } = await supabase.from('tasks').insert({
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
    }).select().single()
    if (taskError) {
      setSuccessModal({ show: true, message: 'Ошибка создания задания: ' + taskError.message })
      return
    }

    const { data: employeesList } = await supabase.from('profiles').select('user_id').eq('company_id', profile.company_id).not('role_id', 'in', '(1,2)').not('user_id', 'is', null)
    if (employeesList && employeesList.length > 0) {
      const assignments = employeesList.map(emp => ({ task_id: task.id, user_id: emp.user_id, status: 'assigned', deadline_at: deadlineAt }))
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
    if (!editPositionTitle?.trim()) return
    const { error } = await supabase.from('positions').insert({ company_id: profile.company_id, title: editPositionTitle.trim() })
    if (!error) {
      await logAction('position_created', 'position', null, { title: editPositionTitle })
      setEditPositionTitle('')
      fetchPositions()
    }
  }

  const handleEditPosition = async (id, newTitle) => {
    if (!newTitle.trim()) return
    const { error } = await supabase.from('positions').update({ title: newTitle.trim() }).eq('id', id)
    if (!error) {
      await logAction('position_updated', 'position', id, { new_title: newTitle })
      setEditingPosition(null)
      fetchPositions()
    }
  }

  const handleDeletePosition = async (id) => {
    await supabase.from('positions').delete().eq('id', id)
    await logAction('position_deleted', 'position', id)
    fetchPositions()
  }

  // Добавление сотрудника
  const handleAddEmployee = async () => {
    if (!newEmployee.email) return
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', newEmployee.email).maybeSingle()
    if (existing) {
      setSuccessModal({ show: true, message: 'Сотрудник с таким email уже существует' })
      return
    }

    // Заглушка: просто создаём профиль. В будущем – отправка приглашения.
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
    const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString(), delete_comment: comment }).eq('id', employeeId)
    if (!error) {
      await logAction('employee_deleted', 'profile', employeeId, { comment })
      fetchEmployees()
      setSuccessModal({ show: true, message: 'Сотрудник удалён' })
    }
  }

  if (!profile) return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="flex gap-4 mb-8">
        {['tasks', 'employees', 'review', 'history', 'settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`filter-pill ${activeTab === tab ? 'active' : ''}`}>
            {tab === 'tasks' && 'Задания'}
            {tab === 'employees' && 'Сотрудники'}
            {tab === 'review' && 'Проверка'}
            {tab === 'history' && 'История'}
            {tab === 'settings' && 'Настройки компании'}
          </button>
        ))}
      </div>

      {/* Вкладки tasks, review, history остаются без изменений (как в предыдущей полной версии) */}

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
                className="input-field"
                placeholder="Название должности"
                value={editPositionTitle}
                onChange={e => setEditPositionTitle(e.target.value)}
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
                          onKeyDown={e => e.key === 'Enter' && handleEditPosition(pos.id, editPositionTitle)}
                        />
                        <button onClick={() => handleEditPosition(pos.id, editPositionTitle)} className="text-xs text-green-400">✓</button>
                        <button onClick={() => setEditingPosition(null)} className="text-xs text-red-400">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-white text-sm">{pos.title}</span>
                        <button onClick={() => { setEditingPosition(pos.id); setEditPositionTitle(pos.title); }} className="text-xs text-blue-400 ml-2">✎</button>
                        <button onClick={() => handleDeletePosition(pos.id)} className="text-xs text-red-400 ml-1">✕</button>
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
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteEmployee(emp.id, 'Уволен')} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Настройки компании */}
      {activeTab === 'settings' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">Настройки компании</h3>
          <p className="text-gray-400 text-sm">Здесь будут название, логотип и описание компании. Скоро появится.</p>
        </div>
      )}

      {/* Модальное окно добавления сотрудника */}
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
      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}
