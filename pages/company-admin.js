import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

export default function CompanyAdmin() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // Новая форма
  const [showNewEmployee, setShowNewEmployee] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [roles, setRoles] = useState([])
  const [inviteResult, setInviteResult] = useState(null)

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

      // Загружаем роли компании
      const { data: rolesData } = await supabase.from('roles').select('*').eq('company_id', profile.company_id)
      setRoles(rolesData || [])
      if (rolesData && rolesData.length > 0 && !newRoleId) setNewRoleId(rolesData[0].id)

      // Загружаем сотрудников
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('*, roles(name), departments(name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      setEmployees(employeesData || [])
      setLoading(false)
    }
    checkAccess()
  }, [])

  async function handleCreateEmployee(e) {
    e.preventDefault()
    if (!newName || !newEmail || !newRoleId) return

    const token = crypto.randomUUID()
    const tempPassword = Math.random().toString(36).slice(-8)

    // Создаём инвайт
    await supabase.from('invitations').insert({
      company_id: profile.company_id,
      role_id: parseInt(newRoleId),
      email: newEmail,
      token,
      temp_password: tempPassword,
      created_by: user.id,
    })

    setInviteResult({
      link: `${window.location.origin}/invite?token=${token}`,
      tempPassword,
    })

    setNewName('')
    setNewEmail('')
    setNewPosition('')
    setNewRoleId(roles[0]?.id || '')
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="dash-card mb-6">
        <h3>Панель управления компанией</h3>
        <p className="text-sm text-gray-400 mt-2">
          Добро пожаловать, {profile?.display_name || user?.email}. Ваша роль: {profile?.roles?.name}
        </p>
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
            <input value={newPosition} onChange={e => setNewPosition(e.target.value)} placeholder="Должность (необязательно)" className="input-field" />
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
              <span className="text-xs text-gray-500">{emp.user_id === user?.id ? '(вы)' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
