import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

export default function CompanyAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*, roles(name, is_system)')
        .eq('user_id', user.id)
        .single()
      if (!data || (data.role_id !== 1 && data.role_id !== 2)) {
        router.push('/')
        return
      }
      setProfile(data)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-10" style={{ color: '#d4af37' }}>Панель управления</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/company-admin/tasks" className="pastel-card text-center hover:scale-105 transition-transform cursor-pointer no-underline">
          <div className="text-3xl mb-3">📋</div>
          <h3 className="text-lg font-semibold mb-1">Задания</h3>
          <p className="text-sm text-gray-400">Создание и управление заданиями</p>
        </Link>

        <Link href="/company-admin/employees" className="pastel-card text-center hover:scale-105 transition-transform cursor-pointer no-underline">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="text-lg font-semibold mb-1">Сотрудники</h3>
          <p className="text-sm text-gray-400">Должности и сотрудники</p>
        </Link>

        <Link href="/company-admin/goals" className="pastel-card text-center hover:scale-105 transition-transform cursor-pointer no-underline">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold mb-1">Цели</h3>
          <p className="text-sm text-gray-400">Назначение и отслеживание целей</p>
        </Link>
      </div>
    </div>
  )
}
