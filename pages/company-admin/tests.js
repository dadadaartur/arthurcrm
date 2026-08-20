import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import TrainingVideoModal from '../../components/TrainingVideoModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 18px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{
    padding: '8px 18px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
    background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`, color: active ? color : '#999',
    transition: 'all 0.25s ease', backdropFilter: 'blur(8px)', boxShadow: active ? `0 0 14px ${color}22` : 'none'
  }}>{children}</button>
)
const emptyQ = () => ({ type: 'single', text: '', points: 10, difficulty: 1, correct_text: '', options: [{ text: '', is_correct: true }, { text: '', is_correct: false }] })
const defaultForm = { title: '', description: '', video_url: '', training_id: '', time_limit: 10, passing_score: 70, attempts_allowed: 3, is_random: true, show_correct_answers: true, karma_reward: 0 }

function TestsAdmin() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [editId, setEditId] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [training, setTraining] = useState(null)
  const [video, setVideo] = useState(null)
  const [companyKarma, setCompanyKarma] = useState(0)
  const [form, setForm] = useState(defaultForm)
  const [questions, setQuestions] = useState([emptyQ()])

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => { const h = await auth(); const r = await fetch('/api/kpi/tests?action=list', { headers: h }); if (r.ok) setTests(await r.json()); setLoading(false) }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
        if (prof) {
          const { data: acc } = await supabase.from('company_karma_accounts').select('balance').eq('company_id', prof.company_id).maybeSingle()
          setCompanyKarma(acc?.balance || 0)
        }
      }
      await load()
      if (router.query.training) {
        const { data: tr } = await supabase.from('kpi_trainings').select('*').eq('id', router.query.training).maybeSingle()
        if (tr) { setTraining(tr); setForm(f => ({ ...f, training_id: tr.id, title: f.title || tr.title })) }
      }
    }
    init()
  }, [])

  const openEdit = async (id) => {
    const h = await auth()
    const r = await fetch(`/api/kpi/tests?action=get&id=${id}&mode=edit`, { headers: h })
    if (!r.ok) { showError('Не удалось загрузить тест'); return }
    const t = await r.json()
    setEditId(id)
    setForm({ title: t.title, description: t.description || '', video_url: t.video_url || '', training_id: t.training_id || '', time_limit: t.time_limit, passing_score: t.passing_score, attempts_allowed: t.attempts_allowed, is_random: t.is_random, show_correct_answers: t.show_correct_answers, karma_reward: t.karma_reward })
    setQuestions(t.questions.map(q => ({ type: q.type, text: q.text, points: q.points, difficulty: q.difficulty, correct_text: q.correct_text || '', options: q.options.map(o => ({ text: o.text, is_correct: o.is_correct })) })))
    if (t.training_id) { const { data: tr } = await supabase.from('kpi_trainings').select('*').eq('id', t.training_id).maybeSingle(); setTraining(tr) }
    setView('builder')
  }
  const openAnalytics = async (id) => {
    setView('analytics'); setAnalytics(null)
    const h = await auth()
    const r = await fetch(`/api/kpi/tests?action=results&id=${id}`, { headers: h })
    if (r.ok) setAnalytics(await r.json())
  }
  const save = async () => {
    if (!form.title.trim()) { showError('Укажите название теста'); return }
    if (questions.some(q => !q.text.trim())) { showError('Заполните текст всех вопросов'); return }
    const h = await auth()
    const body = { ...form, karma_reward: Math.min(5, Math.max(0, form.karma_reward)), energy_reward: 5, questions }
    const r = editId
      ? await fetch('/api/kpi/tests?action=update', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...body }) })
      : await fetch('/api/kpi/tests?action=create', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) { showSuccess(editId ? 'Тест обновлён' : 'Тест опубликован, сотрудники уведомлены'); setView('list'); setEditId(null); setQuestions([emptyQ()]); setForm(defaultForm); load() }
    else showError('Ошибка сохранения')
  }
  const del = async (id) => { const h = await auth(); await fetch('/api/kpi/tests?action=delete', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); showSuccess('Тест удалён'); load() }

  const setQ = (i, patch) => setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  const setOpt = (i, oi, patch) => setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, ...patch } : o) } : q))

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin/mastery" title="Тесты и срезы знаний" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#888', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(255,215,0,0.06)' }}>Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.</span>
            <Seg active={view === 'list'} onClick={() => setView('list')}>Список</Seg>
            <Seg active={view === 'builder'} onClick={() => { setView('builder'); setEditId(null); setQuestions([emptyQ()]); setForm(defaultForm) }}>Конструктор</Seg>
          </div>
        } />

        {view === 'list' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
            {tests.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Тестов пока нет — создайте первый в конструкторе</div>}
            {tests.map(t => (
              <div key={t.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.25s', display: 'flex', flexDirection: 'column', gap: 12 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,132,252,0.4)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: '#888' }}>Вопросов: {t.question_count} · Попыток: {t.attempts_count} · Сдача: {t.pass_rate}%</div>
                <div style={{ fontSize: 11, color: '#a0e9ff' }}>Порог {t.passing_score}% · Награда: {t.karma_reward} карм. / 5 эн.</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
                  <button onClick={() => openAnalytics(t.id)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Аналитика</button>
                  <button onClick={() => openEdit(t.id)} style={{ ...ghostBtn, borderColor: 'rgba(160,233,255,0.4)', color: '#a0e9ff' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Редактировать</button>
                  <button onClick={() => del(t.id)} style={{ ...ghostBtn, borderColor: 'rgba(244,67,54,0.3)', color: '#f87171' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'builder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>{editId ? 'Редактировать тест' : 'Новый тест'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название</label>
                  <input className="input-field" style={{ width: '100%' }} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Видео (ссылка при загрузке)</label>
                    <input className="input-field" style={{ width: '100%' }} value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} />
                  </div>
                  {training && <button type="button" onClick={() => setVideo(training)} style={{ ...ghostBtn, padding: '9px 14px', fontSize: 11, whiteSpace: 'nowrap' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Показать тренинг</button>}
                </div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Время (мин)</label><input type="number" className="input-field" style={{ width: 90 }} value={form.time_limit} onChange={e => setForm({ ...form, time_limit: +e.target.value })} /></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Порог %</label><input type="number" className="input-field" style={{ width: 90 }} value={form.passing_score} onChange={e => setForm({ ...form, passing_score: +e.target.value })} /></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Попытки</label><input type="number" className="input-field" style={{ width: 90 }} value={form.attempts_allowed} onChange={e => setForm({ ...form, attempts_allowed: +e.target.value })} /></div>
                <div>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Кармики (макс 5)</label>
                  <input type="number" min="0" max="5" className="input-field" style={{ width: 90 }} value={form.karma_reward} onChange={e => setForm({ ...form, karma_reward: Math.min(5, Math.max(0, +e.target.value)) })} />
                  <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Баланс компании: <b style={{ color: '#FFD700' }}>{companyKarma}</b>. Энергия фиксирована: 5.</div>
                </div>
                <div style={{ gridColumn: 'span 4', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#ccc', cursor: 'pointer' }}><input type="checkbox" checked={form.is_random} onChange={e => setForm({ ...form, is_random: e.target.checked })} style={{ accentColor: '#c084fc' }} />Случайный порядок</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#ccc', cursor: 'pointer' }}><input type="checkbox" checked={form.show_correct_answers} onChange={e => setForm({ ...form, show_correct_answers: e.target.checked })} style={{ accentColor: '#c084fc' }} />Показывать ответы после</label>
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание</label>
                  <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>

            {questions.map((q, i) => (
              <div key={i} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#c084fc', fontWeight: 700 }}>Вопрос {i + 1}</span>
                  <select className="input-field" value={q.type} onChange={e => setQ(i, { type: e.target.value })}>
                    <option value="single">Одиночный</option><option value="multi">Множественный</option><option value="fill">Пропуск</option><option value="open">Открытый</option>
                  </select>
                  <input type="number" className="input-field" style={{ width: 80 }} value={q.points} onChange={e => setQ(i, { points: +e.target.value })} title="Баллы" />
                  <select className="input-field" value={q.difficulty} onChange={e => setQ(i, { difficulty: +e.target.value })}>
                    <option value={1}>Лёгкий</option><option value={2}>Средний</option><option value={3}>Сложный</option>
                  </select>
                  <button onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>Удалить</button>
                </div>
                <input className="input-field" style={{ width: '100%', marginBottom: 12 }} placeholder="Текст вопроса" value={q.text} onChange={e => setQ(i, { text: e.target.value })} />
                {(q.type === 'single' || q.type === 'multi') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options.map((o, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input type={q.type === 'single' ? 'radio' : 'checkbox'} name={`correct-${i}`} checked={o.is_correct} onChange={e => {
                          if (q.type === 'single') setQuestions(qs => qs.map((qq, idx) => idx === i ? { ...qq, options: qq.options.map((oo, j) => ({ ...oo, is_correct: j === oi })) } : qq))
                          else setOpt(i, oi, { is_correct: e.target.checked })
                        }} style={{ accentColor: '#4ade80' }} />
                        <input className="input-field" style={{ flex: 1 }} placeholder={`Вариант ${oi + 1}`} value={o.text} onChange={e => setOpt(i, oi, { text: e.target.value })} />
                        <button onClick={() => setQuestions(qs => qs.map((qq, idx) => idx === i ? { ...qq, options: qq.options.filter((_, j) => j !== oi) } : qq))} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => setQuestions(qs => qs.map((qq, idx) => idx === i ? { ...qq, options: [...qq.options, { text: '', is_correct: false }] } : qq))} style={{ ...ghostBtn, padding: '6px 14px', fontSize: 11, alignSelf: 'flex-start' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить вариант</button>
                  </div>
                )}
                {q.type === 'fill' && <input className="input-field" style={{ width: '100%' }} placeholder="Правильный ответ (для пропуска)" value={q.correct_text} onChange={e => setQ(i, { correct_text: e.target.value })} />}
                {q.type === 'open' && <input className="input-field" style={{ width: '100%' }} placeholder="Рекомендованный ответ (для ручной проверки)" value={q.correct_text} onChange={e => setQ(i, { correct_text: e.target.value })} />}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setQuestions(qs => [...qs, emptyQ()])} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить вопрос</button>
              <button onClick={save} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{editId ? 'Сохранить' : 'Опубликовать'}</button>
            </div>
          </div>
        )}

        {view === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={() => setView('list')} style={{ ...ghostBtn, alignSelf: 'flex-start', padding: '8px 16px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>К списку</button>
            {!analytics ? <Spinner /> : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,215,0,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Средний балл</div><div style={{ fontSize: 30, fontWeight: 700, color: '#FFD700' }}>{analytics.avg}%</div></div>
                  <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(160,233,255,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Попыток</div><div style={{ fontSize: 30, fontWeight: 700, color: '#a0e9ff' }}>{analytics.attempts.length}</div></div>
                  <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(74,222,128,0.2)' }}><div style={{ fontSize: 11, color: '#888' }}>Сдали</div><div style={{ fontSize: 30, fontWeight: 700, color: '#4ade80' }}>{analytics.attempts.filter(x => x.is_passed).length}</div></div>
                </div>
                <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Топ ошибок</h4>
                  {analytics.mistakes.length === 0 ? <p style={{ color: '#777', fontSize: 12 }}>Ошибок пока нет</p> : analytics.mistakes.map((m, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 8, fontSize: 12, color: '#ccc' }}>
                      {m.text} <span style={{ color: '#f87171', marginLeft: 8 }}>{Math.round(m.wrong / m.total * 100)}% ошибаются</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Попытки сотрудников</h4>
                  {analytics.attempts.map(at => (
                    <div key={at.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 8, fontSize: 12 }}>
                      <span style={{ color: '#fff' }}>{[at.profiles?.first_name, at.profiles?.last_name].filter(Boolean).join(' ') || at.profiles?.email}</span>
                      <span style={{ color: at.is_passed ? '#4ade80' : '#f87171' }}>{at.score}% {at.is_passed ? '· сдал' : '· не сдал'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {video && <TrainingVideoModal training={video} onClose={() => setVideo(null)} />}
    </div>
  )
}
export default withAuth(TestsAdmin, { permission: 'can_review_tasks' })
