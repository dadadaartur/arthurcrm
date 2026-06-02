import { useEffect, useState } from 'react'
import { supabase, getAccessToken } from '../lib/supabaseClient'
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

function formatTimeLeft(deadline) {
  if (!deadline) return ''
  const now = new Date()
  const diff = new Date(deadline) - now
  if (diff <= 0) return '00:00'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    const token = await getAccessToken()
    if (!token) return
    const res = await fetch('/api/tasks/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(data)
    } else {
      console.error('Ошибка API:', res.status)
      setTasks([])
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: balanceData } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (balanceData) setBalance(balanceData.balance)

      await fetchTasks()
      setLoading(false)
    }
    init()
  }, [])

  const handleStart = async (assignmentId) => {
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', assignmentId)
    if (!error) fetchTasks()
  }

  const handleComplete = async (assignmentId) => {
    if (!user) return
    const { data: assignment } = await supabase
      .from('task_assignments')
      .select('id, task_id')
      .eq('id', assignmentId)
      .single()
    if (!assignment) return

    const { data: task } = await supabase
      .from('tasks')
      .select('requires_review, reward_karma')
      .eq('id', assignment.task_id)
      .single()

    const newStatus = task?.requires_review ? 'pending_review' : 'completed'
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: newStatus, completed_at: new Date().toISOString() })
      .eq('id', assignmentId)

    if (!error && newStatus === 'completed') {
      const reward = task?.reward_karma || 0
      if (reward > 0) {
        await supabase.from('karma_transactions').insert({
          user_id: user.id,
          amount: reward,
          type: 'task_reward',
          description: 'Начисление за задание'
        })
        const { data: balData } = await supabase
          .from('karma_balance')
          .select('balance')
          .eq('user_id', user.id)
          .single()
        if (balData) {
          await supabase
            .from('karma_balance')
            .update({ balance: balData.balance + reward })
            .eq('user_id', user.id)
        }
        const { data: newBal } = await supabase
          .from('karma_balance')
          .select('balance')
          .eq('user_id', user.id)
          .single()
        if (newBal) setBalance(newBal.balance)
      }
    }
    if (!error) fetchTasks()
  }

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
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-4">Задания</h3>
          {tasks.length === 0 ? (
            <p className="text-gray-400 text-sm">Нет активных заданий. Администратор скоро их назначит.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tasks.map(assignment => {
                const t = assignment.tasks
                if (!t) return null
                return (
                  <div key={assignment.id} className="premium-card relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #1E1B4B 0%, #1A1A2E 100%)',
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-semibold">{t.title}</h4>
                        <span className="text-xs px-2 py-1 rounded-full" style={{
                          background:
                            assignment.status === 'pending_review' ? 'rgba(192,132,252,0.3)' :
                            assignment.status === 'in_progress' ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.1)',
                          color: '#fff'
                        }}>
                          {assignment.status === 'assigned' && 'Новое'}
                          {assignment.status === 'in_progress' && 'В работе'}
                          {assignment.status === 'pending_review' && 'На проверке'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{t.description?.slice(0, 100)}</p>
                      <div className="flex justify-between items-center text-xs mb-3">
                        <span className="text-yellow-400">+{t.reward_karma} кармиков</span>
                        {assignment.deadline_at && (
                          <span className="text-gray-500 font-mono">{formatTimeLeft(assignment.deadline_at)}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {assignment.status === 'assigned' && (
                          <button onClick={() => handleStart(assignment.id)} className="action-btn w-full text-xs py-1.5">
                            Начать
                          </button>
                        )}
                        {assignment.status === 'in_progress' && (
                          <button onClick={() => handleComplete(assignment.id)} className="action-btn w-full text-xs py-1.5">
                            {t.requires_review ? 'Отправить на проверку' : 'Завершить'}
                          </button>
                        )}
                        {assignment.status === 'pending_review' && (
                          <div className="w-full text-center text-xs py-1.5" style={{ color: 'rgba(192,132,252,0.9)' }}>
                            Ожидает проверки
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
