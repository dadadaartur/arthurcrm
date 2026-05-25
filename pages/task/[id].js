import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TaskDetail() {
  const router = useRouter()
  const { id } = router.query
  const [assignment, setAssignment] = useState(null)
  const [comment, setComment] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    fetchAssignment()
  }, [id])

  const fetchAssignment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, status, started_at, completed_at, deadline_at, comment, review_comment, reward_karma, tasks ( id, title, description, reward_karma, task_type, deadline_hours, requires_review )')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      setError('Задание не найдено')
      return
    }
    setAssignment(data)
    if (data.deadline_at) updateTimer(data.deadline_at)
  }

  const updateTimer = (deadline) => {
    const calc = () => {
      const diff = new Date(deadline) - new Date()
      if (diff <= 0) {
        setTimeLeft('00:00')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
    calc()
    const interval = setInterval(() => {
      calc()
      if (new Date(deadline) - new Date() <= 0) clearInterval(interval)
    }, 60000)
    return () => clearInterval(interval)
  }

  const handleStart = async () => {
    const res = await fetch('/api/tasks/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: id })
    })
    if (res.ok) fetchAssignment()
  }

  const handleComplete = async () => {
    const res = await fetch('/api/tasks/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: id, comment })
    })
    if (res.ok) {
      setComment('')
      fetchAssignment()
    }
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {error}
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 flex flex-col items-center">
      <div className="dash-card max-w-lg w-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#fff' }}>{assignment.tasks.title}</h2>
          <span className="task-status-badge" style={{
            background: assignment.status === 'pending_review' ? 'rgba(192,132,252,0.4)' :
                        assignment.status === 'in_progress' ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.2)',
            padding: '4px 12px',
            borderRadius: '50px',
            fontSize: '0.75rem',
            color: '#fff',
            textTransform: 'uppercase'
          }}>
            {assignment.status === 'assigned' && 'Новое'}
            {assignment.status === 'in_progress' && 'В работе'}
            {assignment.status === 'pending_review' && 'На проверке'}
            {assignment.status === 'completed' && 'Выполнено'}
          </span>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.8)' }}>{assignment.tasks.description}</p>

        <div className="flex justify-between items-center mt-4" style={{ color: 'rgba(249,115,22,0.9)' }}>
          <span className="font-bold">+{assignment.tasks.reward_karma} кармиков</span>
          {timeLeft && (
            <span className="task-timer" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 'bold', fontSize: '1.1rem' }}>
              {timeLeft}
            </span>
          )}
        </div>

        {assignment.tasks.deadline_hours && (
          <div className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Срок выполнения: {assignment.tasks.deadline_hours} ч.
          </div>
        )}

        {assignment.review_comment && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Комментарий проверяющего:</p>
            <p style={{ color: '#fff' }}>{assignment.review_comment}</p>
          </div>
        )}

        <div className="mt-6">
          {assignment.status === 'assigned' && (
            <button onClick={handleStart} className="action-btn w-full">Начать выполнение</button>
          )}
          {assignment.status === 'in_progress' && (
            <div className="flex flex-col gap-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ссылка на результат или комментарий"
                className="input-field"
                style={{ resize: 'vertical', height: '80px' }}
              />
              <button onClick={handleComplete} className="action-btn w-full">Отправить на проверку</button>
            </div>
          )}
          {assignment.status === 'pending_review' && (
            <div className="text-center py-2" style={{ color: 'rgba(192,132,252,0.9)' }}>
              Задание отправлено на проверку руководителю
            </div>
          )}
          {assignment.status === 'completed' && (
            <div className="text-center py-2" style={{ color: 'rgba(249,115,22,0.9)' }}>
              Задание выполнено! Кармики начислены.
            </div>
          )}
        </div>

        <button onClick={() => router.push('/')} className="action-btn w-full mt-4" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          Назад
        </button>
      </div>
    </div>
  )
}
