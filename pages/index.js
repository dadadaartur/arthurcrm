import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [stats, setStats] = useState({ active: 0, completed: 0, earned: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)

      const { data: active } = await supabase
        .from('task_assignments')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['assigned', 'in_progress', 'pending_review'])

      const { data: completed } = await supabase
        .from('task_assignments')
        .select('status, tasks(reward_karma)')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const earned = completed?.reduce((sum, a) => sum + (a.tasks?.reward_karma || 0), 0) || 0

      setStats({ active: active?.length || 0, completed: completed?.length || 0, earned })
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const karmikWord = getKarmikWord(balance)

  return (
    <div className="flex flex-col items-start px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        <div className="flex flex-col items-start">
          <div className="balance-card">
            <div style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="black-hole" />
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div className="text-sm font-bold text-yellow-500 mb-2">Баланс</div>
                <div className="text-5xl font-extrabold text-yellow-400 mb-2" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: 'linear-gradient(180deg, #FFD700, #C5A04E)' }}>
                  {balance}
                </div>
                <div className="text-sm font-bold text-yellow-500">{karmikWord}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => router.push('/transfer')} className="action-btn">Перевести</button>
              <button onClick={() => router.push('/shop')} className="action-btn">Магазин</button>
              <button onClick={() => router.push('/history')} className="action-btn">Операции</button>
              <button onClick={() => router.push('/my-purchases')} className="wide-btn">Мои покупки</button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">Задания</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center"><p className="text-gray-400 text-sm">В работе</p><p className="text-2xl font-bold text-white">{stats.active}</p></div>
              <div className="text-center"><p className="text-gray-400 text-sm">Выполнено</p><p className="text-2xl font-bold text-green-400">{stats.completed}</p></div>
              <div className="text-center"><p className="text-gray-400 text-sm">Заработано</p><p className="text-2xl font-bold text-yellow-400">+{stats.earned}</p></div>
            </div>
            <div className="flex justify-center">
              <button onClick={() => router.push('/tasks')} className="action-btn text-sm px-6 py-2">
                Перейти к заданиям
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="dash-card"><h3>Рейтинг</h3><p className="text-sm text-gray-400">Твоя позиция среди лучших</p></div>
            <div className="dash-card"><h3>Соревнования</h3><p className="text-sm text-gray-400">Докажи своё мастерство в битве</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
