import { useEffect, useState } from 'react'

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaders(data))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-6">Таблица лидеров</h1>
        {leaders.length === 0 ? (
          <p className="text-gray-500">Нет данных</p>
        ) : (
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
