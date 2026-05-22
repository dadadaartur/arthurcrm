import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'

function getKarmikWord(n) { /* ... как раньше ... */ }
function TaskIcon() { /* ... как раньше ... */ }

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedTasks, setExpandedTasks] = useState({})

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile) { router.push('/login'); return }

      setUser(user)

      const { data: balanceData } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (balanceData) setBalance(balanceData.balance)

      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('*, tasks(*)')
        .eq('user_id', user.id)
        .in('status', ['assigned', 'in_progress', 'pending_review'])
        .limit(3)
        .order('created_at', { ascending: false })

      setTasks(assignments || [])
      setLoading(false)
    }
    checkAccess()
  }, [router])

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const karmikWord = getKarmikWord(balance)
  const toggleTaskExpand = (id) => setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="flex flex-col items-start px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Левая колонка (баланс + кнопки) */}
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

          {/* Доступные задания (под балансом) */}
          {tasks.length > 0 && (
            <div className="mt-8 w-full max-w-[500px]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TaskIcon />
                Доступные задания
              </h3>
              <div className="space-y-4">
                {tasks.map(assignment => {
                  const task = assignment.tasks
                  const isExpanded = expandedTasks[task.id]
                  const longDescription = task.description && task.description.length > 100
                  const displayDescription = isExpanded || !longDescription
                    ? task.description
                    : task.description.slice(0, 100) + '...'

                  return (
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
                      {/* Кольца Сатурна (декор) */}
                      <div style={{
                        position: 'absolute',
                        top: -20, right: -20,
                        width: 80, height: 80,
                        borderRadius: '50%',
                        border: '1px solid rgba(192, 132, 252, 0.2)',
                        transform: 'rotate(-20deg)',
                        pointerEvents: 'none',
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: -30, right: -30,
                        width: 100, height: 100,
                        borderRadius: '50%',
                        border: '1px solid rgba(192, 132, 252, 0.1)',
                        transform: 'rotate(-20deg)',
                        pointerEvents: 'none',
                      }} />

                      <div className="relative z-10">
                        <h4 className="text-white font-semibold mb-2">{task.title}</h4>
                        {task.description && (
                          <p className="text-gray-400 text-sm mb-2">{displayDescription}</p>
                        )}
                        {longDescription && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task.id) }}
                            className="text-xs text-purple-400 hover:text-purple-300 transition mb-2"
                          >
                            {isExpanded ? 'Свернуть' : 'Смотреть'}
                          </button>
                        )}
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex gap-3">
                            <span className="text-xs text-yellow-400">+{task.reward_karma} кармиков</span>
                            {task.reward_energy > 0 && (
                              <span className="text-xs text-blue-400">+{task.reward_energy} энергии</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {assignment.status === 'in_progress' ? 'В процессе' : assignment.status === 'pending_review' ? 'На проверке' : 'Назначено'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка (разделы) */}
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
