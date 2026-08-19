import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

function MediaIcon({ url }) {
  const isVideo = /\.(mp4|mov|webm|avi)$/i.test(url || '')
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url || '')
  if (isImage) return null
  return isVideo ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5" width="13" height="14" rx="2.5" stroke="#a0e9ff" strokeWidth="1.4" /><path d="M15.5 10.5L21 7v10l-5.5-3.5" stroke="#a0e9ff" strokeWidth="1.4" strokeLinejoin="round" /><path d="M7 9.5v5l4-2.5-4-2.5z" fill="#a0e9ff" /></svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 2.5h8l4 4v15H6v-19z" stroke="#c084fc" strokeWidth="1.4" strokeLinejoin="round" /><path d="M14 2.5v4h4" stroke="#c084fc" strokeWidth="1.4" /><path d="M9 12h6M9 15.5h6" stroke="#c084fc" strokeWidth="1.3" strokeLinecap="round" /></svg>
  )
}

function ReviewPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
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
    const { data: companyTasks } = await supabase
      .from('tasks').select('id, title, reward_karma, requires_proof, proof_type, description')
      .eq('company_id', compId)
    if (!companyTasks?.length) { setPendingReviews([]); return }
    const taskMap = Object.fromEntries(companyTasks.map(t => [t.id, t]))
    const taskIds = companyTasks.map(t => t.id)
    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, status, comment, proof_urls, started_at, task_id, user_id')
      .in('task_id', taskIds).eq('status', 'pending_review')
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
    setActionLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ assignmentId: selectedItem.id, action, comment: reviewComment })
    })
    setActionLoading(false)
    if (res.ok) {
      setSelectedItem(null); setReviewComment('')
      setSuccessModal({ show: true, message: action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено' })
      fetchPending(companyId)
    } else {
      const err = await res.json()
      setError('Ошибка: ' + (err.error || 'Неизвестная ошибка'))
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Задания на проверке" extra={
          pendingReviews.length > 0 ? (
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.5)', color: '#FFD700', boxShadow: '0 0 12px rgba(255,215,0,0.25)', animation: 'pulse 2s infinite' }}>
              {pendingReviews.length}
            </span>
          ) : null
        } />

        {pendingReviews.length === 0 ? (
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 60, textAlign: 'center', color: '#777' }}>Нет заданий, ожидающих проверки</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 14 }}>
            {pendingReviews.map(item => (
              <div key={item.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,215,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0 }}>{item.task?.title}</h4>
                    <p style={{ fontSize: 13, color: '#888', margin: '4px 0' }}>{item.employee_name}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#FFD700', margin: '4px 0' }}>+{item.task?.reward_karma} кармиков</p>
                    {item.comment && (
                      <div style={{ marginTop: 8, padding: 10, borderRadius: 10, fontSize: 13, color: '#ccc', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{item.comment}</div>
                    )}
                    {item.proof_urls?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Прикреплённые файлы:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {item.proof_urls.map((url, i) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', transition: 'transform .2s' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                {isImage
                                  ? <img src={url} alt="" style={{ width: 88, height: 88, objectFit: 'cover', display: 'block' }} />
                                  : <div style={{ width: 88, height: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10, color: '#888', background: 'rgba(255,255,255,0.05)' }}><MediaIcon url={url} /><span>Открыть</span></div>}
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {item.task?.requires_proof && !item.proof_urls?.length && (
                      <div style={{ marginTop: 8, fontSize: 11, padding: '4px 10px', borderRadius: 20, display: 'inline-block', background: 'rgba(244,67,54,0.1)', color: '#f87171' }}>Медиа-подтверждение не прикреплено</div>
                    )}
                  </div>
                  <button onClick={() => { setSelectedItem(item); setReviewComment(''); setError('') }} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Проверить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PremiumModal isOpen={!!selectedItem} onClose={() => !actionLoading && setSelectedItem(null)} title={selectedItem?.task?.title} showCloseButton={false}>
        {selectedItem && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ padding: 12, borderRadius: 12, fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
              <p style={{ color: '#888', margin: 0 }}>Сотрудник: <span style={{ color: '#fff' }}>{selectedItem.employee_name}</span></p>
              <p style={{ color: '#888', margin: '4px 0 0' }}>Награда: <span style={{ fontWeight: 700, color: '#FFD700' }}>+{selectedItem.task?.reward_karma} кармиков</span></p>
              {selectedItem.comment && <p style={{ color: '#888', margin: '4px 0 0' }}>Комментарий: <span style={{ color: '#fff' }}>{selectedItem.comment}</span></p>}
            </div>
            {selectedItem.task?.description && (
              <div style={{ padding: 12, borderRadius: 12, fontSize: 13, color: '#aaa', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14, whiteSpace: 'pre-wrap' }}>{selectedItem.task.description}</div>
            )}
            {selectedItem.proof_urls?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Подтверждение:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedItem.proof_urls.map((url, i) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                        {isImage
                          ? <img src={url} alt="" style={{ width: 104, height: 104, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: 104, height: 104, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10, color: '#888', background: 'rgba(255,255,255,0.05)' }}><MediaIcon url={url} /><span>Открыть</span></div>}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Комментарий к решению</label>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Необязательно — сотрудник получит его в уведомлении" className="input-field" style={{ width: '100%' }} rows={3} />
            {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => !actionLoading && setSelectedItem(null)} className="btn-outline" style={{ flex: 1 }} disabled={actionLoading}>Отмена</button>
              <button onClick={() => handleReview('reject')} disabled={actionLoading} style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171', cursor: 'pointer' }}>{actionLoading ? '…' : 'Отклонить'}</button>
              <button onClick={() => handleReview('approve')} disabled={actionLoading} style={{ ...ghostBtn, flex: 1, opacity: actionLoading ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{actionLoading ? '…' : 'Одобрить'}</button>
            </div>
          </div>
        )}
      </PremiumModal>
      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Готово">
        <p style={{ color: '#fff' }}>{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}
export default withAuth(ReviewPage, { permission: 'can_review_tasks' })
