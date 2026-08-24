import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from '../components/LoadingScreen'
import BackArrow from '../components/BackArrow'
import ProgressBar3D from '../components/ProgressBar3D'
import { useFeedback } from '../context/ActionFeedbackContext'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }

export default function MyOnboarding() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState(null)
  const [template, setTemplate] = useState(null)
  const [events, setEvents] = useState([])
  const [feedback, setFeedback] = useState({})
  const [openDay, setOpenDay] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('adaptation_plans').select('*')
        .eq('employee_id', user.id).in('status', ['active', 'completed']).order('created_at', { ascending: false }).limit(1).maybeSingle()
      setPlan(p)
      if (p) {
        const { data: evs } = await supabase.from('adaptation_plan_events').select('*').eq('plan_id', p.id).order('day_number').order('event_time')
        setEvents(evs || [])
        if (p.template_id) {
          const { data: tpl } = await supabase.from('adaptation_templates').select('*').eq('id', p.template_id).maybeSingle()
          setTemplate(tpl)
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const completeEvent = async (ev) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('adaptation_plan_events').update({
      status: 'done', employee_confirmed_at: new Date().toISOString(), employee_feedback: feedback[ev.id] || null
    }).eq('id', ev.id)
    if (error) { showError('Ошибка: ' + error.message); return }
    if (plan?.manager_id) await supabase.from('notifications').insert({ user_id: plan.manager_id, message: `Сотрудник выполнил событие «${ev.title}» (день ${ev.day_number}). Подтвердите в адаптации.`, link: '/company-admin/adaptation' })
    showSuccess('Событие выполнено, руководитель уведомлён')
    const { data: evs } = await supabase.from('adaptation_plan_events').select('*').eq('plan_id', plan.id).order('day_number').order('event_time')
    setEvents(evs || [])
  }

  if (loading) return <LoadingScreen />

  const done = events.filter(e => e.status === 'done').length
  const days = [...new Set(events.map(e => e.day_number))].sort((a, b) => a - b)

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <BackArrow href="/" title="Моя адаптация" />

        {!plan ? (
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>
            План адаптации вам пока не назначен.
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,215,0,0.2)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>План адаптации</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{template?.name || 'Индивидуальный план'}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 14px', borderRadius: 20, fontWeight: 700, background: plan.status === 'completed' ? 'rgba(74,222,128,0.15)' : 'rgba(255,215,0,0.12)', color: plan.status === 'completed' ? '#4ade80' : '#FFD700', border: `1px solid ${plan.status === 'completed' ? 'rgba(74,222,128,0.4)' : 'rgba(255,215,0,0.4)'}` }}>{plan.status === 'completed' ? 'Завершена' : 'В процессе'}</span>
              </div>
              <ProgressBar3D value={done} marks={[{ key: 't', value: events.length }]} height={12} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 6 }}>
                <span>Выполнено: {done} из {events.length}</span>
                <span>{events.length ? Math.round(done / events.length * 100) : 0}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {days.map(d => {
                const dayEvents = events.filter(e => e.day_number === d)
                const allDone = dayEvents.every(e => e.status === 'done')
                const isOpen = openDay === d
                return (
                  <div key={d} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, border: `1px solid ${allDone ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`, overflow: 'hidden' }}>
                    <div onClick={() => setOpenDay(isOpen ? null : d)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: allDone ? 'rgba(74,222,128,0.15)' : 'rgba(255,215,0,0.1)', color: allDone ? '#4ade80' : '#FFD700', border: `1px solid ${allDone ? 'rgba(74,222,128,0.4)' : 'rgba(255,215,0,0.3)'}` }}>{d}</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>День {d}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#888' }}>{dayEvents.filter(e => e.status === 'done').length}/{dayEvents.length}</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dayEvents.map(ev => (
                          <div key={ev.id} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{ev.event_time && <span style={{ color: '#a0e9ff', marginRight: 8 }}>{ev.event_time}</span>}{ev.title}</div>
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
                            {ev.status === 'done' && ev.manager_confirmed_at && <div style={{ fontSize: 11, color: '#4ade80', marginTop: 8 }}>Подтверждено руководителем</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
