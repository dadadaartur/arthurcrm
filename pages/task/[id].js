import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'

export default function TaskDetail() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitModal, setSubmitModal] = useState({ show: false, comment: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      if (id) {
        const { data } = await supabase
          .from('task_assignments')
          .select('id, status, started_at, deadline_at, task_id, tasks( id, title, description, reward_karma, icon, requires_review, deadline_hours )')
          .eq('id', id)
          .single()
        setAssignment(data)
      }
      setLoading(false)
    }
    init()
  }, [id])

  const handleStart = async () => {
    if (!assignment) return
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', assignment.id)
    if (!error) setAssignment({ ...assignment, status: 'in_progress' })
  }

  const handleSubmit = async () => {
    if (!assignment || !user) return
    setSubmitting(true)
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: 'pending_review', comment: submitModal.comment, completed_at: new Date().toISOString() })
      .eq('id', assignment.id)
      .eq('user_id', user.id)

    if (!error) {
      setSubmitModal({ show: false, comment: '' })
      setAssignment({ ...assignment, status: 'pending_review' })
    } else {
      alert('Ошибка отправки')
    }
    setSubmitting(false)
  }

  if (loading || !assignment) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const t = assignment.tasks

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button onClick={() => router.push('/tasks')} className="text-[var(--lumen-ink-soft)] hover:text-[var(--lumen-ink)] mb-6 text-sm">← Назад к заданиям</button>

      <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{t.icon || '📋'}</span>
          <h1 className="text-2xl font-bold text-[var(--lumen-ink)]">{t.title}</h1>
        </div>

        <p className="text-[var(--lumen-ink-soft)] mb-4">{t.description}</p>

        <div className="flex flex-wrap gap-4 text-sm mb-6">
          <div className="flex items-center gap-1">
            <span className="text-[var(--lumen-ink-soft)]">Награда:</span>
            <span className="text-yellow-400 font-semibold">+{t.reward_karma} кармиков</span>
          </div>
          {assignment.deadline_at && (
            <div className="flex items-center gap-1">
              <span className="text-[var(--lumen-ink-soft)]">Дедлайн:</span>
              <span className="text-[var(--lumen-ink)]">{new Date(assignment.deadline_at).toLocaleString('ru')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-[var(--lumen-ink-soft)]">Статус:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            assignment.status === 'pending_review' ? 'bg-purple-900 text-purple-300' :
            assignment.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
            'bg-[var(--lumen-surface-2)] text-[var(--lumen-ink-soft)]'
          }`}>
            {assignment.status === 'assigned' && 'Новое'}
            {assignment.status === 'in_progress' && 'В работе'}
            {assignment.status === 'pending_review' && 'На проверке'}
            {assignment.status === 'completed' && 'Выполнено'}
            {assignment.status === 'rejected' && 'Отклонено'}
          </span>
        </div>

        {assignment.status === 'assigned' && (
          <button onClick={handleStart} className="btn-lumen w-full">Начать задание</button>
        )}

        {assignment.status === 'in_progress' && (
          <button onClick={() => setSubmitModal({ show: true, comment: '' })} className="btn-lumen w-full">
            Отправить на проверку
          </button>
        )}

        {assignment.status === 'pending_review' && (
          <div className="text-center text-purple-300 py-2">Ожидает проверки руководителем</div>
        )}

        {(assignment.status === 'completed' || assignment.status === 'rejected') && (
          <div className={`text-center py-2 rounded ${assignment.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {assignment.status === 'completed' ? '✅ Задание выполнено' : '❌ Задание отклонено'}
            {assignment.comment && <p className="text-sm mt-1 text-[var(--lumen-ink-soft)]">Комментарий: {assignment.comment}</p>}
          </div>
        )}
      </div>

      {/* Модальное окно для комментария */}
      <PremiumModal
        isOpen={submitModal.show}
        onClose={() => setSubmitModal({ show: false, comment: '' })}
        title="Отправить на проверку"
      >
        <textarea
          className="input-field"
          placeholder="Введите комментарий (номер заказа, результат)"
          value={submitModal.comment}
          onChange={e => setSubmitModal({ ...submitModal, comment: e.target.value })}
          rows={3}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setSubmitModal({ show: false })} className="btn-outline">Отмена</button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-lumen">
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </PremiumModal>
    </div>
  )
}
