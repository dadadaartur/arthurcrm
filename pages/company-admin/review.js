import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'

function ReviewPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!data) { router.push('/'); return }
      setCompanyId(data.company_id)
      await fetchPending(data.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const fetchPending = async (compId) => {
    // Получаем задания своей компании
    const { data: companyTasks } = await supabase
      .from('tasks').select('id, title, reward_karma, requires_proof, proof_type')
      .eq('company_id', compId)

    if (!companyTasks?.length) { setPendingReviews([]); return }
    const taskMap = Object.fromEntries(companyTasks.map(t => [t.id, t]))
    const taskIds = companyTasks.map(t => t.id)

    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, status, comment, proof_urls, started_at, task_id, user_id')
      .in('task_id', taskIds)
      .eq('status', 'pending_review')
      .order('started_at', { ascending: false })

    if (!error && data) {
      const enriched = await Promise.all(data.map(async item => {
        const { data: p } = await supabase.from('profiles')
          .select('email, display_name, first_name, last_name')
          .eq('user_id', item.user_id).single()
        return {
          ...item,
          task: taskMap[item.task_id],
          employee_name: p ? ([p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email) : 'Сотрудник',
          employee_email: p?.email || ''
        }
      }))
      setPendingReviews(enriched)
    } else setPendingReviews([])
  }

  const handleReview = async (action) => {
    if (!selectedItem) return
    setActionLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
      },
      body: JSON.stringify({ assignmentId: selectedItem.id, action, comment: reviewComment })
    })
    setActionLoading(false)
    if (res.ok) {
      setSelectedItem(null)
      setReviewComment('')
      setSuccessModal({ show: true, message: action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено' })
      fetchPending(companyId)
    } else {
      const err = await res.json()
      alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'))
    }
  }

  const openReview = (item) => {
    setSelectedItem(item)
    setReviewComment('')
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Задания на проверке</h1>
        {pendingReviews.length > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-bold animate-pulse"
            style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316', border: '1px solid rgba(249,115,22,0.4)' }}>
            {pendingReviews.length}
          </span>
        )}
      </div>

      {pendingReviews.length === 0 ? (
        <div className="premium-card text-center py-12">
          <p className="text-gray-400">Нет заданий, ожидающих проверки</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingReviews.map(item => (
            <div key={item.id} className="premium-card"
              style={{ borderColor: 'rgba(249,115,22,0.3)' }}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-lg">{item.task?.title}</h4>
                  <p className="text-sm text-gray-400">{item.employee_name}</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: '#FFD700' }}>
                    +{item.task?.reward_karma} кармиков
                  </p>
                  {item.comment && (
                    <div className="mt-2 p-3 rounded-lg text-sm text-gray-300"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {item.comment}
                    </div>
                  )}

                  {/* Медиафайлы */}
                  {item.proof_urls?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-2">Прикреплённые файлы:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.proof_urls.map((url, i) => {
                          const isVideo = url.match(/\.(mp4|mov|webm|avi)$/i)
                          const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="block rounded-lg overflow-hidden transition-transform hover:scale-105"
                              style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                              {isImage
                                ? <img src={url} alt="" className="w-24 h-24 object-cover" />
                                : <div className="w-24 h-24 flex flex-col items-center justify-center gap-1 text-xs text-gray-400"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <span className="text-3xl">{isVideo ? '🎬' : '📎'}</span>
                                    <span>Открыть</span>
                                  </div>
                              }
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {item.task?.requires_proof && (!item.proof_urls?.length) && (
                    <div className="mt-2 text-xs px-3 py-1 rounded-full inline-block"
                      style={{ background: 'rgba(244,67,54,0.1)', color: '#f87171' }}>
                      Медиа-подтверждение не прикреплено
                    </div>
                  )}
                </div>

                <button onClick={() => openReview(item)} className="btn-gold text-sm px-4 py-2 flex-shrink-0">
                  Проверить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка проверки */}
      <PremiumModal isOpen={!!selectedItem} onClose={() => !actionLoading && setSelectedItem(null)}
        title={selectedItem?.task?.title} showCloseButton={false}>
        {selectedItem && (
          <div className="text-left space-y-4">
            <div className="p-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-gray-400">Сотрудник: <span className="text-white">{selectedItem.employee_name}</span></p>
              <p className="text-gray-400">Награда: <span className="font-bold" style={{ color: '#FFD700' }}>+{selectedItem.task?.reward_karma} кармиков</span></p>
              {selectedItem.comment && <p className="text-gray-400 mt-1">Комментарий: <span className="text-white">{selectedItem.comment}</span></p>}
            </div>

            {/* Медиа в модалке */}
            {selectedItem.proof_urls?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Подтверждение:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.proof_urls.map((url, i) => {
                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                    const isVideo = url.match(/\.(mp4|mov|webm|avi)$/i)
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                        {isImage
                          ? <img src={url} alt="" className="w-28 h-28 object-cover" />
                          : <div className="w-28 h-28 flex flex-col items-center justify-center gap-1 text-xs text-gray-400"
                              style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <span className="text-3xl">{isVideo ? '🎬' : '📎'}</span>
                              <span>Открыть</span>
                            </div>
                        }
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400 block mb-1">Комментарий к решению</label>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder="Необязательно — сотрудник получит его в уведомлении"
                className="input-field w-full" rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => !actionLoading && setSelectedItem(null)}
                className="btn-outline flex-1" disabled={actionLoading}>Отмена</button>
              <button onClick={() => handleReview('reject')} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{ background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171' }}>
                {actionLoading ? '...' : 'Отклонить'}
              </button>
              <button onClick={() => handleReview('approve')} disabled={actionLoading}
                className="btn-gold flex-1">
                {actionLoading ? '...' : 'Одобрить'}
              </button>
            </div>
          </div>
        )}
      </PremiumModal>

      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Готово">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}

export default withAuth(ReviewPage, { permission: 'can_review_tasks' })
