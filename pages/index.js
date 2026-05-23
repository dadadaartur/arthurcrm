import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'

function getKarmikWord(n) { /* ... */ }
function TaskIcon() { /* ... */ }

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

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

      // Загружаем все назначения, кроме завершённых
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('*, tasks(*)')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })

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
            {/* ... баланс ... */}
          </div>

          {tasks.length > 0 && (
            <div className="mt-8 w-full max-w-[500px]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TaskIcon />
                Доступные задания
              </h3>
              <div className="space-y-4">
                {tasks.map(assignment => {
                  const task = assignment.tasks
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
                      <div className="relative z-10">
                        <h4 className="text-white font-semibold mb-2">{task.title}</h4>
                        <p className="text-gray-400 text-sm mb-2">{task.description?.slice(0, 100)}</p>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xs text-yellow-400">+{task.reward_karma} кармиков</span>
                          <span className="text-xs text-gray-500">
                            {assignment.status === 'in_progress' ? 'В процессе' : 'Назначено'}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          {/* ... разделы ... */}
        </div>
      </div>
    </div>
  )
}
