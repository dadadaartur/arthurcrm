import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import Layout from '../components/Layout'
import StarsBackground from '../components/StarsBackground'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [balance, setBalance] = useState(0)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProfileAndBalance = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from('profiles')
      .select('*, companies(name)')
      .eq('user_id', user.id)
      .single()

    if (prof) {
      setProfile(prof)
      const { data: bal } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (bal) setBalance(bal.balance)
    }
  }, [])

  const fetchAssignments = useCallback(async () => {
    const res = await fetch('/api/tasks/list')
    if (res.ok) {
      const data = await res.json()
      setAssignments(data || [])
    }
  }, [])

  useEffect(() => {
    fetchProfileAndBalance().then(() => fetchAssignments()).finally(() => setLoading(false))
  }, [fetchProfileAndBalance, fetchAssignments])

  const handleStart = async (assignmentId) => {
    await fetch('/api/tasks/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId })
    })
    fetchAssignments()
  }

  const handleComplete = async (assignmentId, comment = '') => {
    await fetch('/api/tasks/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, comment })
    })
    fetchAssignments()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="spinner" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <StarsBackground />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8">
          {/* Баланс */}
          <div className="flex flex-col items-center">
            <div className="balance-card relative">
              <div className="black-hole" />
              <div className="relative z-10 text-center pt-20 pb-8">
                <div className="balance-amount text-3xl font-bold mb-2" style={{ color: '#d4af37', textShadow: '0 0 12px rgba(249,115,22,0.8)' }}>
                  {balance}
                </div>
                <div className="text-sm uppercase tracking-widest" style={{ color: 'rgba(249,115,22,0.8)' }}>КАРМИКОВ</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
              <button onClick={() => router.push('/transfer')} className="action-btn">Перевести</button>
              <button onClick={() => router.push('/shop')} className="action-btn">Магазин</button>
              <button onClick={() => router.push('/history')} className="action-btn">Операции</button>
              <button onClick={() => router.push('/my-purchases')} className="action-btn">Мои покупки</button>
            </div>
          </div>

          {/* Задания */}
          <div className="flex flex-col gap-6 w-full max-w-md">
            <h2 className="text-xl font-bold tracking-wide" style={{ color: '#d4af37' }}>Задания</h2>
            {assignments.length === 0 ? (
              <div className="dash-card text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Нет активных заданий
              </div>
            ) : (
              assignments.map((ass) => (
                <div key={ass.id} className="dash-card relative flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 style={{ color: '#fff', marginBottom: 0 }}>{ass.tasks.title}</h3>
                    <span className="task-status-badge" style={{
                      background: ass.status === 'pending_review' ? 'rgba(192,132,252,0.4)' :
                                  ass.status === 'in_progress' ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.2)',
                      padding: '2px 10px',
                      borderRadius: '50px',
                      fontSize: '0.7rem',
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      {ass.status === 'assigned' && 'Новое'}
                      {ass.status === 'in_progress' && 'В работе'}
                      {ass.status === 'pending_review' && 'На проверке'}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{ass.tasks.description}</p>
                  <div className="flex justify-between items-center text-sm" style={{ color: 'rgba(249,115,22,0.9)' }}>
                    <span>+{ass.tasks.reward_karma} кармиков</span>
                    {ass.deadline_at && (
                      <span className="task-timer" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTimeLeft(new Date(ass.deadline_at))}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {ass.status === 'assigned' && (
                      <button onClick={() => handleStart(ass.id)} className="action-btn w-full">
                        Начать
                      </button>
                    )}
                    {ass.status === 'in_progress' && (
                      <button onClick={() => handleComplete(ass.id, prompt('Комментарий (необязательно)'))} className="action-btn w-full">
                        Завершить
                      </button>
                    )}
                    {ass.status === 'pending_review' && (
                      <div className="w-full text-center py-2" style={{ color: 'rgba(192,132,252,0.9)' }}>
                        Ожидает проверки
                      </div>
                    )}
                    <button onClick={() => router.push(`/task/${ass.id}`)} className="action-btn" style={{ minWidth: '60px' }}>
                      &gt;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function formatTimeLeft(deadline) {
  const now = new Date()
  const diff = deadline - now
  if (diff <= 0) return '00:00'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
