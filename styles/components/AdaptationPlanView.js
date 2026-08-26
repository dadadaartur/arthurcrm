import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from './LoadingScreen'
import BackArrow from './BackArrow'
import ProgressBar3D from './ProgressBar3D'
import { useFeedback } from '../context/ActionFeedbackContext'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const todayISO = () => new Date().toISOString().slice(0, 10)

const TYPE_LABELS = { control: 'Контроль', test: 'Тестирование', meeting: 'Встреча', feedback: 'Обратная связь', training: 'Обучение', rework: 'Доработка' }
const RatingStars = ({ value, onChange, size = 16 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange?.(n)} disabled={!onChange}
        style={{ background: 'none', border: 'none', padding: 0, cursor: onChange ? 'pointer' : 'default' }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? '#FFD700' : 'none'} stroke="#FFD700" strokeWidth="1.5">
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
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <BackArrow href="/" title={title} />

        {!plan ? (
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>
            {emptyText}
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,215,0,0.2)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{plan.title || 'Индивидуальный план'}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 14px', borderRadius: 20, fontWeight: 700, background: plan.status === 'completed' ? 'rgba(74,222,128,0.15)' : 'rgba(255,215,0,0.12)', color: plan.status === 'completed' ? '#4ade80' : '#FFD700', border: `1px solid ${plan.status === 'completed' ? 'rgba(74,222,128,0.4)' : 'rgba(255,215,0,0.4)'}` }}>{plan.status === 'completed' ? 'Завершён' : 'В процессе'}</span>
              </div>
              <ProgressBar3D value={done} marks={[{ key: 't', value: events.length }]} height={12} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 6 }}>
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
                  <div key={d} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, border: `1px solid ${isToday ? 'rgba(160,233,255,0.5)' : allDone ? 'rgba(74,222,128,0.3)' : isOverdue ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)'}`, overflow: 'hidden', boxShadow: isToday ? '0 0 20px rgba(160,233,255,0.12)' : 'none' }}>
                    <div onClick={() => setOpenDay(isOpen ? null : d)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: allDone ? 'rgba(74,222,128,0.15)' : isToday ? 'rgba(160,233,255,0.15)' : 'rgba(255,215,0,0.1)', color: allDone ? '#4ade80' : isToday ? '#a0e9ff' : '#FFD700', border: `1px solid ${allDone ? 'rgba(74,222,128,0.4)' : isToday ? 'rgba(160,233,255,0.5)' : 'rgba(255,215,0,0.3)'}` }}>{d}</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>День {d}</span>
                        {isToday && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(160,233,255,0.15)', color: '#a0e9ff', border: '1px solid rgba(160,233,255,0.4)' }}>Сегодня</span>}
                        {isOverdue && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.35)' }}>Просрочено</span>}
                      </div>
                      <span style={{ fontSize: 11, color: '#888' }}>{dayEvents.filter(e => e.status === 'done').length}/{dayEvents.length}</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dayEvents.map(ev => {
                          const evHistory = feedbackEntries.filter(h => h.event_id === ev.id)
                          return (
                          <div key={ev.id} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  {ev.event_time && <span style={{ color: '#a0e9ff', fontSize: 13, fontWeight: 600 }}>{ev.event_time}</span>}
                                  <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{ev.title}</span>
                                  {ev.event_type && <span style={{ fontSize: 9, padding: '1px 8px', borderRadius: 20, background: 'rgba(192,132,252,0.1)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)' }}>{TYPE_LABELS[ev.event_type] || ev.event_type}</span>}
                                  {!ev.is_mandatory && <span style={{ fontSize: 9, color: '#666' }}>необязательно</span>}
                                </div>
                                {ev.description && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{ev.description}</div>}
                                {ev.required_action && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{ev.required_action}</div>}
                                {ev.materials && <div style={{ fontSize: 11, color: '#c084fc', marginTop: 4 }}>Материалы: {ev.materials}</div>}
                              </div>
                              <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', background: ev.status === 'done' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', color: ev.status === 'done' ? '#4ade80' : '#aaa' }}>{ev.status === 'done' ? 'Выполнено' : 'К выполнению'}</span>
                            </div>
                            {ev.status !== 'done' && (
                              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input className="input-field" style={{ flex: 1, minWidth: 180 }} placeholder="Комментарий (необязательно)" value={feedback[ev.id] || ''} onChange={e => setFeedback(f => ({ ...f, [ev.id]: e.target.value }))} />
                                <button onClick={() => completeEvent(ev)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Выполнено</button>
                              </div>
                            )}
                            {ev.manager_confirmed_at && (
                              <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 11, color: '#FFD700', fontWeight: 600 }}>Обратная связь руководителя</span>
                                  {ev.rating != null && <RatingStars value={ev.rating} size={13} />}
                                </div>
                                {ev.manager_feedback && <div style={{ fontSize: 12, color: '#ccc', marginTop: 6 }}>{ev.manager_feedback}</div>}
                                {evHistory.map(h => (
                                  <div key={h.id} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    {h.employee_rating ? (
                                      <div style={{ fontSize: 11, color: '#888' }}>Ваша оценка этой обратной связи: <RatingStars value={h.employee_rating} size={12} /></div>
                                    ) : rateFeedbackFor === h.id ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 11, color: '#888' }}>Насколько полезной была эта обратная связь?</span>
                                        <RatingStars value={0} size={16} onChange={r => rateFeedback(h.id, r)} />
                                      </div>
                                    ) : (
                                      <button onClick={() => setRateFeedbackFor(h.id)} style={{ background: 'none', border: 'none', padding: 0, color: '#a0e9ff', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Оценить эту обратную связь</button>
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
              <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Журнал взаимодействий</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map(h => (
                    <div key={h.id} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: '#888' }}>
                        <span>{h.author_role === 'manager' ? 'Руководитель' : h.author_role === 'employee' ? 'Вы' : 'Система'} · {TYPE_LABELS[h.type] || h.type}</span>
                        <span>{new Date(h.created_at).toLocaleDateString('ru')}</span>
                      </div>
                      {h.description && <div style={{ color: '#ccc', marginTop: 4 }}>{h.description}</div>}
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
