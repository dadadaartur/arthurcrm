import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { isCompanyAdmin, roleLabel } from '../../lib/permissions'
import { useProfile } from '../../context/ProfileContext'
import { getPlural } from '../../lib/format'

const PERMISSION_FIELDS = [
  { key: 'can_create_tasks', label: 'Создание заданий' },
  { key: 'can_review_tasks', label: 'Проверка заданий и покупок' },
  { key: 'can_manage_employees', label: 'Добавление сотрудников' },
  { key: 'can_delete_employees', label: 'Удаление сотрудников' },
]
const emptyPermissions = { can_create_tasks: false, can_review_tasks: false, can_manage_employees: false, can_delete_employees: false }

function EmployeesPage() {
  const router = useRouter()
  const { profile: myProfile } = useProfile()
  const [companyId, setCompanyId] = useState(null)
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  const [companyRoles, setCompanyRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editForm, setEditForm] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: '', ...emptyPermissions })
  const [pendingInvites, setPendingInvites] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: '', ...emptyPermissions })
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [notification, setNotification] = useState({ show: false, message: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
      if (!profileData) { router.push('/'); return }
      setCompanyId(profileData.company_id)
      await loadData(profileData.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const loadData = async (compId) => {
    const [empRes, posRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*, positions(title)').eq('company_id', compId).is('deleted_at', null),
      supabase.from('positions').select('*').eq('company_id', compId).order('title'),
      supabase.from('roles').select('*').eq('company_id', compId).order('name')
    ])
    setEmployees(empRes.data?.filter(emp => !isCompanyAdmin(emp)) || [])
    setPositions(posRes.data || [])
    setCompanyRoles(rolesRes.data || [])
    loadPendingInvites()
  }

  const loadPendingInvites = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch('/api/company-admin/pending-invites', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) setPendingInvites(await res.json())
    } catch (e) {
      // не критично для страницы
    }
  }

  const cancelInvite = async (invitationId) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/company-admin/cancel-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ invitationId })
    })
    loadPendingInvites()
  }

  const showNotification = (msg) => {
    setNotification({ show: true, message: msg })
    setTimeout(() => setNotification({ show: false, message: '' }), 3000)
  }

  const handleAddPosition = async () => {
    if (!newPositionTitle.trim()) return
    const { error } = await supabase.from('positions').insert({ company_id: companyId, title: newPositionTitle.trim() })
    if (!error) {
      setNewPositionTitle('')
      loadData(companyId)
      showNotification('Должность добавлена')
    } else {
      showNotification('Ошибка добавления должности')
    }
  }

  // Удаление должности: защищаем от удаления, если она занята сотрудником
  const handleDeletePosition = async (pos) => {
    const usedBy = employees.filter(e => e.position_id === pos.id).length
    if (usedBy > 0) {
      showNotification(`Нельзя удалить: должность назначена ${usedBy} ${getPlural(usedBy, ['сотруднику', 'сотрудникам', 'сотрудникам'])}`)
      return
    }
    const { error } = await supabase.from('positions').delete().eq('id', pos.id)
    if (!error) {
      loadData(companyId)
      showNotification('Должность удалена')
    } else {
      showNotification('Ошибка удаления должности')
    }
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.email) return
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/company-admin/invite-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newEmployee.email,
          firstName: newEmployee.first_name,
          lastName: newEmployee.last_name,
          positionId: newEmployee.position_id || null,
          roleId: newEmployee.role_id || null,
          permissions: {
            can_create_tasks: newEmployee.can_create_tasks,
            can_review_tasks: newEmployee.can_review_tasks,
            can_manage_employees: newEmployee.can_manage_employees,
            can_delete_employees: newEmployee.can_delete_employees
          }
        })
      })
      const result = await res.json()
      if (!res.ok) {
        showNotification('Ошибка: ' + (result.error || 'не удалось пригласить'))
        return
      }
      setShowAddModal(false)
      setNewEmployee({ email: '', first_name: '', last_name: '', position_id: '', role_id: '', ...emptyPermissions })
      loadData(companyId)
      showNotification('Приглашение отправлено на ' + newEmployee.email)
    } catch (err) {
      showNotification('Внутренняя ошибка сервера')
    }
  }

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp)
    setEditForm({
      email: emp.email || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      position_id: emp.position_id || '',
      role_id: emp.role_id || '',
      can_create_tasks: !!emp.can_create_tasks,
      can_review_tasks: !!emp.can_review_tasks,
      can_manage_employees: !!emp.can_manage_employees,
      can_delete_employees: !!emp.can_delete_employees,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingEmployee) return
    const { error } = await supabase.from('profiles').update({
      email: editForm.email,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      position_id: editForm.position_id || null,
      role_id: editForm.role_id || null,
      can_create_tasks: editForm.can_create_tasks,
      can_review_tasks: editForm.can_review_tasks,
      can_manage_employees: editForm.can_manage_employees,
      can_delete_employees: editForm.can_delete_employees,
      display_name: `${editForm.first_name} ${editForm.last_name}`.trim() || editForm.email
    }).eq('user_id', editingEmployee.user_id)
    if (!error) {
      setEditingEmployee(null)
      loadData(companyId)
      showNotification('Сотрудник обновлён')
    } else {
      showNotification('Ошибка сохранения')
    }
  }

  const handleDeleteEmployee = async (empUserId) => {
    if (!myProfile?.can_delete_employees && !isCompanyAdmin(myProfile)) {
      showNotification('У вас нет прав на удаление сотрудников')
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', empUserId)
    if (error) {
      showNotification('Ошибка удаления: ' + error.message)
      return
    }
    loadData(companyId)
    showNotification('Сотрудник удалён')
  }

  const canDelete = myProfile?.can_delete_employees || isCompanyAdmin(myProfile)

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner text="Загружаем команду…" /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {notification.show && (
        <div
          className="fixed top-4 right-4 z-[1100] px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700' }}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Link href="/company-admin" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Управление командой</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-glass text-sm px-4 py-2 ml-auto">Добавить сотрудника</button>
      </div>

      {/* Должности: аккуратный блок со списком и удалением */}
      <div className="premium-card mb-6">
        <h3 className="text-white font-semibold mb-3">Должности</h3>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            type="text"
            className="input-field"
            style={{ maxWidth: 320 }}
            placeholder="Новая должность (например, Наставник)"
            value={newPositionTitle}
            onChange={e => setNewPositionTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPosition()}
          />
          <button onClick={handleAddPosition} className="btn-glass text-sm px-4 py-2">Добавить должность</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {positions.map(pos => (
            <span key={pos.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              style={{ border: '1px solid rgba(249,115,22,.3)', background: 'rgba(15,31,53,.6)', color: '#eaf0fb' }}>
              {pos.title}
              <button onClick={() => handleDeletePosition(pos)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                title="Удалить должность">
                ✕
              </button>
            </span>
          ))}
          {positions.length === 0 && <span className="text-xs text-gray-500">Должностей пока нет</span>}
        </div>
      </div>

      <div className="premium-card overflow-auto" style={{ maxHeight: '65vh' }}>
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="py-2 pr-4">Имя</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Должность</th>
              <th className="py-2 pr-4">Роль</th>
              <th className="py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.user_id} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={() => handleEditEmployee(emp)}>
                <td className="py-3 pr-4">{emp.display_name || emp.email}</td>
                <td className="py-3 pr-4 text-gray-400">{emp.email}</td>
                <td className="py-3 pr-4">{emp.positions?.title || '—'}</td>
                <td className="py-3 pr-4">{roleLabel(emp)}</td>
                <td className="py-3" onClick={e => e.stopPropagation()}>
                  {canDelete && (
                    <button onClick={() => handleDeleteEmployee(emp.user_id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div className="premium-card mt-6" style={{ padding: 20 }}>
          <h3 className="text-sm text-gray-400 mb-3">Ожидают активации ({pendingInvites.length})</h3>
          <ul className="space-y-2">
            {pendingInvites.map(inv => (
              <li key={inv.id} className="flex justify-between items-center text-sm text-gray-400">
                <span>{inv.email}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    приглашён {new Date(inv.created_at).toLocaleDateString('ru')}
                  </span>
                  <button
                    onClick={() => cancelInvite(inv.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Отменить
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Добавление сотрудника */}
      <PremiumModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Добавить сотрудника" showCloseButton={false}>
        <div className="space-y-3 text-left">
          <input
            type="email"
            className="input-field w-full"
            placeholder="Email сотрудника"
            value={newEmployee.email}
            onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Имя"
              value={newEmployee.first_name}
              onChange={e => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
            />
            <input
              type="text"
              className="input-field w-full"
              placeholder="Фамилия"
              value={newEmployee.last_name}
              onChange={e => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
            />
          </div>
          <select
            className="input-field w-full"
            value={newEmployee.position_id}
            onChange={e => setNewEmployee({ ...newEmployee, position_id: e.target.value })}
          >
            <option value="">Без должности</option>
            {positions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.title}</option>
            ))}
          </select>
          <select
            className="input-field w-full"
            value={newEmployee.role_id}
            onChange={e => setNewEmployee({ ...newEmployee, role_id: e.target.value })}
          >
            <option value="">Без роли</option>
            {companyRoles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          <div className="space-y-1 pt-1">
            {PERMISSION_FIELDS.map(field => (
              <label key={field.key} className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={!!newEmployee[field.key]}
                  onChange={e => setNewEmployee({ ...newEmployee, [field.key]: e.target.checked })}
                />
                {field.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowAddModal(false)} className="btn-glass text-sm px-4 py-2 flex-1">Отмена</button>
            <button onClick={handleAddEmployee} className="btn-glass text-sm px-4 py-2 flex-1">Пригласить</button>
          </div>
        </div>
      </PremiumModal>

      {/* Редактирование сотрудника */}
      <PremiumModal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title="Редактировать сотрудника" showCloseButton={false}>
        <div className="space-y-3 text-left">
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Имя"
              value={editForm.first_name}
              onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
            />
            <input
              type="text"
              className="input-field w-full"
              placeholder="Фамилия"
              value={editForm.last_name}
              onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
            />
          </div>
          <select
            className="input-field w-full"
            value={editForm.position_id}
            onChange={e => setEditForm({ ...editForm, position_id: e.target.value })}
          >
            <option value="">Без должности</option>
            {positions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.title}</option>
            ))}
          </select>
          <select
            className="input-field w-full"
            value={editForm.role_id}
            onChange={e => setEditForm({ ...editForm, role_id: e.target.value })}
          >
            <option value="">Без роли</option>
            {companyRoles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          <div className="space-y-1 pt-1">
            {PERMISSION_FIELDS.map(field => (
              <label key={field.key} className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={!!editForm[field.key]}
                  onChange={e => setEditForm({ ...editForm, [field.key]: e.target.checked })}
                />
                {field.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditingEmployee(null)} className="btn-glass text-sm px-4 py-2 flex-1">Отмена</button>
            <button onClick={handleSaveEdit} className="btn-glass text-sm px-4 py-2 flex-1">Сохранить</button>
          </div>
        </div>
      </PremiumModal>
    </div>
  )
}

export default withAuth(EmployeesPage, { permission: 'can_manage_employees' })
