import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import BackArrow from '../components/BackArrow'
import DatePicker from '../components/DatePicker'
import ProgressBar3D from '../components/ProgressBar3D'
import LevelPathModal from '../components/LevelPathModal'
import { BAND_LABELS, BAND_COLORS, BAND_RANK, bandFor, energyFor, karmaFor } from '../lib/kpi'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const todayISO = toISO(new Date())
const shiftISO = n => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d) }
const smallLink = { background: 'none', border: 'none', padding: 0, color: '#a0e9ff', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const pill = a => ({ padding: '6px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`, color: a ? '#FFD700' : '#aaa', fontWeight: a ? 700 : 400 })

export default function GoalsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [levels, setLevels] = useState([])
  const [oldGoals, setOldGoals] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [pathOpen, setPathOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [activeTest, setActiveTest] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [mode, setMode] = useState('today') // today | yesterday | 7d | 30d | all | custom
  const [customDay, setCustomDay] = useState(todayISO)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: { session } } = await supabase.auth.getSession()
      const h = { Authorization: `Bearer ${session.access_token}` }
      const [r1, r2] = await Promise.all([fetch('/api/kpi/my', { headers: h }), fetch('/api/kpi/levels', { headers: h })])
      if (r1.ok) setData(await r1.json())
      if (r2.ok) setLevels(await r2.json())
      const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true)
      setOldGoals(g || [])
      setLoading(false)
    }
    init()
  }, [])

  const submitTest = async () => {
    if (!activeTest) return
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/kpi/test', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ trainingId: activeTest.training.id, answers: activeTest.answers }) })
    if (r.ok) setTestResult(await r.json())
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  if (!data) return <div style={{ padding: '40px 32px', color: '#777' }}>Нет данных</div>

  // ===== Логика периода =====
  const allDates = (data.metrics || []).flatMap(m => (m.history || []).map(e => e.entry_date)).sort()
  const daysAll = allDates.length ? Math.min(365, Math.max(1, Math.round((new Date(todayISO) - new Date(allDates[0])) / 86400000) + 1)) : 1
  const periodDays = mode === 'today' || mode === 'yesterday' || mode === 'custom' ? 1 : mode === '7d' ? 7 : mode === '30d' ? 30 : daysAll
  const inRange = d => {
    if (mode === 'today') return d === todayISO
    if (mode === 'yesterday') return d === shiftISO(-1)
    if (mode === 'custom') return d === customDay
    if (mode === '7d') return d >= shiftISO(-6) && d <= todayISO
    if (mode === '30d') return d >= shiftISO(-29) && d <= todayISO
    return true
  }
  const valueFor = m => {
    const list = (m.history || []).filter(e => inRange(e.entry_date))
    if (!list.length) return null
    if (periodDays === 1) return Number(list[0].value)
    return Math.round(list.reduce((s, e) => s + Number(e.value), 0) * 10) / 10
  }
  const scaled = m => ({ ...m, thr_min: m.thr_min * periodDays, thr_mid: m.thr_mid * periodDays, thr_top: m.thr_top * periodDays, thr_ultra: m.thr_ultra * periodDays })
  const periodLabel = mode === 'today' ? 'за сегодня' : mode === 'yesterday' ? 'за вчера' : mode === 'custom' ? `за ${customDay}` : `накопительно за ${periodDays} дн.`

  const energy = data.energy || 0
  let cur = null, next = null
  levels.forEach(l => { if (energy >= l.energy_threshold) cur = l })
  next = levels.find(l => l.energy_threshold > energy) || null
  const remaining = next ? next.energy_threshold - energy : 0
  const forecast = []
  if (next) {
    data.metrics.forEach(m => ['min', 'mid', 'top', 'ultra'].forEach(b => {
      const e = energyFor(m, b)
      if (e > 0) forecast.push({ name: m.name, band: b, thr: m['thr_' + b], unit: m.unit, e, days: Math.ceil(remaining / e) })
    }))
    forecast.sort((a, b) => a.days - b.days)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/" title="Мои цели" extra={
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Энергия</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{energy}</div>
            {next && <div style={{ fontSize: 10, color: '#888' }}>ещё {remaining} до «{next.name}»</div>}
          </div>
        } />

        {/* Уровень + советы/путь — только здесь */}
        {cur && (
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 18, border: `1px solid ${cur.color}33`, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: cur.color, textShadow: `0 0 10px ${cur.color}` }}>{cur.name}</span>
                {next && <span style={{ fontSize: 12, color: '#888' }}>→ {next.name}</span>}
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <button onClick={() => setTipsOpen(o => !o)} style={smallLink}>советы по достижению</button>
                <button onClick={() => setPathOpen(true)} style={smallLink}>путь прогресса</button>
              </div>
            </div>
            <ProgressBar3D value={next ? energy - cur.energy_threshold : 1} height={16} />
            {tipsOpen && next && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {forecast.length === 0 && <p style={{ fontSize: 12, color: '#777' }}>Нет активных показателей для прогноза</p>}
                {forecast.slice(0, 3).map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#ccc', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    Держать «{f.name}» ≥ <b style={{ color: BAND_COLORS[f.band] }}>{f.thr}{f.unit}</b> ({BAND_LABELS[f.band]}): +{f.e} эн./день → ≈ <b style={{ color: '#FFD700' }}>{f.days} дн.</b> до «{next.name}»
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Фирменный фильтр даты */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[['today', 'Сегодня'], ['yesterday', 'Вчера'], ['7d', '7 дней'], ['30d', '30 дней'], ['all', 'Всё время']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={pill(mode === k)}>{l}</button>
          ))}
          <div style={{ width: 190 }}><DatePicker value={customDay} onChange={v => { if (v) { setCustomDay(v); setMode('custom') } }} placeholder="Своя дата" /></div>
          <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>Показатели {periodLabel}{periodDays > 1 ? ' (пороги ×' + periodDays + ')' : ''}</span>
        </div>

        {/* Показатели */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 16, marginBottom: 40 }}>
          {data.metrics.map(m => {
            const sm = scaled(m)
            const value = valueFor(m)
            const band = value != null ? bandFor(value, sm) : 'none'
            return (
              <div key={m.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 20, border: `1px solid ${BAND_COLORS[band]}33` }}>
                <div onClick={() => setExpanded(expanded === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
                  {/* Строка 1: название (обрезка) + значение */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: BAND_COLORS[band], whiteSpace: 'nowrap', flexShrink: 0 }}>{value != null ? `${value}${m.unit}` : '—'}</span>
                  </div>
                  {/* Строка 2: шкала */}
                  <ProgressBar3D value={value ?? 0} marks={[{ key: 'min', value: sm.thr_min }, { key: 'mid', value: sm.thr_mid }, { key: 'top', value: sm.thr_top }, { key: 'ultra', value: sm.thr_ultra }]} />
                  {/* Строка 3: пороги слева, уровень справа — всегда одинаково */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 10 }}>
                    <span style={{ fontSize: 10, color: '#777', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      мин {sm.thr_min} · средн {sm.thr_mid} · топ {sm.thr_top} · ультра {sm.thr_ultra}{m.unit}
                    </span>
                    <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 700, background: `${BAND_COLORS[band]}18`, color: BAND_COLORS[band], border: `1px solid ${BAND_COLORS[band]}44`, whiteSpace: 'nowrap', flexShrink: 0 }}>{BAND_LABELS[band]}</span>
                  </div>
                </div>
                {expanded === m.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 6 }}>{m.name}</p>
                    {m.description && <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}><b style={{ color: '#a0e9ff' }}>Как считается:</b> {m.description}</p>}
                    {m.advice && <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}><b style={{ color: '#4ade80' }}>Советы:</b> {m.advice}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0' }}>
                      {['min', 'mid', 'top', 'ultra'].map(b => (
                        <div key={b} style={{ padding: 10, borderRadius: 10, textAlign: 'center', background: `${BAND_COLORS[b]}0d`, border: `1px solid ${BAND_COLORS[b]}33` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: BAND_COLORS[b] }}>{BAND_LABELS[b]}</div>
                          <div style={{ fontSize: 14, color: '#fff', marginTop: 2 }}>{m['thr_' + b]}{m.unit}</div>
                          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>+{energyFor(m, b)} эн. · +{karmaFor(m, b)} к.</div>
                        </div>
                      ))}
                    </div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>Материалы для роста</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(m.trainings || []).map(t => {
                        const recommended = t.recommend_below === 'all' || BAND_RANK[band] < BAND_RANK[t.recommend_below]
                        return (
                          <div key={t.id} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: recommended ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, color: '#fff' }}>{t.title}</span>
                              {recommended && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.4)', whiteSpace: 'nowrap' }}>Рекомендуем</span>}
                            </div>
                            {t.type === 'video' && t.url && <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#a0e9ff', display: 'inline-block', marginTop: 6 }}>Смотреть видео →</a>}
                            {t.type === 'text' && t.content && <p style={{ fontSize: 12, color: '#aaa', margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{t.content}</p>}
                            {t.type === 'test' && <button onClick={() => { setActiveTest({ training: t, answers: [] }); setTestResult(null) }} style={{ ...ghostBtn, marginTop: 8 }}>Пройти тест</button>}
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

        {/* Глобальные цели на период */}
        {oldGoals.length > 0 && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Глобальные цели на период</h2>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Количественные цели руководителя (звонки, письма, сделки). Прогресс обновляет руководитель.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {oldGoals.map(g => {
                const pct = Math.min(100, ((g.current_value || 0) / (g.target_value || 1)) * 100)
                const done = pct >= 100
                return (
                  <div key={g.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 14, padding: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}>{g.title || g.goal_type}</span>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, background: done ? 'rgba(74,222,128,0.15)' : 'rgba(255,215,0,0.12)', color: done ? '#4ade80' : '#FFD700' }}>{done ? 'Выполнено' : `${Math.round(pct)}%`}</span>
                    </div>
                    <ProgressBar3D value={g.current_value || 0} marks={[{ key: 't', value: g.target_value }]} height={12} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 5 }}>
                      <span>Сейчас: {g.current_value ?? 0}</span>
                      <span>Цель: {g.target_value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <LevelPathModal open={pathOpen} onClose={() => setPathOpen(false)} energy={energy} />

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
