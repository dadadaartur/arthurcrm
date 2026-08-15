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
    const { data: companyTasks } = await supabase
      .from('tasks')
      .select('id, title, company_id, reward_karma, description')
      .eq('company_id', compId)
    if (!companyTasks?.length) { setPendingReviews([]); return }
    const taskMap = {}
    companyTasks.forEach(t => { taskMap[t.id] = t })

    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, deadline_at, task_id, user_id')
      .eq('status', 'pending_review')
      .in('task_id', companyTasks.map(t => t.id))

    if (error || !data) { setPendingReviews([]); return }

    const userIds = [...new Set(data.map(i => i.user_id))]
    const nameMap = {}
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, first_name, last_name')
        .in('user_id', userIds)
      ;(profs || []).forEach(p => {
        nameMap[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ')
          || p.display_name || p.email || ''
      })
    }

    setPendingReviews(data.map(item => ({
      ...item,
      tasks: taskMap[item.task_id] || null,
      employee_name: nameMap[item.user_id] || ''
    })))
  }

  const handleReview = async (assignmentId, action) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
      },
      body: JSON.stringify({ assignmentId, action })
    })
    if (res.ok) {
      setSuccessModal({ show: true, message: action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено' })
      fetchPendingReviews(companyId)
    } else {
      const err = await res.json()
      setSuccessModal({ show: true, message: 'Ошибка: ' + (err.error || 'Неизвестная ошибка') })
    }
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner text="Загружаем задания…" /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/company-admin" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Задания на проверке</h1>
      </div>

      {pendingReviews.length === 0 ? (
        <div className="premium-card"><p className="text-gray-400">Нет заданий, ожидающих проверки</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingReviews.map(item => (
            <div key={item.id} className="premium-card flex flex-col gap-3">
              <div>
                <h4 className="text-white font-semibold">{item.tasks?.title || 'Задание удалено'}</h4>
                <p className="text-sm text-gray-400 mt-1">Сотрудник: {item.employee_name}</p>
                <p className="text-sm text-yellow-400">Награда: +{item.tasks?.reward_karma} кармиков</p>
                {item.comment && <p className="text-sm text-gray-400 mt-1">Комментарий: {item.comment}</p>}
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => handleReview(item.id, 'approve')} className="btn-glass btn-glass-green flex-1 text-xs px-3 py-2">Одобрить</button>
                <button onClick={() => handleReview(item.id, 'reject')} className="btn-glass btn-glass-red flex-1 text-xs px-3 py-2">Отклонить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}

export default withAuth(ReviewPage, { permission: 'can_review_tasks' })
