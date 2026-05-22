import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import PremiumModal from '../components/PremiumModal'

export default function CompanyAdmin() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const [roles, setRoles] = useState([])
  const [showNewEmployee, setShowNewEmployee] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  const [inviteResult, setInviteResult] = useState(null)

  // Редактирование и удаление
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

      const { data: rolesData } = await supabase.from('roles').select('*').eq('company_id', profile.company_id)
      setRoles(rolesData || [])
      if (rolesData && rolesData.length > 0 && !newRoleId) setNewRoleId(rolesData[0].id)

      await fetchEmployees(profile.company_id)
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

  // Добавление сотрудника
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
      setInviteResult({ link: `${window.location.origin}/invite?token=${token}`, tempPassword })
      setNewName('')
      setNewEmail('')
      setNewRoleId(roles[0]?.id || '')
    } catch (err) {
      setModal({ isOpen: true, title: 'Ошибка', message: err.message })
    }
  }

  // Редактирование
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

  // Удаление
  function confirmDelete(emp) { setDeleteTarget(emp) }
  async function executeDelete() {
    if (!deleteTarget) return
    await supabase.from('profiles').delete().eq('user_id', deleteTarget.user_id)
    setDeleteTarget(null)
    fetchEmployees(profile.company_id)
  }

  // Сброс пароля
  function confirmResetPassword(emp) { setResetPasswordTarget(emp) }
  async function executeResetPassword() {
    if (!resetPasswordTarget) return
    const tempPassword = Math.random().toString(36).slice(-8)
    const { error } = await supabase.from('invitations').insert({
      company_id: profile.company_id,
      role_id: resetPasswordTarget.role_id,
      email: resetPasswordTarget.email,
      token: crypto.randomUUID(),
      temp_password: tempPassword,
      created_by: user.id,
    })
    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
    } else {
      setModal({ isOpen: true, title: 'Пароль сброшен', message: `Временный пароль: ${tempPassword}` })
      setResetPasswordTarget(null)
    }
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="dash-card mb-6">
        <h3>Панель управления компанией</h3>
        <p className="text-sm text-gray-400 mt-2">Добро пожаловать, {profile?.display_name || user?.email}. Ваша роль: {profile?.roles?.name}</p>
      </div>

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
              <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-300">Ссылка: <span className="text-green-400">{inviteResult.link}</span></p>
                <p className="text-xs text-gray-300">Временный пароль: <span className="text-yellow-400 font-mono">{inviteResult.tempPassword}</span></p>
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
