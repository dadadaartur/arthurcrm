import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from '../components/LoadingScreen'
import BackArrow from '../components/BackArrow'
import ProgressBar3D from '../components/ProgressBar3D'
import { useFeedback } from '../context/ActionFeedbackContext'
import { BAND_COLORS, BAND_LABELS } from '../lib/kpi'

// Визуальный вес карточки по настройке админа (пункт 9, 1 сентября
// 2026) — раньше все задания выглядели одинаково независимо от
// важности. priority — мягкое мерцающая рамка (привлекает взгляд, не
// раздражает постоянным движением — цикл длинный, 2.4с). premium —
// золотой бейдж в углу и статичная золотая рамка потолще, без анимации
// (премиальность через сдержанность, тот же принцип, что уже
// применялся для карточки перевода кармиков).
function TaskCard({ assignment, variant = 'grid', onStart, onSubmit, accentColor = 'var(--border-subtle)' }) {
  const t = assignment.tasks
  const ap = assignment.autoProgress
  const tier = t?.visual_tier || 'normal'
  const hasCount = t?.target_count > 0
  const hasPrize = Array.isArray(t?.bonus_rewards) && t.bonus_rewards.some(b => b.type === 'prize')
  const isExpensive = (t?.reward_karma || 0) >= 100

  const stop = fn => e => { e.preventDefault(); e.stopPropagation(); fn() }
  const tierStyle = tier === 'premium' ? { border: '1.5px solid var(--border-gold)', boxShadow: '0 0 0 1px rgba(184,134,11,0.12), var(--shadow-card)' }
    : tier === 'priority' ? { border: '1px solid rgba(124,58,237,0.4)', animation: 'taskPriorityGlow 2.4s ease-in-out infinite' }
    : { border: `1px solid ${accentColor}` }

  return (
    <Link href={t ? `/task/${assignment.id}` : '#'} style={{
      background: 'var(--bg-card)', textDecoration: 'none', color: 'inherit',
      borderRadius: 16, display: 'flex', flexDirection: 'column', height: '100%', padding: 18,
      width: variant === 'carousel' ? 320 : undefined, flexShrink: variant === 'carousel' ? 0 : undefined,
      position: 'relative', overflow: 'hidden', cursor: 'pointer',
      transition: 'transform 0.2s ease',
      ...tierStyle,
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {tier === 'premium' && (
        <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, padding: '4px 12px 4px 14px', borderRadius: '0 16px 0 12px', background: 'linear-gradient(135deg, #8a6208, #b45309)', color: '#fff' }}>ПРЕМИУМ</span>
      )}
      {hasPrize && (
        <span style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, padding: '3px 9px 3px 7px', borderRadius: 20, background: 'rgba(219,39,119,0.95)', color: '#fff' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><rect x="3" y="8" width="18" height="4" /><path d="M12 8v13M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8" /><path d="M12 8c-1.5-4-6-4-6-1s3 1 6 1M12 8c1.5-4 6-4 6-1s-3 1-6 1" /></svg>
          ПРИЗ
        </span>
      )}

      {/* Квадратный аватар, не широкий баннер — object-fit: cover на
          квадратной области не обрезает типовое квадратное изображение
          вообще (в отличие от прежнего варианта 2.5:1, где терялось
          до 60% кадра по вертикали независимо от точки обрезки). */}
      <div className="flex items-start gap-3 mb-3">
        <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: t?.image_url ? undefined : 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(184,134,11,0.12))' }}>
          {t?.image_url ? (
            <img src={t.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.4" opacity="0.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="#7c3aed" /></svg>
            </div>
          )}
          {t?.video_url && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="#161b28"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
            {t ? t.title : `Задача ID: ${assignment.task_id} (не найдена)`}
          </h3>
          {t?.partner_name && <div style={{ fontSize: 11, color: 'var(--accent-gold)', marginTop: 3 }}>Партнёр: {t.partner_name}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {t?.description && <p style={{ color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} className="text-sm mb-3">{t.description}</p>}

        {ap ? (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'rgba(19,122,57,0.05)', border: '1px solid rgba(19,122,57,0.2)' }}>
            <p style={{ fontSize: 11, color: '#137a39', margin: '0 0 8px' }}>
              Засчитается автоматически при достижении «{ap.targetLabel}» по показателю «{ap.metricName}» — нажимать ничего не нужно.
            </p>
            <ProgressBar3D value={ap.currentValue} marks={[{ key: 't', value: ap.targetValue ?? 1 }]} height={6} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
              <span style={{ color: '#137a39' }}>Сейчас: {ap.currentValue}{ap.unit} ({BAND_LABELS[ap.currentBand]})</span>
              {ap.achievedToday && <span style={{ color: 'var(--accent-green)' }}>Выполнено сегодня</span>}
            </div>
          </div>
        ) : null}

        {hasCount && (
          <div style={{ marginBottom: 12, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Прогресс</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{assignment.progress_count || 0} / {t.target_count} {t.target_count_label || ''}</span>
            </div>
            <ProgressBar3D value={assignment.progress_count || 0} marks={[{ key: 't', value: t.target_count }]} height={5} />
          </div>
        )}

        <div className="flex justify-between items-center mb-3">
          <span style={{ color: 'var(--accent-gold)', fontWeight: isExpensive ? 800 : 500, fontSize: isExpensive ? 18 : 13 }}>+ {t?.reward_karma ?? '?'} {isExpensive ? '' : 'кармиков'}</span>
          {assignment.deadline_at && (
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }} className="font-mono">{new Date(assignment.deadline_at).toLocaleString('ru')}</span>
          )}
        </div>

        <div style={{ marginTop: 'auto' }}>
          {(() => {
            const hoursLeft = assignment.deadline_at ? (new Date(assignment.deadline_at) - new Date()) / 3600000 : null
            const urgent = hoursLeft != null && hoursLeft > 0 && hoursLeft < 24 && ['assigned', 'in_progress'].includes(assignment.status)
            return (<>
              {!t?.is_auto_goal && assignment.status === 'assigned' && (
                <button onClick={stop(() => onStart(assignment.id))} className="action-btn w-full text-xs py-1.5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, animation: urgent ? 'taskCardUrgent 1.6s ease-in-out infinite' : 'none' }}>
                  {urgent ? `Осталось ${Math.max(1, Math.round(hoursLeft))} ч — начните` : 'Начать'} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )}
              {!t?.is_auto_goal && assignment.status === 'in_progress' && (
                <button onClick={stop(() => onSubmit(assignment.id))} className="action-btn w-full text-xs py-1.5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, animation: urgent ? 'taskCardUrgent 1.6s ease-in-out infinite' : 'none' }}>
                  {urgent ? `Осталось ${Math.max(1, Math.round(hoursLeft))} ч — отправьте` : 'Отправить на проверку'} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )}
            </>)
          })()}
          {!t?.is_auto_goal && assignment.status === 'pending_review' && (
            <div className="w-full text-center text-xs py-1.5" style={{ color: 'var(--accent-purple)' }}>Ожидает проверки</div>
          )}
          {t?.is_auto_goal && (
            <div className="w-full text-center text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>Подробнее →</div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes taskPriorityGlow { 0%, 100% { box-shadow: 0 0 0 rgba(124,58,237,0); } 50% { box-shadow: 0 0 14px rgba(124,58,237,0.28); } }
        @keyframes taskCardUrgent { 0%, 100% { box-shadow: 0 0 0 rgba(220,38,38,0); } 50% { box-shadow: 0 0 12px rgba(220,38,38,0.4); } }
      `}</style>
    </Link>
  )
}

export default function TasksPage() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [user, setUser] = useState(null)
  const [activeTasks, setActiveTasks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('new')

  useEffect(() => {
    if (activeTasks.length > 0) {
      const inProgress = activeTasks.filter(t => t.status === 'in_progress')
      if (inProgress.length > 0) setActiveTab('in_progress')
    }
  }, [activeTasks])

  const [submitModal, setSubmitModal] = useState({ show: false, assignmentId: null, comment: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, deleted_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!profile?.company_id || profile.deleted_at) { router.push('/welcome'); return }
      setUser(user)
    }
    init()
  }, [])

  useEffect(() => {
    if (user) loadTasks()
  }, [user])

  const loadTasks = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/tasks/my', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (r.ok) {
      const d = await r.json()
      setActiveTasks(d.active || [])
      setHistory(d.history || [])
    }
    setLoading(false)
  }

  const handleStart = async (assignmentId) => {
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('user_id', user.id)
      .eq('status', 'assigned')

    if (!error) {
      showSuccess('Задание принято в работу')
      loadTasks()
    } else {
      showError('Ошибка при начале задания')
    }
  }

  const openSubmitModal = (assignmentId) => setSubmitModal({ show: true, assignmentId, comment: '' })

  const handleSubmit = async () => {
    if (!user || !submitModal.assignmentId) return
    setSubmitting(true)
    const { error } = await supabase
      .from('task_assignments')
      .update({
        status: 'pending_review',
        comment: submitModal.comment,
        completed_at: new Date().toISOString()
      })
      .eq('id', submitModal.assignmentId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')

    if (!error) {
      setSubmitModal({ show: false, assignmentId: null, comment: '' })
      showSuccess('Задание отправлено на проверку')
      loadTasks()
    } else {
      showError('Ошибка отправки')
    }
    setSubmitting(false)
  }

  // Авто-зачётные задания всегда лежат в статусе assigned (крон пишет
  // отдельный лог начислений, а не меняет статус самой строки) — поэтому
  // для вкладок используем их собственный прогресс, а не общий статус.
  const filteredTasks = activeTasks.filter(assignment => {
    if (assignment.tasks?.is_auto_goal) return activeTab === 'new'
    if (activeTab === 'new') return assignment.status === 'assigned'
    if (activeTab === 'in_progress') return assignment.status === 'in_progress'
    if (activeTab === 'pending_review') return assignment.status === 'pending_review'
    return false
  })

  if (activeTab === 'in_progress') {
    filteredTasks.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
  }
  if (activeTab === 'pending_review') {
    filteredTasks.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
  }

  // Три настоящих раздела, не сетка с мелкой меткой в углу (по фидбеку
  // от 2 сентября 2026: «типы заданий никак не разделены, всё в куче
  // непонятно») — партнёрские лентой, авто-целевые и обычные каждые в
  // своей секции с заголовком и своим акцентным цветом карточек.
  const partnerTasks = filteredTasks.filter(a => a.tasks?.partner_name)
  const autoGoalTasks = filteredTasks.filter(a => !a.tasks?.partner_name && a.tasks?.is_auto_goal)
  const manualTasks = filteredTasks.filter(a => !a.tasks?.partner_name && !a.tasks?.is_auto_goal)

  if (loading) return <LoadingScreen />

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }} className="theme-light px-6 py-8">
      <BackArrow href="/" title="Мои задания" extra={
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="flex gap-2">
            {[
              { key: 'new', label: 'Новые', count: activeTasks.filter(t => t.status === 'assigned').length },
              { key: 'in_progress', label: 'В работе', count: activeTasks.filter(t => t.status === 'in_progress' && !t.tasks?.is_auto_goal).length },
              { key: 'pending_review', label: 'На проверке', count: activeTasks.filter(t => t.status === 'pending_review').length },
              { key: 'history', label: 'История', count: history.length }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`filter-pill relative ${activeTab === tab.key ? 'active' : ''}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full text-xs font-bold
                      ${tab.key === 'new' && activeTab !== 'new'
                        ? 'bg-[#FFD700] text-[#0a1628] animate-pulse shadow-[0_0_8px_rgba(255,215,0,0.8)]'
                        : 'bg-gray-200 text-gray-600'
                      }`}
                    style={{ padding: '0 6px', fontSize: 11 }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Link href="/tasks-analytics" style={{ fontSize: 12, color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Моя аналитика →</Link>
        </div>
      } />

      <div style={{ marginBottom: 20 }} />

      {activeTab !== 'history' && (
        filteredTasks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Нет заданий</p>
        ) : (
          <>
            {partnerTasks.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-gold)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>От партнёров</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{partnerTasks.length} {partnerTasks.length === 1 ? 'предложение' : 'предложений'} — особые условия от компаний-партнёров</span>
                </div>
                <div className="partner-ribbon" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10, scrollSnapType: 'x proximity' }}>
                  {partnerTasks.map(assignment => (
                    <div key={assignment.id} style={{ scrollSnapAlign: 'start' }}>
                      <TaskCard assignment={assignment} variant="carousel" onStart={handleStart} onSubmit={openSubmitModal} accentColor="rgba(184,134,11,0.35)" />
                    </div>
                  ))}
                </div>
                <style jsx>{`
                  .partner-ribbon::-webkit-scrollbar { height: 5px; }
                  .partner-ribbon::-webkit-scrollbar-thumb { background: rgba(176,128,16,0.35); border-radius: 4px; }
                  .partner-ribbon { scrollbar-width: thin; scrollbar-color: rgba(176,128,16,0.35) transparent; }
                `}</style>
              </div>
            )}
            {autoGoalTasks.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#137a39' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>По вашим целям</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{autoGoalTasks.length} — засчитаются сами при достижении показателя, нажимать не нужно</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                  {autoGoalTasks.map(assignment => (
                    <TaskCard key={assignment.id} assignment={assignment} variant="grid" onStart={handleStart} onSubmit={openSubmitModal} accentColor="rgba(19,122,57,0.3)" />
                  ))}
                </div>
              </div>
            )}
            {manualTasks.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>От руководителя</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{manualTasks.length} — выполните и отправьте на проверку</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                  {[...manualTasks].sort((a, b) => (b.tasks?.visual_tier === 'premium' ? 1 : 0) - (a.tasks?.visual_tier === 'premium' ? 1 : 0)).map(assignment => (
                    <TaskCard key={assignment.id} assignment={assignment} variant="grid" onStart={handleStart} onSubmit={openSubmitModal} accentColor="rgba(14,116,144,0.3)" />
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}

      {activeTab === 'history' && (
        history.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Нет завершённых заданий</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
            {history.map(h => {
              const t = h.tasks
              if (!t) return null
              return (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${h.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {h.status === 'completed' ? 'Выполнено' : 'Отклонено'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(h.completed_at).toLocaleString('ru')}</p>
                  </div>
                  <span style={{ color: 'var(--accent-gold)' }} className="text-sm flex-shrink-0">+ {t.reward_karma} кармиков</span>
                </div>
              )
            })}
          </div>
        )
      )}

      {submitModal.show && (
        <div className="modal-overlay" onClick={() => setSubmitModal({ show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--accent-gold)' }}>Отправить на проверку</h3>
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
    </div>
  )
}
