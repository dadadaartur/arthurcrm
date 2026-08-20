import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import TrainingVideoModal from '../../components/TrainingVideoModal'
import { withAuth } from '../../components/withAuth'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '7px 14px', color: '#fff', cursor: 'pointer', fontSize: 11, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

function LearnAdmin() {
  const [loading, setLoading] = useState(true)
  const [trainings, setTrainings] = useState([])
  const [tests, setTests] = useState([])
  const [video, setVideo] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: tr } = await supabase.from('kpi_trainings').select('*, kpi_metrics(name)')
      const { data: ts } = await supabase.from('tests').select('*').eq('is_active', true).order('created_at', { ascending: false })
      setTrainings(tr || []); setTests(ts || []); setLoading(false)
    }
    init()
  }, [])

  const openPreview = async (test) => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`/api/kpi/tests?action=get&id=${test.id}&mode=edit`, { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (r.ok) setPreview(await r.json())
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Обучение: тренинги и тесты" />

        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#a0e9ff' }}>Тренинги</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 32 }}>
          {trainings.map(t => (
            <div key={t.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Показатель: {t.kpi_metrics?.name || '—'} · {t.type === 'video' ? 'видео' : t.type === 'test' ? 'тест' : 'текст'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                {t.type === 'video' && <button onClick={() => setVideo(t)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Показать видео</button>}
                {t.test_id && <button onClick={() => openPreview({ id: t.test_id })} style={{ ...ghostBtn, borderColor: 'rgba(192,132,252,0.4)', color: '#c084fc' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Тест</button>}
              </div>
            </div>
          ))}
          {trainings.length === 0 && <p style={{ color: '#777', fontSize: 12 }}>Тренингов пока нет</p>}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#c084fc' }}>Тесты</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {tests.map(t => (
            <div key={t.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Порог {t.passing_score}% · Награда {t.karma_reward} карм.</div>
              <div style={{ marginTop: 'auto' }}>
                <button onClick={() => openPreview(t)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Предпросмотр</button>
              </div>
            </div>
          ))}
          {tests.length === 0 && <p style={{ color: '#777', fontSize: 12 }}>Тестов пока нет</p>}
        </div>
      </div>

      {video && <TrainingVideoModal training={video} onClose={() => setVideo(null)} />}

      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setPreview(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 94vw)', maxHeight: '86vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.98), rgba(10,14,28,0.99))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Предпросмотр: {preview.title}</h3>
            {(preview.questions || []).map((q, i) => (
              <div key={q.id} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: '#fff', marginBottom: 8 }}>{i + 1}. {q.text}</div>
                {(q.options || []).map((o, oi) => (
                  <div key={oi} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, marginBottom: 4, background: o.is_correct ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.02)', color: o.is_correct ? '#4ade80' : '#aaa', border: `1px solid ${o.is_correct ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.06)'}` }}>
                    {o.text}{o.is_correct && ' · верно'}
                  </div>
                ))}
                {q.type === 'fill' && <div style={{ fontSize: 12, color: '#4ade80' }}>Ответ: {q.correct_text}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
export default withAuth(LearnAdmin, { permission: 'can_review_tasks' })
