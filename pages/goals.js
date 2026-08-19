import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import BackArrow from '../components/BackArrow'
import { BAND_LABELS, BAND_COLORS, BAND_RANK, energyFor, karmaFor } from '../lib/kpi'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }

function PlayIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 2.5v11l9-5.5-9-5.5z" stroke="#a0e9ff" strokeWidth="1.3" strokeLinejoin="round" /></svg> }
function TextIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h6l3 3v10H4v-13z" stroke="#c084fc" strokeWidth="1.3" strokeLinejoin="round" /><path d="M6 6h4M6 8.5h4M6 11h3" stroke="#c084fc" strokeWidth="1.1" strokeLinecap="round" /></svg> }
function TestIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#FFD700" strokeWidth="1.3" /><path d="M5.5 8.2l1.8 1.8 3.4-3.8" stroke="#FFD700" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> }

export default function GoalsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [oldGoals, setOldGoals] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [activeTest, setActiveTest] = useState(null)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/kpi/my', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setData(await r.json())
      const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true)
      setOldGoals(g || [])
      setLoading(false)
    }
    init()
  }, [])

  const submitTest = async () => {
    if (!activeTest) return
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/kpi/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ trainingId: activeTest.training.id, answers: activeTest.answers })
    })
    if (r.ok) setTestResult(await r.json())
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  if (!data) return <div style={{ padding: '40px 32px', color: '#777' }}>Нет данных</div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/" title="Мои цели" />
        <p style={{ fontSize: 13, color: '#888', marginTop: -16, marginBottom: 28 }}>Твои показатели мастерства: как считаются, что получать и как расти</p>

        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,215,0,0.3)', textAlign: 'center', marginBottom: 28, maxWidth: 420 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888' }}>Кармическая энергия</div>
          <div style={{ fontSize: 34, fontWeight: 700, background: 'linear-gradient(135deg, #FFD700, #ffb3c6, #a0e9ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.6))' }}>{data.energy}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 16, marginBottom: 40 }}>
          {data.metrics.map(m => {
            const max = (Math.max(Number(m.thr_ultra) || 0, m.current ?? 0) * 1.2) || 1
            const pct = Math.min(100, ((m.current ?? 0) / max) * 100)
            const marks = [['min', m.thr_min], ['mid', m.thr_mid], ['top', m.thr_top], ['ultra', m.thr_ultra]]
            return (
              <div key={m.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: `1px solid ${BAND_COLORS[m.band]}33` }}>
                <div onClick={() => setExpanded(expanded === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: 0 }}>{m.name}</h3>
                    <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, fontWeight: 700, background: `${BAND_COLORS[m.band]}18`, color: BAND_COLORS[m.band], border: `1px solid ${BAND_COLORS[m.band]}44` }}>
                      {m.current != null ? `${m.current}${m.unit} · ` : ''}{BAND_LABELS[m.band]}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 14 }}>
                    {marks.map(([b, v]) => (
                      <span key={b} title={`${BAND_LABELS[b]}: ${v}${m.unit}`} style={{ position: 'absolute', top: '50%', left: `${Math.min(100, (Number(v) / max) * 100)}%`, width: 2, height: 11, background: 'rgba(255,255,255,0.45)', transform: 'translate(-50%,-50%)', borderRadius: 1 }} />
                    ))}
                    <div style={{ height: '100%', width: pct + '%', borderRadius: 3, background: `linear-gradient(90deg, ${BAND_COLORS[m.band]}40, ${BAND_COLORS[m.band]})`, boxShadow: `0 0 8px ${BAND_COLORS[m.band]}` }} />
                    <span style={{ position: 'absolute', top: '50%', left: pct + '%', transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${BAND_COLORS[m.band]}`, boxShadow: `0 0 10px ${BAND_COLORS[m.band]}` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    {marks.map(([b, v]) => <span key={b} style={{ fontSize: 10, color: BAND_COLORS[b] }}>{BAND_LABELS[b]} {v}</span>)}
                  </div>
                </div>

                {expanded === m.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {m.description && <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}><b style={{ color: '#a0e9ff' }}>Как считается:</b> {m.description}</p>}
                    {m.advice && <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}><b style={{ color: '#4ade80' }}>Советы:</b> {m.advice}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '14px 0' }}>
                      {['min', 'mid', 'top', 'ultra'].map(b => (
                        <div key={b} style={{ padding: 10, borderRadius: 10, textAlign: 'center', background: `${BAND_COLORS[b]}0d`, border: `1px solid ${BAND_COLORS[b]}33` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: BAND_COLORS[b] }}>{BAND_LABELS[b]}</div>
                          <div style={{ fontSize: 14, color: '#fff', marginTop: 2 }}>{m['thr_' + b]}{m.unit}</div>
                          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>+{energyFor(m, b)} эн. · +{karmaFor(m, b)} к.</div>
                        </div>
                      ))}
                    </div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>Материалы для роста</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(m.trainings || []).map(t => {
                        const recommended = t.recommend_below === 'all' || BAND_RANK[m.band] < BAND_RANK[t.recommend_below]
                        return (
                          <div key={t.id} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: recommended ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 13, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                {t.type === 'video' ? <PlayIcon /> : t.type === 'test' ? <TestIcon /> : <TextIcon />} {t.title}
                              </span>
                              {recommended && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.4)', flexShrink: 0 }}>Рекомендуем</span>}
                            </div>
                            {t.type === 'video' && t.url && <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#a0e9ff', display: 'inline-block', marginTop: 6 }}>Смотреть видео →</a>}
                            {t.type === 'text' && t.content && <p style={{ fontSize: 12, color: '#aaa', margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{t.content}</p>}
                            {t.type === 'test' && <button onClick={() => { setActiveTest({ training: t, answers: [] }); setTestResult(null) }} style={{ ...ghostBtn, marginTop: 8, padding: '6px 16px', fontSize: 12 }}>Пройти тест</button>}
                          </div>
                        )
                      })}
                      {(m.trainings || []).length === 0 && <p style={{ fontSize: 12, color: '#666' }}>Материалов пока нет</p>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {data.metrics.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 60, textAlign: 'center', color: '#777' }}>Руководитель ещё не задал показатели</div>}
        </div>

        {oldGoals.length > 0 && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Цели на период</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {oldGoals.map(g => {
                const pct = Math.min(100, ((g.current_value || 0) / (g.target_value || 1)) * 100)
                return (
                  <div key={g.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 14, padding: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{g.title || g.goal_type}</span>
                      <span style={{ fontSize: 13, color: '#888' }}>{g.current_value ?? 0} / {g.target_value}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 10 }}>
                      <div style={{ height: '100%', borderRadius: 2, width: pct + '%', background: pct >= 100 ? '#4ade80' : '#FFD700', boxShadow: `0 0 6px ${pct >= 100 ? '#4ade80' : '#FFD700'}` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {activeTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => !testResult && setActiveTest(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, maxHeight: '85vh', overflowY: 'auto', background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 18px', background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{activeTest.training.title}</h3>
            {(activeTest.training.test_questions || []).map((q, qi) => (
              <div key={qi} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: '#fff', marginBottom: 8 }}>{qi + 1}. {q.q}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(q.options || []).map((opt, oi) => (
                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccc', cursor: 'pointer', padding: '8px 12px', borderRadius: 10, border: `1px solid ${activeTest.answers[qi] === oi ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.08)'}`, background: activeTest.answers[qi] === oi ? 'rgba(255,215,0,0.08)' : 'transparent' }}>
                      <input type="radio" name={`q${qi}`} checked={activeTest.answers[qi] === oi} onChange={() => setActiveTest(a => { const ans = [...a.answers]; ans[qi] = oi; return { ...a, answers: ans } })} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {testResult && (
              <div style={{ padding: 12, borderRadius: 12, marginBottom: 14, textAlign: 'center', background: testResult.passed ? 'rgba(74,222,128,0.1)' : 'rgba(244,67,54,0.1)', color: testResult.passed ? '#4ade80' : '#f87171' }}>
                Результат: {testResult.score}% {testResult.passed ? '— тест пройден, +2 кармика!' : '— попробуй ещё раз'}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setActiveTest(null)} className="btn-outline" style={{ flex: 1 }}>Закрыть</button>
              <button onClick={submitTest} style={{ ...ghostBtn, flex: 1 }}>Ответить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
