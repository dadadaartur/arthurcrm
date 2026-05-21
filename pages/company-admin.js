import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

export default function CompanyAdmin() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)

      // Получаем профиль текущего пользователя
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

      // Загружаем сотрудников этой же компании
      const { data: employees } = await supabase
        .from('profiles')
        .select('*, roles(name), departments(name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      setEmployees(employees || [])
      setLoading(false)
    }
    checkAccess()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="dash-card mb-6">
        <h3>Панель управления компанией</h3>
        <p className="text-sm text-gray-400 mt-2">
          Добро пожаловать, {profile?.display_name || user?.email}. Ваша роль: {profile?.roles?.name}
        </p>
      </div>

      <div className="dash-card">
        <h3>Сотрудники</h3>
        <div className="mt-4 space-y-2">
          {employees.map(emp => (
            <div key={emp.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
              <div>
                <p className="text-white font-medium">{emp.display_name || 'Без имени'}</p>
                <p className="text-xs text-gray-400">{emp.roles?.name} · {emp.departments?.name}</p>
              </div>
              <span className="text-xs text-gray-500">{emp.user_id === user?.id ? '(вы)' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
