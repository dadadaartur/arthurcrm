import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'

export default function CompanyAdminDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ tasks: 0, employees: 0, goals: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('company_id, role_id')
        .eq('user_id', user.id)
        .single()
      if (!data || (data.role_id !== 1 && data.role_id !== 2)) { router.push('/'); return }
      setProfile(data)
      const compId = data.company_id
      const [tasksRes, employeesRes, goalsRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact' }).eq('company_id', compId).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('company_id', compId).is('deleted_at', null).not('role_id', 'in', '(1,2)'),
        supabase.from('goals').select('id', { count: 'exact' }).eq('company_id', compId).eq('is_active', true)
      ])
      setStats({
        tasks: tasksRes.count || 0,
        employees: employeesRes.count || 0,
        goals: goalsRes.count || 0
      })
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="dash-card text-center">
          <div className="text-3xl font-bold text-white">{stats.tasks}</div>
          <div className="text-sm text-gray-400 mt-1">активных заданий</div>
        </div>
        <div className="dash-card text-center">
          <div className="text-3xl font-bold text-white">{stats.employees}</div>
          <div className="text-sm text-gray-400 mt-1">сотрудников</div>
        </div>
        <div className="dash-card text-center">
          <div className="text-3xl font-bold text-white">{stats.goals}</div>
          <div className="text-sm text-gray-400 mt-1">активных целей</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Link href="/company-admin/tasks" className="filter-pill">Управление заданиями</Link>
        <Link href="/company-admin/employees" className="filter-pill">Управление командой</Link>
        <Link href="/company-admin/goals" className="filter-pill">Управление целями</Link>
        <Link href="/company-admin/review" className="filter-pill">Задания на проверке</Link>
        <Link href="/company-admin/history" className="filter-pill">История заданий</Link>
      </div>
    </div>
  )
}
