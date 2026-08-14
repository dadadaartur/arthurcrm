import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { setLoading(false); return }
      const res = await fetch('/api/leaderboard', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) setLeaders(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-6">Таблица лидеров</h1>
        {loading ? (
          <p className="text-gray-500">Загрузка...</p>
        ) : leaders.length === 0 ? (
          <p className="text-gray-500">Нет данных</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-2">Место</th>
                <th className="py-2">Сотрудник</th>
                <th className="py-2">Баланс кармы</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, idx) => (
                <tr key={leader.user_id} className="border-b border-gray-800 hover:bg-gray-50">
                  <td className="py-2 font-medium">{idx + 1}</td>
                  <td className="py-2">{leader.name}</td>
                  <td className="py-2 text-gold font-bold">{leader.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
