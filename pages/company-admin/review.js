import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = {
  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12,
  padding: '10px 22px', color: '#fff', cursor: 'pointer', fontSize: 13,
  transition: 'all .25s', letterSpacing: 0.3
}
const hoverOn = e => {
  e.currentTarget.style.borderColor = '#FFD700'
  e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
const hoverOff = e => {
  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'
  e.currentTarget.style.boxShadow = 'none'
  e.currentTarget.style.transform = 'translateY(0)'
}

const pillTab = a => ({
  padding: '8px 18px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
  color: a ? '#FFD700' : '#aaa', fontWeight: a ? 700 : 400,
  transition: 'all 0.2s', whiteSpace: 'nowrap'
})

const proofTypeLabel = (url) => {
  const isVideo = url.match(/\.(mp4|mov|webm|avi)$/i)
  return isVideo ? 'ВИДЕО' : 'ФАЙЛ'
}

function ReviewPage() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [pendingReviews, setPendingReviews] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending') // pending | history
  const [selectedItem, setSelectedItem] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!data) { router.push('/'); return }
      setCompanyId(data.company_id)
      await fetchPending(data.company_id)
      await fetchHistory(data.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const fetchPending = async (compId) => {
    const { data: companyTasks } = await supabase
      .from('tasks').select('id, title, reward_karma, requires_proof, proof_type')
      .eq('company_id', compId)
    if (!companyTasks?.length) { setPendingReviews([]); return }
    const taskMap = Object.fromEntries(companyTasks.map(t => [t.id, t]))
    const taskIds = companyTasks.map(t => t.id)
    const { data } = await supabase
      .from('task_assignments')
      .select('id, status, comment, proof_urls, started_at, task_id, user_id')
      .in('task_id', taskIds).eq('status', 'pending_review')
      .order('started_at', { ascending: false })
    if (!data) { setPendingReviews([]); return }
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
  }

  const fetchHistory = async (compId) => {
    const { data: companyTasks } = await supabase
      .from('tasks').select('id, title, reward_karma').eq('company_id', compId)
    if (!companyTasks?.length) { setHistory([]); return }
    const taskMap = Object.fromEntries(companyTasks.map(t => [t.id, t]))
    const taskIds = companyTasks.map(t => t.id)
    const { data } = await supabase
      .from('task_assignments')
      .select('id, status, comment, proof_urls, completed_at, reviewed_at, task_id, user_id')
      .in('task_id', taskIds).in('status', ['completed', 'rejected'])
      .order('completed_at', { ascending: false }).limit(200)
    if (!data) { setHistory([]); return }
    const enriched = await Promise.all(data.map(async item => {
      const { data: p } = await supabase.from('profiles')
        .select('email, display_name, first_name, last_name')
        .eq('user_id', item.user_id).single()
      return {
        ...item,
        task: taskMap[item.task_id],
        employee_name: p ? ([p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email) : 'Сотрудник',
      }
    }))
    setHistory(enriched)
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
      setSelectedItem(null); setReviewComment('')
      showSuccess(action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено')
      fetchPending(companyId); fetchHistory(companyId)
    } else {
      const err = await res.json()
      showError('Ошибка: ' + (err.error || 'Неизвестная ошибка'))
    }
  }

  const openReview = (item) => { setSelectedItem(item); setReviewComment('') }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Задания на проверке" extra={
          pendingReviews.length > 0 && (
            <div style={{
              marginLeft: 'auto', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', color: '#f97316',
              animation: 'pulse 2s infinite', whiteSpace: 'nowrap'
            }}>
              {pendingReviews.length} ожидают
            </div>
          )
        } />

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setTab('pending')} style={pillTab(tab === 'pending')}>
            На проверке {pendingReviews.length > 0 && `· ${pendingReviews.length}`}
          </button>
          <button onClick={() => setTab('history')} style={pillTab(tab === 'history')}>
            История решений {history.length > 0 && `· ${history.length}`}
          </button>
        </div>

        {tab === 'pending' && (
          <>
            {pendingReviews.length === 0 ? (
              <div style={{
                background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60,
                textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>Все задания проверены</div>
                <div style={{ fontSize: 12, color: '#666' }}>Новые отправки появятся здесь автоматически</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingReviews.map((item, i) => (
                  <div key={item.id} style={{
                    background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)',
                    borderRadius: 16, padding: 20, border: '1px solid rgba(249,115,22,0.3)',
                    opacity: 0, animation: `fadeUp 0.5s ${i * 0.04}s ease-out forwards`,
                    transition: 'border-color 0.25s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{item.task?.title}</div>
                        <div style={{ color: '#aaa', fontSize: 13 }}>{item.employee_name}</div>
                        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>+{item.task?.reward_karma} кармиков</span>
                          {item.started_at && (
                            <span style={{ fontSize: 12, color: '#888' }}>
                              отправлено {new Date(item.started_at).toLocaleString('ru')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => openReview(item)} style={ghostBtn}
                        onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                        Проверить
                      </button>
                    </div>
                    {item.comment && (
                      <div style={{
                        marginTop: 14, padding: 12, borderRadius: 10, fontSize: 13, color: '#ccc',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        Комментарий сотрудника: <span style={{ color: '#fff' }}>{item.comment}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {history.length === 0 ? (
              <div style={{
                background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60,
                textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                Нет проверенных заданий
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((item, i) => (
                  <div key={item.id} style={{
                    background: 'rgba(15,20,35,0.7)', borderRadius: 12, padding: 14,
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 14, alignItems: 'center',
                    opacity: 0, animation: `fadeUp 0.4s ${i * 0.02}s ease-out forwards`
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.task?.title}</div>
                      <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{item.employee_name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {item.completed_at && new Date(item.completed_at).toLocaleDateString('ru')}
                    </div>
                    <div>
                      <span style={{
                        fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 600,
                        background: item.status === 'completed' ? 'rgba(74,222,128,0.15)' : 'rgba(244,67,54,0.15)',
                        color: item.status === 'completed' ? '#4ade80' : '#f87171',
                        border: `1px solid ${item.status === 'completed' ? 'rgba(74,222,128,0.4)' : 'rgba(244,67,54,0.4)'}`
                      }}>
                        {item.status === 'completed' ? 'Одобрено' : 'Отклонено'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#FFD700', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      +{item.task?.reward_karma}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Модалка проверки */}
        <PremiumModal isOpen={!!selectedItem} onClose={() => !actionLoading && setSelectedItem(null)}
          title={selectedItem?.task?.title} showCloseButton={false}>
          {selectedItem && (
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: 16, borderRadius: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Сотрудник</div>
                    <div style={{ color: '#fff', fontWeight: 500 }}>{selectedItem.employee_name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{selectedItem.employee_email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Награда</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>+{selectedItem.task?.reward_karma}</div>
                  </div>
                </div>
                {selectedItem.comment && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Комментарий сотрудника</div>
                    <div style={{ fontSize: 13, color: '#fff' }}>{selectedItem.comment}</div>
                  </div>
                )}
              </div>

              {/* Медиа в модалке — без эмодзи */}
              {selectedItem.proof_urls?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Подтверждение</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedItem.proof_urls.map((url, i) => {
                      const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                      const isVideo = url.match(/\.(mp4|mov|webm|avi)$/i)
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'block', borderRadius: 12, overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.15)',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                          {isImage ? (
                            <img src={url} alt="" style={{ width: 130, height: 130, objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{
                              width: 130, height: 130, display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: 6,
                              background: 'rgba(255,255,255,0.04)', color: '#aaa'
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#a0e9ff' }}>
                                {proofTypeLabel(url)}
                              </span>
                              <span style={{ fontSize: 11 }}>Открыть</span>
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Комментарий к решению</label>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  placeholder="Необязательно — сотрудник получит его в уведомлении"
                  className="input-field" style={{ width: '100%' }} rows={3} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <button onClick={() => !actionLoading && setSelectedItem(null)}
                  className="btn-outline" disabled={actionLoading}>Отмена</button>
                <button onClick={() => handleReview('reject')} disabled={actionLoading}
                  style={{
                    padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)',
                    color: '#f87171', cursor: 'pointer', transition: 'all 0.25s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,67,54,0.2)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(244,67,54,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,67,54,0.1)'; e.currentTarget.style.boxShadow = 'none' }}>
                  {actionLoading ? '...' : 'Отклонить'}
                </button>
                <button onClick={() => handleReview('approve')} disabled={actionLoading}
                  style={{
                    padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(74,222,128,0.15))',
                    border: '1px solid rgba(255,215,0,0.5)', color: '#FFD700', cursor: 'pointer',
                    transition: 'all 0.25s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(255,215,0,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
                  {actionLoading ? '...' : 'Одобрить'}
                </button>
              </div>
            </div>
          )}
        </PremiumModal>

        <style jsx>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
          }
        `}</style>
      </div>
    </div>
  )
}
export default withAuth(ReviewPage, { permission: 'can_review_tasks' })
