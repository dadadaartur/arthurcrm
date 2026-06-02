import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'
import PremiumModal from '../components/PremiumModal'

function getKarmikWord(n) { /* без изменений */ }
function formatTimeLeft(deadline) { /* без изменений */ }

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // Состояния для модалки отправки
  const [submitModal, setSubmitModal] = useState({ show: false, assignmentId: null, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [resultModal, setResultModal] = useState({ show: false, message: '', isError: false })

  const fetchTasks = async (userId) => {
    if (!userId) return
    const { data: assignments, error } = await supabase
      .from('task_assignments')
      .select('id, status, started_at, deadline_at, task_id')
      .eq('user_id', userId)
      .in('status', ['assigned', 'in_progress', 'pending_review'])
      .limit(5)

    if (error) { setTasks([]); return }
    if (!assignments?.length) { setTasks([]); return }

    const taskIds = [...new Set(assignments.map(a => a.task_id))]
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, title, description, reward_karma, task_type, deadline_hours, requires_review, is_auto')
      .in('id', taskIds)

    const merged = assignments
      .filter(a => tasksData?.some(t => t.id === a.task_id))
      .map(a => ({ ...a, tasks: tasksData.find(t => t.id === a.task_id) }))

    setTasks(merged)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      await fetchTasks(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const handleStart = async (assignmentId) => {
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', assignmentId)
    if (!error && user) fetchTasks(user.id)
  }

  const openSubmitModal = (assignmentId) => {
    setSubmitModal({ show: true, assignmentId, comment: '' })
  }

  const handleSubmit = async () => {
    if (!user || !submitModal.assignmentId) return
    setSubmitting(true)
    // Прямое обновление статуса на pending_review с комментарием
    const { error } = await supabase
      .from('task_assignments')
      .update({
        status: 'pending_review',
        comment: submitModal.comment,
        completed_at: new Date().toISOString()
      })
      .eq('id', submitModal.assignmentId)
      .eq('user_id', user.id)  // безопасность: только своё

    if (error) {
      setResultModal({ show: true, message: 'Ошибка отправки: ' + error.message, isError: true })
    } else {
      setSubmitModal({ show: false, assignmentId: null, comment: '' })
      fetchTasks(user.id)
      setResultModal({ show: true, message: 'Задание отправлено на проверку', isError: false })
    }
    setSubmitting(false)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const karmikWord = getKarmikWord(balance)

  return (
    <div className="flex flex-col items-start px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Левая колонка: баланс + кнопки */}
        <div className="flex flex-col items-start">
          <div className="balance-card">
            {/* ... (без изменений) */}
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

        {/* Правая колонка: задания */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-4">Задания</h3>
          {tasks.length === 0 ? (
            <p className="text-gray-400 text-sm">Нет активных заданий</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tasks.map(assignment => {
                const t = assignment.tasks
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
                          <button onClick={() => openSubmitModal(assignment.id)} className="action-btn w-full text-xs py-1.5">
                            Отправить на проверку
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

      {/* Модальное окно для комментария */}
      {submitModal.show && (
        <div className="modal-overlay" onClick={() => setSubmitModal({ show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-gold">Отправить на проверку</h3>
            <textarea
              className="input-field"
              placeholder="Введите комментарий (номер заказа, результат)"
              value={submitModal.comment}
              onChange={e => setSubmitModal({ ...submitModal, comment: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setSubmitModal({ show: false })} className="btn-outline">Отмена</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-gold">
                {submitting ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Премиум-уведомление об успехе/ошибке */}
      <PremiumModal
        isOpen={resultModal.show}
        onClose={() => setResultModal({ show: false, message: '' })}
        title={resultModal.isError ? 'Ошибка' : 'Успешно'}
      >
        <p className="text-white">{resultModal.message}</p>
      </PremiumModal>
    </div>
  )
}
