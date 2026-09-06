import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '10px 20px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }

export default function TestTake() {
  const router = useRouter()
  const { id } = router.query
  const { showSuccess, showError } = useFeedback()
  const [test, setTest] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const startRef = useRef(Date.now())

  useEffect(() => {
    if (!id) return
    const init = async () => {
      const h = await auth()
      const r = await fetch(`/api/kpi/tests?action=start`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось начать тест'); setLoading(false); return }
      setAttempt(d.attempt); setQuestions(d.questions); setTest(d.test)
      setSeconds((d.test.time_limit || 10) * 60)
      setLoading(false)
    }
    init()
    return () => clearInterval(timerRef.current)
  }, [id])

  const timerRef = useRef(null)
  useEffect(() => {
    if (loading || result) return
    timerRef.current = setInterval(() => setSeconds(s => {
      if (s <= 1) { clearInterval(timerRef.current); submit(true); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(timerRef.current)
  }, [loading, result])

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const q = questions[idx]
  const ans = answers[q?.id] || { option_ids: [], text: '' }
  const setAns = patch => setAnswers(a => ({ ...a, [q.id]: { ...ans, ...patch } }))

  const submit = async (auto = false) => {
    const h = await auth()
    const r = await fetch('/api/kpi/tests?action=submit', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ attempt_id: attempt.id, answers, time_spent: Math.round((Date.now() - startRef.current) / 1000) }) })
    const d = await r.json()
    if (r.ok) {
      setResult(d)
      if (d.passed) showSuccess(`Тест сдан: ${d.score}%`)
      else showError(`Не сдан: ${d.score}% (порог ${test?.passing_score}%)`)
    } else showError(d.error || 'Ошибка отправки')
  }

  if (loading) return <LoadingScreen />

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <BackArrow href="/goals" title={result ? 'Результат' : test?.title || 'Тест'} extra={
          !result && <div style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: seconds < 60 ? '#dc2626' : '#0e7490', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</div>
        } />

        {result ? (
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 40, textAlign: 'center', border: `1px solid ${result.passed ? 'rgba(19,122,57,0.35)' : 'rgba(220,38,38,0.35)'}` }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: result.passed ? '#137a39' : '#dc2626' }}>{result.score}%</div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>{result.passed ? 'Тест сдан! Награды начислены.' : 'Не хватило до порога. Попробуйте ещё раз.'}</div>
            <button onClick={() => router.push('/goals')} style={{ ...ghostBtn, marginTop: 24 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>К целям</button>
          </div>
        ) : q && (
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 28, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              <span>Вопрос {idx + 1} из {questions.length}</span>
              <span>{q.points} балл.</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-page)', marginBottom: 20 }}>
              <div style={{ height: '100%', width: `${((idx + 1) / questions.length) * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #8a6208)', borderRadius: 2 }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>{q.text}</h3>
            {(q.type === 'single' || q.type === 'multi') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map(o => {
                  const sel = ans.option_ids.includes(o.id)
                  return (
                    <label key={o.id} onClick={() => {
                      if (q.type === 'single') setAns({ option_ids: [o.id] })
                      else setAns({ option_ids: sel ? ans.option_ids.filter(x => x !== o.id) : [...ans.option_ids, o.id] })
                    }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, cursor: 'pointer', border: `1px solid ${sel ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: sel ? 'rgba(184,134,11,0.06)' : 'var(--bg-page)', transition: 'all 0.2s' }}>
                      <span style={{ width: 16, height: 16, borderRadius: q.type === 'single' ? '50%' : 4, border: `2px solid ${sel ? '#8a6208' : 'var(--text-muted)'}`, background: sel ? '#8a6208' : 'transparent', flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{o.text}</span>
                    </label>
                  )
                })}
              </div>
            )}
            {(q.type === 'fill' || q.type === 'open') && (
              <textarea className="input-field" style={{ width: '100%' }} rows={q.type === 'open' ? 4 : 1} placeholder="Ваш ответ" value={ans.text} onChange={e => setAns({ text: e.target.value })} />
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="btn-outline" style={{ flex: 1, opacity: idx === 0 ? 0.4 : 1 }}>Назад</button>
              {idx < questions.length - 1
                ? <button onClick={() => setIdx(i => i + 1)} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Далее</button>
                : <button onClick={() => submit()} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(19,122,57,0.4)', color: '#137a39' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Завершить</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
