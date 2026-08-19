import { useEffect, useState, useRef } from 'react'
import BackArrow from '../components/BackArrow'
import Spinner from '../components/Spinner'
import { supabase } from '../lib/supabaseClient'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

const TYPE_ICONS = {
  meeting: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="#a0e9ff" strokeWidth="1.3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#a0e9ff" strokeWidth="1.3"/></svg>,
  training: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v10H2z" stroke="#FFD700" strokeWidth="1.3"/><path d="M5 1v2M11 1v2M2 7h12" stroke="#FFD700" strokeWidth="1.3"/></svg>,
  coaching: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 13L8 4l4 9M5.5 10h5" stroke="#c084fc" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  practice: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  feedback: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v8H6l-4 3v-3H2z" stroke="#FFD700" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  test: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#a0e9ff" strokeWidth="1.3"/><path d="M5 8l2 2 4-4" stroke="#a0e9ff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  rework: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8a4 4 0 1 1 4 4M8 12l-2 2 2 2" stroke="#f97316" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

function Timer({ event }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!event?.event_time || !event?.event_date) return null
  const target = new Date(`${event.event_date}T${event.event_time}:00`).getTime()
  const diff = target - now
  if (diff < 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return (
    <div style={{ fontSize: 11, color: diff < 900000 ? '#f87171' : '#888', fontFamily: 'monospace' }}>
      до начала {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </div>
  )
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const feedbackRef = useRef(null)

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session.access_token}` }
  }
  const load = async () => {
    const h = await auth()
    const r = await fetch('/api/adaptation/my', { headers: h })
    if (r.ok) setData(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const loadHistory = async () => {
    if (!data?.plan) return
    const h = await auth()
    const r = await fetch(`/api/adaptation/history?planId=${data.plan.id}`, { headers: h })
    if (r.ok) setHistory(await r.json())
  }
  useEffect(() => { if (historyOpen && data?.plan) loadHistory() }, [historyOpen, data?.plan])

  const handleComplete = async () => {
    if (!data?.currentEvent) return
    setSubmitting(true)
    const h = await auth()
    await fetch('/api/adaptation/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ eventId: data.currentEvent.id, feedback })
    })
    setFeedback('')
    setExpanded(null)
    await load()
    setSubmitting(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/" title="Моя адаптация" />
        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#888' }}>
          План адаптации вам пока не назначен. Руководитель скоро это сделает.
        </div>
      </div>
    </div>
  )

  const { plan, events, progress, currentEvent } = data
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const days = Array.from(new Set(events.map(e => e.day_number))).sort((a, b) => a - b)

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/" title="Моя адаптация" extra={
          <button onClick={() => setHistoryOpen(!historyOpen)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFD700'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 4.5V8l2.3 1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            История взаимодействий
          </button>
        } />

        {/* Прогресс + текущее событие */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(255,215,0,0.3)' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>Прогресс плана</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FFD700' }}>{pct}%</div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 10 }}>
              <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: 'linear-gradient(90deg, rgba(255,215,0,0.4), #FFD700)', boxShadow: '0 0 8px rgba(255,215,0,0.5)', transition: 'width .6s' }} />
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Выполнено {progress.done} из {progress.total} событий</div>
          </div>

          {currentEvent && (
            <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(74,222,128,0.4)', gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Текущее событие</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{currentEvent.title}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                    День {currentEvent.day_number} · {currentEvent.event_time || '—'}
                    {currentEvent.event_date && ` · ${new Date(currentEvent.event_date).toLocaleDateString('ru', { day: 'numeric', month: 'long' })}`}
                  </div>
                </div>
                <Timer event={currentEvent} />
              </div>
              <button onClick={() => setExpanded(expanded === currentEvent.id ? null : currentEvent.id)}
                style={{ ...ghostBtn, marginTop: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                Подробнее
              </button>
            </div>
          )}
        </div>

        {/* План по дням */}
        {days.map(d => {
          const dayEvents = events.filter(e => e.day_number === d)
          const startDate = new Date(plan.start_date + 'T00:00:00')
          startDate.setDate(startDate.getDate() + d - 1)
          const dayDate = startDate.toLocaleDateString('ru', { day: 'numeric', month: 'long', weekday: 'short' })
          return (
            <div key={d} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#a0e9ff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(160,233,255,0.1)', border: '1px solid rgba(160,233,255,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a0e9ff' }}>{d}</span>
                {dayDate}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEvents.map(ev => {
                  const isDone = ev.status === 'done'
                  const isCurrent = currentEvent?.id === ev.id
                  return (
                    <div key={ev.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 12, padding: 14, border: `1px solid ${isCurrent ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`, opacity: isDone ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isDone ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (TYPE_ICONS[ev.event_type] || TYPE_ICONS.practice)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{ev.title}</div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                            {ev.event_time || '—'}
                            {ev.duration_minutes && ` · ${ev.duration_minutes} мин`}
                            {ev.is_mandatory && ' · обязательно'}
                          </div>
                        </div>
                        {!isDone && ev.event_type !== 'feedback' && (
                          <button onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                            style={{ ...ghostBtn, padding: '6px 14px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                            {isCurrent ? 'Выполнить' : 'Детали'}
                          </button>
                        )}
                      </div>

                      {expanded === ev.id && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          {ev.required_action && <div style={{ fontSize: 13, color: '#ccc', marginBottom: 8 }}><b style={{ color: '#a0e9ff' }}>Что нужно сделать:</b> {ev.required_action}</div>}
                          {ev.expected_result && <div style={{ fontSize: 13, color: '#ccc', marginBottom: 8 }}><b style={{ color: '#4ade80' }}>Ожидаемый результат:</b> {ev.expected_result}</div>}
                          {ev.materials && <div style={{ fontSize: 13, color: '#ccc', marginBottom: 8 }}><b style={{ color: '#FFD700' }}>Материалы:</b> {ev.materials}</div>}
                          {ev.employee_feedback && <div style={{ fontSize: 12, color: '#888', marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>Ваш фидбек: {ev.employee_feedback}</div>}
                          {ev.manager_feedback && <div style={{ fontSize: 12, color: '#FFD700', marginTop: 6, padding: 8, borderRadius: 8, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}>ОС руководителя: {ev.manager_feedback}{ev.rating ? ` · Оценка: ${ev.rating}/5` : ''}</div>}
                          {!isDone && (
                            <div style={{ marginTop: 12 }}>
                              <textarea ref={feedbackRef} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Ваш фидбек (необязательно)" className="input-field" style={{ width: '100%' }} rows={2} />
                              <button onClick={handleComplete} disabled={submitting} style={{ ...ghostBtn, marginTop: 8, opacity: submitting ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                                {submitting ? 'Отправляем…' : 'Отметить выполненным'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Модалка истории */}
      {historyOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setHistoryOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>История взаимодействий</h3>
              <button onClick={() => setHistoryOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.length === 0 ? <p style={{ color: '#777', textAlign: 'center', padding: 20 }}>История пуста</p> : (
                history.map(h => (
                  <div key={h.id} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                      <span>{h.author_role === 'manager' ? 'РОП' : h.author_role === 'system' ? 'Система' : 'Вы'}</span>
                      <span>{new Date(h.created_at).toLocaleString('ru')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#fff' }}>{h.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
