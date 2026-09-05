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
function PremiumActionButton({ onClick, urgent, children }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full text-sm py-3"
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 12, fontWeight: 700, color: '#fff',
        background: urgent ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'linear-gradient(135deg, #a4770f, #8a6208 45%, #6b4a06)',
        border: 'none', cursor: 'pointer',
        boxShadow: hover ? '0 6px 18px rgba(138,98,8,0.4), inset 0 1px 0 rgba(255,255,255,0.25)' : '0 3px 10px rgba(138,98,8,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        animation: urgent ? 'taskCardUrgent 1.6s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{children}</span>
      {/* Полоса блеска, проходящая слева направо при наведении — премиальный
          интерактивный отклик вместо плоской статичной заливки. */}
      <span style={{
        position: 'absolute', top: 0, bottom: 0, width: '55%',
        background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.32), transparent)',
        left: hover ? '120%' : '-60%', transition: 'left 0.6s ease',
      }} />
    </button>
  )
}

function TaskCard({ assignment, variant = 'grid', onStart, onSubmit, accentColor = 'var(--border-subtle)', isPartner = false }) {
  const t = assignment.tasks
  const ap = assignment.autoProgress
  const tier = t?.visual_tier || 'normal'
  const hasCount = t?.target_count > 0
  const hasPrize = Array.isArray(t?.bonus_rewards) && t.bonus_rewards.some(b => b.type === 'prize')
  const isExpensive = (t?.reward_karma || 0) >= 100

  const stop = fn => e => { e.preventDefault(); e.stopPropagation(); fn() }
  const tierStyle = tier === 'premium' ? { border: '1.5px solid var(--border-gold)', boxShadow: '0 0 0 1px rgba(184,134,11,0.12), var(--shadow-card-hover)' }
    : tier === 'priority' ? { border: '1px solid rgba(124,58,237,0.4)', animation: 'taskPriorityGlow 2.4s ease-in-out infinite' }
    : isPartner ? { border: '1.5px solid var(--border-gold)', boxShadow: '0 0 24px -6px rgba(184,134,11,0.35), var(--shadow-card)' }
    : { border: `1px solid ${accentColor}` }

  const hoursLeft = assignment.deadline_at ? (new Date(assignment.deadline_at) - new Date()) / 3600000 : null
  const urgent = hoursLeft != null && hoursLeft > 0 && hoursLeft < 24 && ['assigned', 'in_progress'].includes(assignment.status)

  return (
    <Link href={t ? `/task/${assignment.id}` : '#'} style={{
      background: 'var(--bg-card)', textDecoration: 'none', color: 'inherit',
      borderRadius: 18, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      width: variant === 'carousel' ? (isPartner ? 320 : 280) : undefined, flexShrink: variant === 'carousel' ? 0 : undefined,
      position: 'relative', cursor: 'pointer', boxShadow: 'var(--shadow-card)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      ...tierStyle,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      {/* Бейджи поверх визуальной зоны */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
        <span>
          {tier === 'premium' && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, padding: '4px 11px', borderRadius: 20, background: 'linear-gradient(135deg, #8a6208, #b45309)', color: '#fff' }}>ПРЕМИУМ</span>}
        </span>
        {hasPrize && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, padding: '4px 10px 4px 8px', borderRadius: 20, background: 'rgba(219,39,119,0.95)', color: '#fff' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><rect x="3" y="8" width="18" height="4" /><path d="M12 8v13M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8" /><path d="M12 8c-1.5-4-6-4-6-1s3 1 6 1M12 8c1.5-4 6-4 6-1s-3 1-6 1" /></svg>
            ПРИЗ
          </span>
        )}
      </div>

      {/* Крупная визуальная зона — изображение на всю ширину, если
          есть, иначе название задания стилизованным крупным шрифтом
          играет роль «обложки» (по вашему референсу — там тоже нет
          фотографии, роль главного визуала играет крупное название). */}
      <div style={{ position: 'relative', height: isPartner ? 152 : 128, flexShrink: 0, background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}0a)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {t?.image_url ? (
          <img src={t.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', opacity: 0.5, padding: '0 20px', textAlign: 'center', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.25 }}>{t?.title}</span>
        )}
        {t?.video_url && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#161b28"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {t?.image_url && (
          <h3 style={{ color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{t.title}</h3>
        )}
        {t?.description && <p style={{ color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} className="text-sm mb-3">{t.description}</p>}

        {ap ? (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'rgba(19,122,57,0.05)', border: '1px solid rgba(19,122,57,0.2)' }}>
            <p style={{ fontSize: 11, color: '#137a39', margin: '0 0 8px' }}>Засчитается автоматически при достижении «{ap.targetLabel}» по показателю «{ap.metricName}».</p>
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

        {/* Блок награды — отдельная плашка, как «Бесплатных вращений: 100» на референсе */}
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-page)', marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 2 }}>Награда</div>
          <div style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: isExpensive ? 22 : 18 }}>+{t?.reward_karma ?? '?'} <span style={{ fontSize: 12, fontWeight: 500 }}>кармиков</span></div>
        </div>

        {/* Строка источника — как «REALSLOTS» на референсе */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t?.partner_name ? t.partner_name : t?.is_auto_goal ? 'По цели' : 'От руководителя'}</span>
          {assignment.deadline_at && <span style={{ color: urgent ? '#dc2626' : 'var(--text-muted)', fontWeight: urgent ? 700 : 400 }}>{urgent ? `${Math.max(1, Math.round(hoursLeft))} ч осталось` : new Date(assignment.deadline_at).toLocaleDateString('ru')}</span>}
        </div>

        <div style={{ marginTop: 'auto' }}>
          {!t?.is_auto_goal && assignment.status === 'assigned' && (
            <PremiumActionButton onClick={stop(() => onStart(assignment.id))} urgent={urgent}>
              Начать
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
            </PremiumActionButton>
          )}
          {!t?.is_auto_goal && assignment.status === 'in_progress' && (
            <PremiumActionButton onClick={stop(() => onSubmit(assignment.id))} urgent={urgent}>
              Отправить на проверку
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
            </PremiumActionButton>
          )}
          {!t?.is_auto_goal && assignment.status === 'pending_review' && (
            <div className="w-full text-center text-xs py-2" style={{ color: 'var(--accent-purple)' }}>Ожидает проверки</div>
          )}
          {t?.is_auto_goal && (
            <div className="w-full text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>Подробнее →</div>
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
  const [activeTab, setActiveTabRaw] = useState('new')
  const [typeFilter, setTypeFilter] = useState('all')
  const setActiveTab = (tab) => { setActiveTabRaw(tab); setTypeFilter('all') }

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

  const partnerTasks = filteredTasks.filter(a => a.tasks?.partner_name)
  const autoGoalTasks = filteredTasks.filter(a => !a.tasks?.partner_name && a.tasks?.is_auto_goal)
  const manualTasks = filteredTasks.filter(a => !a.tasks?.partner_name && !a.tasks?.is_auto_goal)

  const SECTIONS = [
    { key: 'partner', label: 'От партнёров', dot: 'var(--accent-gold)', accent: 'rgba(184,134,11,0.35)', items: partnerTasks },
    { key: 'goal', label: 'По вашим целям', dot: '#137a39', accent: 'rgba(19,122,57,0.3)', items: autoGoalTasks },
    { key: 'manual', label: 'От руководителя', dot: 'var(--accent-cyan)', accent: 'rgba(14,116,144,0.3)', items: manualTasks },
  ]
  const visibleSections = SECTIONS.filter(s => s.items.length > 0 && (typeFilter === 'all' || typeFilter === s.key))

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
          <Link href="/tasks-analytics" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#8a6208', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 20, background: 'rgba(184,134,11,0.08)', border: '1px solid var(--border-gold)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a6208" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 9l-5 5-3-3-4 4" /></svg>
            Моя аналитика
          </Link>
        </div>
      } />

      {activeTab !== 'history' && SECTIONS.some(s => s.items.length > 0) && (
        <div style={{ display: 'flex', gap: 8, margin: '20px 0', flexWrap: 'wrap' }}>
          <button onClick={() => setTypeFilter('all')} style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 16px', borderRadius: 20, border: `1px solid ${typeFilter === 'all' ? 'var(--text-primary)' : 'var(--border-subtle)'}`, background: typeFilter === 'all' ? 'var(--text-primary)' : 'var(--bg-card)', color: typeFilter === 'all' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>Все</button>
          {SECTIONS.filter(s => s.items.length > 0).map(s => (
            <button key={s.key} onClick={() => setTypeFilter(s.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '7px 16px', borderRadius: 20, border: `1px solid ${typeFilter === s.key ? s.dot : 'var(--border-subtle)'}`, background: typeFilter === s.key ? `${s.accent}` : 'var(--bg-card)', color: typeFilter === s.key ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />
              {s.label} · {s.items.length}
            </button>
          ))}
        </div>
      )}
      {activeTab === 'history' && <div style={{ marginBottom: 20 }} />}

      {activeTab !== 'history' && (
        filteredTasks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>Нет заданий</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {visibleSections.map(s => (
              <div key={s.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.dot }} />
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Georgia, serif' }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-page)', padding: '2px 10px', borderRadius: 20 }}>{s.items.length}</span>
                </div>
                <div className={`task-ribbon-${s.key}`} style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10, scrollSnapType: 'x proximity' }}>
                  {[...s.items].sort((a, b) => (b.tasks?.visual_tier === 'premium' ? 1 : 0) - (a.tasks?.visual_tier === 'premium' ? 1 : 0)).map(assignment => (
                    <div key={assignment.id} style={{ scrollSnapAlign: 'start' }}>
                      <TaskCard assignment={assignment} variant="carousel" onStart={handleStart} onSubmit={openSubmitModal} accentColor={s.accent} isPartner={s.key === 'partner'} />
                    </div>
                  ))}
                </div>
                <style jsx>{`
                  .task-ribbon-${s.key}::-webkit-scrollbar { height: 5px; }
                  .task-ribbon-${s.key}::-webkit-scrollbar-thumb { background: ${s.accent}; border-radius: 4px; }
                  .task-ribbon-${s.key} { scrollbar-width: thin; scrollbar-color: ${s.accent} transparent; }
                `}</style>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'history' && (
        history.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>Нет завершённых заданий</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {history.map(h => {
              const t = h.tasks
              if (!t) return null
              return (
                <Link key={h.id} href={`/task/${h.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: 14, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)', transition: 'transform 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{t.title}</span>
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: h.status === 'completed' ? 'rgba(19,122,57,0.1)' : 'rgba(220,38,38,0.1)', color: h.status === 'completed' ? '#137a39' : '#dc2626' }}>
                      {h.status === 'completed' ? 'Выполнено' : 'Отклонено'}
                    </span>
                  </div>
                  {t.description && <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 8 }}>{t.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(h.completed_at).toLocaleDateString('ru')}</span>
                    <span style={{ color: 'var(--accent-gold)', fontSize: 12.5, fontWeight: 700 }}>+{t.reward_karma} карм.</span>
                  </div>
                </Link>
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
