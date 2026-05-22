import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../../components/Spinner'

export default function TaskDetail() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      // Загружаем назначение вместе с заданием
      const { data: assignData } = await supabase
        .from('task_assignments')
        .select('*, tasks(*)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!assignData) {
        router.push('/')
        return
      }

      setAssignment(assignData)
      setTask(assignData.tasks)
      setLoading(false)
    }
    init()
  }, [id, router])

  async function handleStart() {
    setActionLoading(true)
    await supabase.from('task_assignments').update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).eq('id', assignment.id)

    // Обновляем локальное состояние
    setAssignment(prev => ({ ...prev, status: 'in_progress', started_at: new Date().toISOString() }))
    setActionLoading(false)
  }

  async function handleSubmitForReview() {
    setActionLoading(true)
    // Для ручной проверки — просто переводим в статус 'pending_review'
    await supabase.from('task_assignments').update({
      status: 'pending_review',
    }).eq('id', assignment.id)

    setAssignment(prev => ({ ...prev, status: 'pending_review' }))
    setActionLoading(false)
    alert('Задание отправлено на проверку администратору')
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>
  if (!task) return <div className="text-center text-gray-400 py-8">Задание не найдено</div>

  const isManual = task.task_type === 'manual'
  const canStart = assignment.status === 'assigned'
  const canSubmit = assignment.status === 'in_progress' && isManual
  const isPending = assignment.status === 'pending_review'

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #1A1A2E 100%)', borderColor: 'rgba(139, 92, 246, 0.3)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)' }}>
        <h2 className="text-2xl font-bold text-white mb-4">{task.title}</h2>
        <p className="text-gray-300 mb-6">{task.description}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-xs text-gray-400">Награда</span>
            <p className="text-yellow-400 font-bold">{task.reward_karma} кармиков</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Энергия</span>
            <p className="text-blue-400 font-bold">{task.reward_energy}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Тип проверки</span>
            <p className="text-white">{isManual ? 'Ручная' : 'Автоматическая'}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Статус</span>
            <p className="text-white">
              {assignment.status === 'assigned' && 'Назначено'}
              {assignment.status === 'in_progress' && 'В процессе'}
              {assignment.status === 'pending_review' && 'На проверке'}
              {assignment.status === 'completed' && 'Выполнено'}
            </p>
          </div>
        </div>

        {canStart && (
          <button onClick={handleStart} disabled={actionLoading} className="btn-gold w-full">
            {actionLoading ? 'Запуск...' : 'Начать выполнение'}
          </button>
        )}

        {canSubmit && (
          <button onClick={handleSubmitForReview} disabled={actionLoading} className="btn-gold w-full">
            {actionLoading ? 'Отправка...' : 'Отправить на проверку'}
          </button>
        )}

        {isPending && (
          <div className="text-center text-yellow-400 font-semibold">Ожидает проверки администратором</div>
        )}

        {assignment.status === 'completed' && (
          <div className="text-center text-green-400 font-semibold">Задание выполнено!</div>
        )}
      </div>
    </div>
  )
}
