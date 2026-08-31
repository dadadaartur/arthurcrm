import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from '../components/LoadingScreen'
import BackArrow from '../components/BackArrow'
import DatePicker from '../components/DatePicker'
import ProgressBar3D from '../components/ProgressBar3D'
import LevelPathModal from '../components/LevelPathModal'
import TrainingVideoModal from '../components/TrainingVideoModal'
import GiftRibbon from '../components/GiftRibbon'
import { useFeedback } from '../context/ActionFeedbackContext'
import { BAND_LABELS, BAND_COLORS, bandRankOf, bandFor, rangeValue, resolveThresholds } from '../lib/kpi'
import PeriodHint, { PERIOD_LABELS } from '../components/PeriodHint'

// Оригинальные BAND_COLORS (из lib/kpi.js) — светлый/пастельный набор,
// подобранный под тёмный фон, ещё используется в неpereделанной
// company-admin/mastery.js. Общий модуль менять нельзя — там сломается
// контраст на тёмном. Здесь, для уже светлой страницы — своя, более
// насыщенная версия тех же самых 5 цветов, чтобы читалось как текст на
// белом фоне.
const BAND_COLORS_LIGHT = { none: '#dc2626', min: '#b45309', mid: '#8a6208', top: '#137a39', ultra: '#9333ea' }

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const todayISO = toISO(new Date())
const shiftISO = n => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d) }

const ghostBtn = {
  background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12,
  padding: '8px 18px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s'
}
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{
    padding: '8px 18px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
    background: active ? `linear-gradient(135deg, ${color}22, ${color}0d)` : 'var(--bg-card)',
    border: `1px solid ${active ? color + '88' : 'var(--border-subtle)'}`,
    color: active ? color : 'var(--text-muted)', transition: 'all 0.25s ease',
    boxShadow: active ? `0 0 14px ${color}22` : 'none'
  }}
  onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#ddd' } }}
  onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' } }}>
    {children}
  </button>
)

