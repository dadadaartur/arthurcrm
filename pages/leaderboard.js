import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BackArrow from '../components/BackArrow'

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
    <div className="theme-light max-w-4xl mx-auto px-4 py-8">
      <BackArrow href="/" title="Таблица лидеров" />
      <div className="premium-card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Загрузка...</p>
        ) : leaders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Нет данных</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-2">Место</th>
                <th className="py-2">Сотрудник</th>
                <th className="py-2">Баланс кармы</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, idx) => (
                <tr key={leader.user_id} style={{ borderBottom: '1px solid var(--border-subtle)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="py-2 font-medium">{idx + 1}</td>
                  <td className="py-2">{leader.name}</td>
                  <td className="py-2 font-bold" style={{ color: 'var(--accent-gold)' }}>{leader.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
