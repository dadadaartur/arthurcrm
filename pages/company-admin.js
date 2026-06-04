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
  const [invites, setInvites] = useState([])
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

  // Для должностей
  const [positions, setPositions] = useState([])
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [editingPosition, setEditingPosition] = useState(null)
  const [editPositionTitle, setEditPositionTitle] = useState('')
  const [deletePositionId, setDeletePositionId] = useState(null)

  // Для управления сотрудниками
  const [editEmployee, setEditEmployee] = useState(null)
  const [deleteEmployeeData, setDeleteEmployeeData] = useState(null)

  useEffect(() => { fetchProfile() }, [])
  useEffect(() => {
    if (profile) {
      if (activeTab === 'tasks') fetchTasks()
      if (activeTab === 'employees') fetchEmployees()
      if (activeTab === 'invites') fetchInvites()
      if (activeTab === 'review') fetchPendingReviews()
      if (activeTab === 'history') { setHistoryPage(0); fetchHistory() }
      if (activeTab === 'positions') fetchPositions()
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
      .select('*, companies(name)')
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
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
      .in('status', ['completed', 'rejected'])
      .order('completed_at', { ascending: false })
      .range(historyPage * ITEMS_PER_PAGE, (historyPage + 1) * ITEMS_PER_PAGE - 1)

    if (historyFilter.status) query = query.eq('status', historyFilter.status)
    if (historyFilter.dateFrom) query = query.gte('completed_at', historyFilter.dateFrom)
    if (historyFilter.dateTo) query = query.lte('completed_at', historyFilter.dateTo)

    const { data, error } = await query

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

  const fetchPositions = async () => {
    const { data } = await supabase.from('positions').select('*').eq('company_id', profile.company_id).order('title')
    setPositions(data || [])
  }

  // Управление сотрудниками
  const handleRoleChange = async (employeeId, newRoleId) => {
    const updates = { role_id: newRoleId }
    // Если снимаем админские права, обнуляем права модератора
    if (newRoleId !== 2) {
      updates.can_create_tasks = false
      updates.can_review_tasks = false
      updates.can_manage_employees = false
      updates.can_delete_employees = false
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', employeeId)
    if (!error) {
      await logAction('role_changed', 'profile', employeeId, { new_role_id: newRoleId })
      fetchEmployees()
      setSuccessModal({ show: true, message: 'Роль обновлена' })
    }
  }

  const handleModeratorRightsChange = async (employeeId, field, value) => {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', employeeId)
    if (!error) {
      await logAction('rights_changed', 'profile', employeeId, { field, value })
      fetchEmployees()
    }
  }

  const handleDeleteEmployee = async () => {
    if (!deleteEmployeeData) return
    const { employeeId, comment } = deleteEmployeeData
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString(), delete_comment: comment })
      .eq('id', employeeId)
    if (!error) {
      await logAction('employee_deleted', 'profile', employeeId, { comment })
      setDeleteEmployeeData(null)
      fetchEmployees()
      setSuccessModal({ show: true, message: 'Сотрудник удалён' })
    }
  }

  // Остальные функции (handleCreateTask, handleDeleteClick, confirmDelete, handleReview, загрузка аватара) без изменений.
  // Вставляем их из предыдущего полного файла.
  // ...

  if (!profile) return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="flex gap-4 mb-8">
        {['tasks', 'employees', 'invites', 'review', 'history', 'positions'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`filter-pill ${activeTab === tab ? 'active' : ''}`}>
            {tab === 'tasks' && 'Задания'}
            {tab === 'employees' && 'Сотрудники'}
            {tab === 'invites' && 'Приглашения'}
            {tab === 'review' && 'Проверка'}
            {tab === 'history' && 'История'}
            {tab === 'positions' && 'Должности'}
          </button>
        ))}
      </div>

      {/* Вкладки tasks, review, history, positions остаются без изменений (как в предыдущей версии) */}

      {activeTab === 'employees' && (
        <div className="dash-card">
          <h3 className="text-lg font-bold mb-4">Сотрудники</h3>
          {employees.length === 0 ? (
            <p className="text-gray-400">Нет сотрудников</p>
          ) : (
            <div className="flex flex-col gap-4">
              {employees.map(emp => (
                <div key={emp.id} className="p-3 rounded-lg bg-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-white font-medium">{emp.display_name || emp.email}</span>
                      <span className="ml-3 text-xs text-gray-400">
                        {emp.role_id === 1 ? 'Суперадмин' : emp.role_id === 2 ? 'Администратор' : emp.role_id === 4 ? 'Модератор' : 'Сотрудник'}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {/* Смена роли */}
                      <select
                        value={emp.role_id}
                        onChange={e => handleRoleChange(emp.id, parseInt(e.target.value))}
                        className="input-field w-auto py-1"
                        disabled={emp.role_id === 1}
                      >
                        <option value={6}>Сотрудник</option>
                        <option value={4}>Модератор</option>
                        <option value={2}>Администратор</option>
                      </select>
                      {/* Кнопка удаления */}
                      {emp.role_id !== 1 && (
                        <button
                          onClick={() => setDeleteEmployeeData({ employeeId: emp.id, comment: '' })}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Права модератора (видны только если роль == 4) */}
                  {emp.role_id === 4 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-600">
                      <p className="text-xs text-gray-400 mb-2">Права модератора:</p>
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={emp.can_create_tasks || false}
                          onChange={e => handleModeratorRightsChange(emp.id, 'can_create_tasks', e.target.checked)}
                        />
                        Создание заданий
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300 mt-1">
                        <input
                          type="checkbox"
                          checked={emp.can_review_tasks || false}
                          onChange={e => handleModeratorRightsChange(emp.id, 'can_review_tasks', e.target.checked)}
                        />
                        Проверка заданий
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300 mt-1">
                        <input
                          type="checkbox"
                          checked={emp.can_manage_employees || false}
                          onChange={e => handleModeratorRightsChange(emp.id, 'can_manage_employees', e.target.checked)}
                        />
                        Управление сотрудниками
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300 mt-1">
                        <input
                          type="checkbox"
                          checked={emp.can_delete_employees || false}
                          onChange={e => handleModeratorRightsChange(emp.id, 'can_delete_employees', e.target.checked)}
                        />
                        Удаление сотрудников
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Модальное окно удаления сотрудника */}
      {deleteEmployeeData && (
        <div className="modal-overlay" onClick={() => setDeleteEmployeeData(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gold">Удаление сотрудника</h3>
            <p className="text-sm text-gray-400 mb-4">Введите причину удаления (обязательно):</p>
            <textarea
              className="input-field"
              value={deleteEmployeeData.comment}
              onChange={e => setDeleteEmployeeData({ ...deleteEmployeeData, comment: e.target.value })}
              rows={2}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setDeleteEmployeeData(null)} className="btn-outline">Отмена</button>
              <button
                onClick={handleDeleteEmployee}
                disabled={!deleteEmployeeData.comment.trim()}
                className="btn-gold"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Остальные модалки (удаление задания, должности) остаются без изменений */}
      {/* ... */}
    </div>
  )
}
