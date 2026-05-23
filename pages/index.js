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

function TaskIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="10" stroke="#A5B4FC" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="14" ry="4" stroke="#C4B5FD" strokeWidth="1" transform="rotate(-20 16 16)" />
      <path d="M12 13L15 16L12 19" stroke="#E0E7FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Проверяем наличие профиля
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, role_id')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        router.push('/login')
        return
      }

      setUser(user)

      // Баланс
      const { data: balanceData } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (balanceData) setBalance(balanceData.balance)

      // Все назначенные и активные задания (не завершённые)
      const { data: assignments, error: taskError } = await supabase
        .from('task_assignments')
        .select('*, tasks(*)')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })

      if (taskError) console.error('Ошибка загрузки заданий:', taskError)
      setTasks(assignments || [])
      setLoading(false)
    }
    checkAccess()
  }, [router])

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
                  {balance.toLocaleString()}
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

          {tasks.length > 0 && (
            <div className="mt-8 w-full max-w-[500px]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TaskIcon /> Доступные задания
              </h3>
              <div className="space-y-4">
                {tasks.map(assignment => (
                  <div
                    key={assignment.id}
                    onClick={() => router.push(`/task/${assignment.id}`)}
                    className="premium-card relative overflow-hidden cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #1E1B4B 0%, #1A1A2E 100%)',
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    <div className="relative z-10">
                      <h4 className="text-white font-semibold mb-2">{assignment.tasks.title}</h4>
                      <p className="text-gray-400 text-sm mb-2">{assignment.tasks.description?.slice(0, 100)}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-yellow-400">+{assignment.tasks.reward_karma} кармиков</span>
                        <span className="text-xs text-gray-500">
                          {assignment.status === 'in_progress' ? 'В процессе' : 'Назначено'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          <div className="dash-card"><h3>Задания</h3><p className="text-sm text-gray-400">Выполняй миссии и расти над собой</p></div>
          <div className="dash-card"><h3>Рейтинг</h3><p className="text-sm text-gray-400">Твоя позиция среди лучших</p></div>
          <div className="dash-card"><h3>Соревнования</h3><p className="text-sm text-gray-400">Докажи своё мастерство в битве</p></div>
          <div className="dash-card"><h3>Битва экспертов</h3><p className="text-sm text-gray-400">Всероссийский чемпионат профессионалов</p></div>
        </div>
      </div>
    </div>
  )
}