export default function GoalsPage() {
  const { showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [levels, setLevels] = useState([])
  const [oldGoals, setOldGoals] = useState([])
  const [pathOpen, setPathOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [mode, setMode] = useState('today')
  const [customDay, setCustomDay] = useState(todayISO)
  const [videoTraining, setVideoTraining] = useState(null)
  const [detailsMetric, setDetailsMetric] = useState(null)
  const [activeTest, setActiveTest] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [myTests, setMyTests] = useState([])
  const [myViews, setMyViews] = useState([])
  const [globalGoals, setGlobalGoals] = useState([])
  const [wheelSpins, setWheelSpins] = useState(0)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [wheelConfig, setWheelConfig] = useState(null)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [wheelResult, setWheelResult] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: { session } } = await supabase.auth.getSession()
      const h = { Authorization: `Bearer ${session.access_token}` }
      const [r1, r2, r3] = await Promise.all([fetch('/api/kpi/my', { headers: h }), fetch('/api/kpi/levels', { headers: h }), fetch('/api/global-goals/my', { headers: h })])
      if (r1.ok) setData(await r1.json())
      if (r2.ok) setLevels(await r2.json())
      if (r3.ok) setGlobalGoals(await r3.json())
      const { data: p } = await supabase.from('profiles').select('wheel_spins_available').eq('user_id', user.id).maybeSingle()
      setWheelSpins(p?.wheel_spins_available || 0)
      const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true)
      setOldGoals(g || [])
      // Личная статистика
      const { data: tr } = await supabase.from('test_attempts').select('*').eq('user_id', user.id).order('completed_at', { ascending: false })
      const { data: vw } = await supabase.from('training_views').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setMyTests(tr || [])
      setMyViews(vw || [])
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
    if (r.ok) {
      const result = await r.json()
      setTestResult(result)
      const { data: newTests } = await supabase.from('test_attempts').select('*').eq('user_id', (await supabase.auth.getUser()).data.user.id).order('completed_at', { ascending: false })
      setMyTests(newTests || [])
    }
  }

  if (loading) return <LoadingScreen />
  if (!data) return <div style={{ padding: '40px 32px', color: 'var(--text-muted)' }}>Нет данных</div>

  const inRange = d => {
    if (mode === 'today') return d === todayISO
    if (mode === 'yesterday') return d === shiftISO(-1)
    if (mode === 'custom') return d === customDay
    if (mode === '7d') return d >= shiftISO(-6) && d <= todayISO
    if (mode === '30d') return d >= shiftISO(-29) && d <= todayISO
    return true
  }
  const metricView = m => {
    const list = (m.history || []).filter(e => inRange(e.entry_date))
    const rv = rangeValue(m, list)
    if (!rv) return { value: null, band: 'none', thresholds: resolveThresholds(m) }
    // Пороги растянуты под выбранный период (rv.scale) — раньше это делалось
    // через 4 захардкоженных столбца, теперь — через произвольный список
    // resolveThresholds(m), что одинаково работает и со стандартным
    // 4-уровневым шаблоном, и с кастомными порогами.
    const scaledThresholds = resolveThresholds(m).map(t => ({ ...t, value: t.value * rv.scale }))
    const sm = { ...m, thresholds: scaledThresholds }
    const band = rv.gate === false ? 'none' : bandFor(rv.value, sm)
    return { value: rv.value, band, thresholds: scaledThresholds }
  }

  const energy = data.energy || 0
  let cur = null, next = null
  levels.forEach(l => { if (energy >= l.energy_threshold) cur = l })
  next = levels.find(l => l.energy_threshold > energy) || null
  const remaining = next ? next.energy_threshold - energy : 0
  const forecast = []
  if (next) {
    data.metrics.forEach(m => resolveThresholds(m).forEach(t => {
      const e = t.energy
      if (e > 0) forecast.push({ name: m.name, band: t.key, thr: t.value, color: t.color, label: t.label, unit: m.unit, e, days: Math.ceil(remaining / e) })
    }))
    forecast.sort((a, b) => a.days - b.days)
  }
  const periodLabel = mode === 'today' ? 'за сегодня' : mode === 'yesterday' ? 'за вчера' : mode === 'custom' ? `за ${customDay}` : mode === '7d' ? 'накопительно за 7 дн.' : mode === '30d' ? 'накопительно за 30 дн.' : 'за всё время'

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/" title="Мои цели" />

        {/* Цели компании — компактная горизонтальная лента, не вторая
            колонка широкой строки-баннера, как раньше. Видна сразу,
            но не отбирает у показателей вертикальное пространство. */}
        {globalGoals.length > 0 && (
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: '12px 16px', border: '1px solid var(--border-gold)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Цели компании</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>командные и разовые — не привязаны к вашим личным показателям</span>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 2 }}>
              {globalGoals.map(g => {
                const pct = g.target_value ? Math.min(100, Math.round((g.current_value || 0) / g.target_value * 100)) : 0
                return (
                  <div key={g.id} style={{ flex: '0 0 200px', padding: 10, borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</div>
                    <ProgressBar3D value={g.current_value || 0} marks={[{ key: 't', value: g.target_value }]} height={6} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-secondary)' }}>
                      <span>{g.current_value || 0}/{g.target_value}{g.unit}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Постоянная сетка на весь остаток страницы: основной контент
            (фильтр периода + карточки показателей) слева, узкая колонка
            энергии/уровня справа — не отдельная широкая строка сверху,
            как раньше. sticky — колонка остаётся на виду при прокрутке
            длинного списка показателей. */}
        <div style={{ display: 'grid', gridTemplateColumns: cur ? '1fr minmax(240px, 280px)' : '1fr', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <Seg active={mode === 'today'} onClick={() => setMode('today')}>Сегодня</Seg>
              <Seg active={mode === 'yesterday'} onClick={() => setMode('yesterday')}>Вчера</Seg>
              <Seg active={mode === '7d'} onClick={() => setMode('7d')}>7 дней</Seg>
              <Seg active={mode === '30d'} onClick={() => setMode('30d')}>30 дней</Seg>
              <Seg active={mode === 'all'} onClick={() => setMode('all')}>Всё время</Seg>
              <div style={{ width: 180 }}><DatePicker value={customDay} onChange={v => { if (v) { setCustomDay(v); setMode('custom') } }} placeholder="Своя дата" /></div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Показатели {periodLabel}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 18, marginBottom: 40 }}>
          {data.metrics.map(m => {
            const { value, band, thresholds } = metricView(m)
            const myRank = bandRankOf(m, band)
            return (
              <div key={m.id} onClick={() => setDetailsMetric(m)} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, padding: 22, border: `1px solid ${BAND_COLORS_LIGHT[band]}33`, transition: 'border-color 0.25s, transform 0.25s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${BAND_COLORS_LIGHT[band]}66`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${BAND_COLORS_LIGHT[band]}33`; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.12)' }}>{PERIOD_LABELS[m.period || 'daily']}</span>
                  <PeriodHint period={m.period || 'daily'} resetHour={m.reset_hour ?? 8} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', minWidth: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{m.name}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: BAND_COLORS_LIGHT[band], whiteSpace: 'nowrap', flexShrink: 0 }}>{value != null ? `${value}${m.unit}` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Текущий уровень:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 12px', borderRadius: 20, background: `${BAND_COLORS_LIGHT[band]}18`, color: BAND_COLORS_LIGHT[band], border: `1px solid ${BAND_COLORS_LIGHT[band]}44` }}>{BAND_LABELS[band]}</span>
                </div>

                {/* Рейтинговая шкала — достигнутые уровни залиты и светятся,
                    недостигнутые — контуром. Видно с одного взгляда, где ты
                    сейчас и что нужно, чтобы продвинуться дальше. */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {thresholds.map((t, i) => {
                    const achieved = myRank >= i + 1
                    const isCurrent = t.key === band
                    return (
                      <div key={t.key} style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '10px 6px', borderRadius: 10, position: 'relative', background: achieved ? `${t.color}26` : 'var(--bg-page)', border: `1.5px solid ${achieved ? t.color : 'var(--border-subtle)'}`, boxShadow: isCurrent ? `0 0 14px ${t.color}66` : 'none', transition: 'all 0.3s' }}>
                        {isCurrent && <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: 8, padding: '1px 6px', borderRadius: 20, background: t.color, color: '#0a0e1c', fontWeight: 700, whiteSpace: 'nowrap' }}>ВЫ ЗДЕСЬ</span>}
                        <div style={{ fontSize: 9, color: achieved ? t.color : '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                        <div style={{ fontSize: 15, color: achieved ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>{t.value}<span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{m.unit}</span></div>
                      </div>
                    )
                  })}
                </div>

                {(m.reward_image_url || m.reward_description) && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, padding: 10, borderRadius: 12, background: 'rgba(184,134,11,0.05)', border: '1px solid var(--border-gold)' }}>
                    {m.reward_image_url && <img src={m.reward_image_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Приз за максимум</div>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.reward_description}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {data.metrics.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Руководитель ещё не задал показатели</div>}
            </div>
          </div>

          {/* Боковая колонка — энергия, уровень, путь прогресса, советы,
              лента подарков. Раньше это была отдельная широкая строка
              сверху страницы (пункт 6 фидбека от 31 августа 2026 — «пол
              экрана пустого») — теперь узкая постоянная колонка, не
              отбирает место у самих карточек показателей. */}
          {cur && (
            <div style={{ position: 'sticky', top: 20, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, padding: 18, border: `1px solid ${cur.color}33` }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Энергия</div>
                <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, background: 'linear-gradient(135deg, #8a6208, #0e7490)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{energy}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: cur.color }}>{cur.name}</span>
                <button onClick={() => setPathOpen(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-cyan)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>путь →</button>
              </div>
              {next && <ProgressBar3D value={energy - cur.energy_threshold} max={next.energy_threshold - cur.energy_threshold} height={8} />}
              {next ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>ещё {remaining} до «{next.name}»</span>
                  <button onClick={() => setTipsOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>советы</button>
                </div>
              ) : <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>Максимальный уровень достигнут</div>}
              {tipsOpen && next && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {forecast.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Нет активных показателей для прогноза</p>}
                  {forecast.slice(0, 2).map((f, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 8, background: 'var(--bg-page)' }}>
                      «{f.name}» ≥ <b style={{ color: f.color }}>{f.thr}{f.unit}</b>: +{f.e} эн./день → ≈{f.days} дн.
                    </div>
                  ))}
                </div>
              )}

              {wheelSpins > 0 && (
                <button onClick={async () => {
                  setWheelResult(null); setWheelOpen(true)
                  if (!wheelConfig) {
                    const { data: { session } } = await supabase.auth.getSession()
                    const r = await fetch('/api/company-admin/wheel-config', { headers: { Authorization: `Bearer ${session.access_token}` } })
                    if (r.ok) setWheelConfig(await r.json())
                  }
                }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 14, padding: '10px 14px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(184,134,11,0.12))', border: '1px solid var(--border-gold)', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600, animation: 'pulseGlow 2s ease-in-out infinite' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" /><path d="M12 8v13M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8" /><path d="M12 8c-1.5-4-6-4-6-1s3 1 6 1M12 8c1.5-4 6-4 6-1s-3 1-6 1" /></svg>
                  Лента подарков · {wheelSpins}
                </button>
              )}
            </div>
          )}
        </div>

        {oldGoals.length > 0 && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Глобальные цели на период</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Количественные цели руководителя. Прогресс обновляет руководитель.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {oldGoals.map(g => {
                const pct = Math.min(100, ((g.current_value || 0) / (g.target_value || 1)) * 100)
                const done = pct >= 100
                return (
                  <div key={g.id} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 18, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}>{g.title || g.goal_type}</span>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, background: done ? 'rgba(74,222,128,0.15)' : 'rgba(255,215,0,0.12)', color: done ? '#4ade80' : '#FFD700' }}>{done ? 'Выполнено' : `${Math.round(pct)}%`}</span>
                    </div>
                    <ProgressBar3D value={g.current_value || 0} marks={[{ key: 't', value: g.target_value }]} height={12} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>
                      <span>Сейчас: {g.current_value ?? 0}</span>
                      <span>Цель: {g.target_value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {(myTests.length > 0 || myViews.length > 0) && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Мои результаты</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {myTests.filter(t => t.completed_at).map(t => (
                <div key={t.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-card)', border: `1px solid ${t.is_passed ? 'rgba(74,222,128,0.3)' : 'rgba(244,67,54,0.3)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>Тест #{t.test_id}</span>
                    <span style={{ color: t.is_passed ? '#4ade80' : '#f87171', fontWeight: 700 }}>{t.score}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                    <span>{new Date(t.completed_at).toLocaleDateString('ru')}</span>
                    <span>{t.is_passed ? 'сдан' : 'не сдан'}</span>
                  </div>
                </div>
              ))}
              {myViews.filter(v => v.completed).map(v => (
                <div key={v.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid rgba(74,222,128,0.25)' }}>
                  <div style={{ color: 'var(--accent-green)', fontSize: 13, fontWeight: 500 }}>Тренинг просмотрен</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{new Date(v.created_at).toLocaleDateString('ru')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LevelPathModal open={pathOpen} onClose={() => setPathOpen(false)} energy={energy} />
      {videoTraining && <TrainingVideoModal training={videoTraining} onClose={() => setVideoTraining(null)} />}

      {wheelOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={() => !wheelSpinning && setWheelOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 24, padding: 32, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--text-primary)' }}>Лента подарков</h3>
            {wheelConfig === null ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Загрузка...</p>
            ) : wheelConfig.prizes?.length ? (
              <GiftRibbon
                prizes={wheelConfig.prizes}
                spinning={wheelSpinning}
                result={wheelResult}
                onSpin={async (spinTo) => {
                  setWheelSpinning(true)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const r = await fetch('/api/wheel/spin', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
                    const d = await r.json()
                    if (!r.ok) { showError?.(d.error); setWheelSpinning(false); return }
                    spinTo(d.prizeId)
                    setWheelSpins(d.spinsLeft)
                    setTimeout(() => { setWheelResult(d.prize); setWheelSpinning(false) }, 4300)
                  } catch (e) { showError?.('Не получилось прокрутить ленту — проверьте соединение'); setWheelSpinning(false) }
                }}
              />
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Лента подарков пока не настроена</p>
            )}
            <button onClick={() => setWheelOpen(false)} className="btn-outline" style={{ marginTop: 24, minWidth: 120 }}>Закрыть</button>
          </div>
        </div>
      )}

      {/* Модалка деталей показателя */}
      {detailsMetric && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDetailsMetric(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(780px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setDetailsMetric(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'transform 0.3s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
                <circle cx="17" cy="17" r="15" stroke="#dc2626" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 5" style={{ transformOrigin: '17px 17px', animation: 'mxSpin 6s linear infinite' }} />
                <path d="M12 12 L22 22 M22 12 L12 22" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px', paddingRight: 40 }}>{detailsMetric.name}</h3>
            {detailsMetric.description && <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 8px' }}><b style={{ color: 'var(--accent-cyan)' }}>Как считается:</b> {detailsMetric.description}</p>}
            {detailsMetric.advice && <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 16px' }}><b style={{ color: 'var(--accent-green)' }}>Советы:</b> {detailsMetric.advice}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${resolveThresholds(detailsMetric).length}, 1fr)`, gap: 8, margin: '0 0 20px' }}>
              {resolveThresholds(detailsMetric).map(t => (
                <div key={t.key} style={{ padding: 12, borderRadius: 10, textAlign: 'center', background: `${t.color}0d`, border: `1px solid ${t.color}33` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</div>
                  <div style={{ fontSize: 16, color: 'var(--text-primary)', marginTop: 4, fontWeight: 600 }}>{t.value}{detailsMetric.unit}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>+{t.energy} эн. · +{t.karma} к.</div>
                </div>
              ))}
            </div>

            {(detailsMetric.reward_image_url || detailsMetric.reward_description) && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20, padding: 16, borderRadius: 14, background: 'rgba(184,134,11,0.06)', border: '1px solid var(--border-gold)' }}>
                {detailsMetric.reward_image_url && <img src={detailsMetric.reward_image_url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Приз за достижение максимума</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{detailsMetric.reward_description}</div>
                </div>
              </div>
            )}

            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>Материалы для роста</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(detailsMetric.trainings || []).map(t => {
                const { band } = metricView(detailsMetric)
                const recommended = t.recommend_below === 'all' || bandRankOf(detailsMetric, band) < bandRankOf(detailsMetric, t.recommend_below)
                return (
                  <div key={t.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-page)', border: recommended ? '1px solid var(--border-gold)' : '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{t.title}</span>
                      {recommended && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(184,134,11,0.12)', color: 'var(--accent-gold)', border: '1px solid var(--border-gold)', whiteSpace: 'nowrap' }}>Рекомендуем</span>}
                    </div>
                    {t.type === 'video' && (t.url || t.video_path) && (
                      <button onClick={() => { setDetailsMetric(null); setVideoTraining(t) }} style={{ ...ghostBtn, marginTop: 10 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Смотреть в плеере</button>
                    )}
                    {t.type === 'text' && t.content && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{t.content}</p>}
                    {t.type === 'test' && <button onClick={() => { setDetailsMetric(null); setActiveTest({ training: t, answers: [] }); setTestResult(null) }} style={{ ...ghostBtn, marginTop: 10, borderColor: 'rgba(192,132,252,0.4)', color: 'var(--accent-purple)' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Пройти тест</button>}
                  </div>
                )
              })}
              {(detailsMetric.trainings || []).length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Материалов пока нет</p>}
            </div>
          </div>
          <style jsx>{`@keyframes mxSpin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {activeTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => !testResult && setActiveTest(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setActiveTest(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 18px', background: 'linear-gradient(135deg, #8a6208, #0e7490)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{activeTest.training.title}</h3>
            {(activeTest.training.test_questions || []).map((q, qi) => (
              <div key={qi} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>{qi + 1}. {q.q}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(q.options || []).map((opt, oi) => (
                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', padding: '8px 12px', borderRadius: 10, border: `1px solid ${activeTest.answers[qi] === oi ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: activeTest.answers[qi] === oi ? 'rgba(184,134,11,0.08)' : 'transparent' }}>
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
              <button onClick={submitTest} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Ответить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
