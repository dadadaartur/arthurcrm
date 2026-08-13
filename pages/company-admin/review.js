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
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
      if (!data) { router.push('/'); return }
      setCompanyId(data.company_id)
      await fetchPendingReviews(data.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const fetchPendingReviews = async (compId) => {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, deadline_at, task_id, user_id, tasks!inner( id, title, company_id, reward_karma )')
      .eq('status', 'pending_review')
      .eq('tasks.company_id', compId)

    if (!error && data) {
      const enriched = await Promise.all(data.map(async (item) => {
        const { data: profileData } = await supabase.from('profiles').select('email, display_name').eq('user_id', item.user_id).single()
        return { ...item, employee_email: profileData?.email || '', employee_name: profileData?.display_name || '' }
      }))
      setPendingReviews(enriched)
    } else setPendingReviews([])
  }

  const handleReview = async (assignmentId, action) => {
    const res = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, action })
    })
    if (res.ok) {
      setSuccessModal({ show: true, message: action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено' })
      fetchPendingReviews(companyId)
    } else {
      const err = await res.json()
      alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'))
    }
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Задания на проверке</h1>
      <div className="dash-card">
        {pendingReviews.length === 0 ? (
          <p className="text-gray-400">Нет заданий, ожидающих проверки</p>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map(item => (
              <div key={item.id} className="premium-card flex justify-between items-center">
                <div>
                  <h4 className="text-white font-semibold">{item.tasks.title}</h4>
                  <p className="text-sm text-gray-400">Сотрудник: {item.employee_name || item.employee_email}</p>
                  <p className="text-sm text-yellow-400">Награда: + {item.tasks.reward_karma} кармиков</p>
                  {item.comment && <p className="text-sm text-gray-400 mt-1">Комментарий: {item.comment}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReview(item.id, 'approve')} className="btn-gold text-xs px-3 py-1.5">Одобрить</button>
                  <button onClick={() => handleReview(item.id, 'reject')} className="btn-outline text-xs px-3 py-1.5">Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}

export default withAuth(ReviewPage, { permission: 'can_review_tasks' })
