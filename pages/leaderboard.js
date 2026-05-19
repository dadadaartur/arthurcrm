import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])

  useEffect(() => {
    supabase
      .from('karma_balance')
      .select('user_id, balance, updated_at')
      .order('balance', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          Promise.all(data.map(async (row) => {
            const { data: userData } = await supabase.auth.admin.getUserById(row.user_id)
            return { ...row, email: userData?.user?.email || 'Аноним' }
          })).then(setLeaders)
        }
      })
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-6">Таблица лидеров</h1>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2">Место</th>
              <th className="py-2">Сотрудник</th>
              <th className="py-2">Баланс кармы</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((leader, idx) => (
              <tr key={leader.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 font-medium">{idx + 1}</td>
                <td className="py-2">{leader.email}</td>
                <td className="py-2 text-gold font-bold">{leader.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
