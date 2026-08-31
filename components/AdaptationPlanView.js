import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from './LoadingScreen'
import BackArrow from './BackArrow'
import ProgressBar3D from './ProgressBar3D'
import { useFeedback } from '../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const todayISO = () => new Date().toISOString().slice(0, 10)

const TYPE_LABELS = { control: 'Контроль', test: 'Тестирование', meeting: 'Встреча', feedback: 'Обратная связь', training: 'Обучение', rework: 'Доработка' }
const RatingStars = ({ value, onChange, size = 16 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange?.(n)} disabled={!onChange}
        style={{ background: 'none', border: 'none', padding: 0, cursor: onChange ? 'pointer' : 'default' }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? '#8a6208' : 'none'} stroke="#8a6208" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    ))}
  </div>
)

// Общий вид плана адаптации/развития — переиспользуется страницами
// /onboarding (kind='onboarding') и /development (kind='development'),
// «по тому же принципу», как и просили: один и тот же компонент, разные
// шаблоны и заголовок.
export default function AdaptationPlanView({ kind, title, emptyText }) {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState(null)
  const [events, setEvents] = useState([])
  const [history, setHistory] = useState([])
  const [feedback, setFeedback] = useState({})
  const [openDay, setOpenDay] = useState(null)
  const [rateFeedbackFor, setRateFeedbackFor] = useState(null)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const load = async () => {
    const h = await auth()
    const r = await fetch(`/api/adaptation/my?kind=${kind}`, { headers: h })
    const data = await r.json()
    setPlan(data?.plan || null)
    setEvents(data?.events || [])
    if (data?.plan) {
      const hr = await fetch(`/api/adaptation/history?planId=${data.plan.id}`, { headers: h })
      if (hr.ok) setHistory(await hr.json())
      // Открываем сегодняшний день (или ближайший невыполненный) сразу,
      // чтобы не искать его вручную среди всех дней плана.
      const today = todayISO()
      const withDates = (data.events || []).map(e => ({ ...e, event_date: addDays(data.plan.start_date, e.day_number - 1) }))
      const current = withDates.find(e => e.status !== 'done' && e.event_date <= today) || withDates.find(e => e.status !== 'done')
      setOpenDay(current ? current.day_number : withDates[0]?.day_number ?? null)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [kind])

  const completeEvent = async (ev) => {
    const h = await auth()
    const r = await fetch('/api/adaptation/complete', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: ev.id, feedback: feedback[ev.id] || null }) })
    if (!r.ok) { showError('Не удалось отметить выполнение'); return }
    showSuccess('Событие выполнено, руководитель уведомлён')
    load()
  }

  const rateFeedback = async (historyId, rating) => {
    const h = await auth()
    const r = await fetch('/api/adaptation/rate-feedback', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ historyId, employeeRating: rating }) })
    if (!r.ok) { showError('Не удалось сохранить оценку'); return }
    showSuccess('Спасибо, оценка сохранена')
    setRateFeedbackFor(null)
    load()
  }

  if (loading) return <LoadingScreen />

  const done = events.filter(e => e.status === 'done').length
  const days = [...new Set(events.map(e => e.day_number))].sort((a, b) => a - b)
  const today = todayISO()
  const feedbackEntries = history.filter(h => h.type === 'feedback')

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <BackArrow href="/" title={title} />

        {!plan ? (
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            {emptyText}
          </div>
        ) : (
          <>
            <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 24, border: '1px solid var(--border-gold)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.title || 'Индивидуальный план'}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 14px', borderRadius: 20, fontWeight: 700, background: plan.status === 'completed' ? 'rgba(19,122,57,0.1)' : 'rgba(184,134,11,0.1)', color: plan.status === 'completed' ? '#137a39' : '#8a6208', border: `1px solid ${plan.status === 'completed' ? 'rgba(19,122,57,0.35)' : 'var(--border-gold)'}` }}>{plan.status === 'completed' ? 'Завершён' : 'В процессе'}</span>
              </div>
              <ProgressBar3D value={done} marks={[{ key: 't', value: events.length }]} height={12} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                <span>Выполнено: {done} из {events.length}</span>
                <span>{events.length ? Math.round(done / events.length * 100) : 0}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {days.map(d => {
                const dayEvents = events.filter(e => e.day_number === d)
                const allDone = dayEvents.every(e => e.status === 'done')
                const dayDate = addDays(plan.start_date, d - 1)
                const isToday = dayDate === today
                const isOverdue = !allDone && dayDate < today
                const isOpen = openDay === d
                return (
                  <div key={d} style={{ background: 'var(--bg-card)', boxShadow: isToday ? '0 0 0 1px rgba(14,116,144,0.15), var(--shadow-card)' : 'var(--shadow-card)', borderRadius: 16, border: `1px solid ${isToday ? 'rgba(14,116,144,0.4)' : allDone ? 'rgba(19,122,57,0.3)' : isOverdue ? 'rgba(220,38,38,0.3)' : 'var(--border-subtle)'}`, overflow: 'hidden' }}>
                    <div onClick={() => setOpenDay(isOpen ? null : d)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: allDone ? 'rgba(19,122,57,0.1)' : isToday ? 'rgba(14,116,144,0.1)' : 'rgba(184,134,11,0.08)', color: allDone ? '#137a39' : isToday ? '#0e7490' : '#8a6208', border: `1px solid ${allDone ? 'rgba(19,122,57,0.35)' : isToday ? 'rgba(14,116,144,0.4)' : 'var(--border-gold)'}` }}>{d}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>День {d}</span>
                        {isToday && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(14,116,144,0.1)', color: '#0e7490', border: '1px solid rgba(14,116,144,0.35)' }}>Сегодня</span>}
                        {isOverdue && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}>Просрочено</span>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{dayEvents.filter(e => e.status === 'done').length}/{dayEvents.length}</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dayEvents.map(ev => {
                          const evHistory = feedbackEntries.filter(h => h.event_id === ev.id)
                          return (
                          <div key={ev.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  {ev.event_time && <span style={{ color: '#0e7490', fontSize: 13, fontWeight: 600 }}>{ev.event_time}</span>}
                                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{ev.title}</span>
                                  {ev.event_type && <span style={{ fontSize: 9, padding: '1px 8px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}>{TYPE_LABELS[ev.event_type] || ev.event_type}</span>}
                                  {!ev.is_mandatory && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>необязательно</span>}
                                </div>
                                {ev.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{ev.description}</div>}
                                {ev.required_action && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{ev.required_action}</div>}
                                {ev.materials && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>Материалы: {ev.materials}</div>}
                              </div>
                              <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', background: ev.status === 'done' ? 'rgba(19,122,57,0.1)' : 'var(--bg-page)', color: ev.status === 'done' ? '#137a39' : 'var(--text-secondary)' }}>{ev.status === 'done' ? 'Выполнено' : 'К выполнению'}</span>
                            </div>
                            {ev.status !== 'done' && (
                              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input className="input-field" style={{ flex: 1, minWidth: 180 }} placeholder="Комментарий (необязательно)" value={feedback[ev.id] || ''} onChange={e => setFeedback(f => ({ ...f, [ev.id]: e.target.value }))} />
                                <button onClick={() => completeEvent(ev)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Выполнено</button>
                              </div>
                            )}
                            {ev.manager_confirmed_at && (
                              <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(184,134,11,0.05)', border: '1px solid var(--border-gold)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 600 }}>Обратная связь руководителя</span>
                                  {ev.rating != null && <RatingStars value={ev.rating} size={13} />}
                                </div>
                                {ev.manager_feedback && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{ev.manager_feedback}</div>}
                                {evHistory.map(h => (
                                  <div key={h.id} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                                    {h.employee_rating ? (
                                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ваша оценка этой обратной связи: <RatingStars value={h.employee_rating} size={12} /></div>
                                    ) : rateFeedbackFor === h.id ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Насколько полезной была эта обратная связь?</span>
                                        <RatingStars value={0} size={16} onChange={r => rateFeedback(h.id, r)} />
                                      </div>
                                    ) : (
                                      <button onClick={() => setRateFeedbackFor(h.id)} style={{ background: 'none', border: 'none', padding: 0, color: '#0e7490', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Оценить эту обратную связь</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {history.length > 0 && (
              <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 24, border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>Журнал взаимодействий</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map(h => (
                    <div key={h.id} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-page)', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text-secondary)' }}>
                        <span>{h.author_role === 'manager' ? 'Руководитель' : h.author_role === 'employee' ? 'Вы' : 'Система'} · {TYPE_LABELS[h.type] || h.type}</span>
                        <span>{new Date(h.created_at).toLocaleDateString('ru')}</span>
                      </div>
                      {h.description && <div style={{ color: 'var(--text-primary)', marginTop: 4 }}>{h.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
