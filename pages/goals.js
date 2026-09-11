import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from '../components/LoadingScreen'
import BackArrow from '../components/BackArrow'
import DatePicker from '../components/DatePicker'
import ProgressBar3D from '../components/ProgressBar3D'
import LevelPathModal from '../components/LevelPathModal'
import TrainingVideoModal from '../components/TrainingVideoModal'
import CannonPrizeGame from '../components/CannonPrizeGame'
import { useFeedback } from '../context/ActionFeedbackContext'
import { BAND_LABELS, BAND_COLORS, bandRankOf, bandFor, rangeValue, resolveThresholds } from '../lib/kpi'
import PeriodHint, { PERIOD_LABELS } from '../components/PeriodHint'

// Оригинальные BAND_COLORS (из lib/kpi.js) — светлый/пастельный набор,
// подобранный под тёмный фон, ещё используется в неpereделанной
// company-admin/mastery.js. Общий модуль менять нельзя — там сломается
// контраст на тёмном. Здесь, для уже светлой страницы — своя, более
// насыщенная версия тех же самых 5 цветов, чтобы читалось как текст на
// белом фоне.
const BAND_COLORS_LIGHT = { none: '#dc2626', min: '#b45309', mid: '#ea580c', top: '#137a39', ultra: '#9333ea' }

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const todayISO = toISO(new Date())
const shiftISO = n => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d) }

const ghostBtn = {
  background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12,
  padding: '8px 18px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s'
}
const hoverOn = e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)' }
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

function MotivationHero() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/my-motivation', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setData(await r.json())
      setLoading(false)
    }
    load()
  }, [])
  if (loading || !data) return null
  const { nextReward, nextLevel, closestMetric, metricToReward, suggestedTask } = data
  if (!nextReward && !nextLevel && !closestMetric) return null

  const Bridge = ({ color, label, current, target, hint }) => {
    const pct = target > 0 ? Math.min(100, Math.max(4, Math.round((current / target) * 100))) : 0
    return (
      <div style={{ flex: 1, minWidth: 210 }}>
        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 7 }}>{hint}</div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.4)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color, transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: '1 1 380px', borderRadius: 22, padding: 24, background: 'linear-gradient(135deg, rgba(234,88,12,0.09), rgba(124,58,237,0.08), rgba(14,116,144,0.08))', border: '1px solid var(--border-gold)', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>Что ты сейчас зарабатываешь</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: suggestedTask ? 18 : 0 }}>
        {nextReward && <div style={{ flex: '0 1 220px' }}><Bridge color="#ea580c" label="До приза в пушке призов" current={data.balance} target={nextReward.cost} hint={`«${nextReward.name}» — не хватает ${nextReward.karmaNeeded} кармиков`} /></div>}
        {nextLevel && <div style={{ flex: '0 1 220px' }}><Bridge color="#7c3aed" label="До следующего уровня" current={data.energy} target={nextLevel.threshold} hint={nextLevel.reward ? `«${nextLevel.name}»: ${nextLevel.reward} — не хватает ${nextLevel.energyNeeded} энергии` : `«${nextLevel.name}» — не хватает ${nextLevel.energyNeeded} энергии`} /></div>}
        {closestMetric && (
          <div style={{ flex: '0 1 220px' }}>
          <Bridge color="#0e7490" label="Ближе всего к росту" current={closestMetric.current} target={closestMetric.target}
            hint={
              metricToReward && closestMetric.karmaReward > 0
                ? (metricToReward.willAfford
                    ? `Ещё ${closestMetric.gap}${closestMetric.unit} по «${closestMetric.name}» — и хватит на «${nextReward.name}»!`
                    : `Ещё ${closestMetric.gap}${closestMetric.unit} по «${closestMetric.name}» — это +${closestMetric.karmaReward} кармиков, до «${nextReward.name}» останется ${metricToReward.stillShort}`)
                : `«${closestMetric.name}» — ещё ${closestMetric.gap}${closestMetric.unit}, и уровень станет «${closestMetric.nextBandLabel}»`
            } />
          </div>
        )}
      </div>
      {suggestedTask && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: 'var(--bg-card)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>Выполни «<b>{suggestedTask.title}</b>» — получишь +{suggestedTask.rewardKarma} кармиков, разрыв заметно сократится.</span>
          <a href={`/task/${suggestedTask.taskId}`} className="btn-glass" style={{ padding: '7px 18px', fontSize: 11.5, marginLeft: 'auto', textDecoration: 'none' }}>К заданию</a>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <a href="/championship" className="btn-glass-outline" style={{ padding: '7px 16px', fontSize: 11.5, textDecoration: 'none' }}>Твоё место в рейтинге</a>
        <a href="/championship" className="btn-glass-outline" style={{ padding: '7px 16px', fontSize: 11.5, textDecoration: 'none' }}>Доска почёта</a>
        <a href="/my-certificates" className="btn-glass-outline" style={{ padding: '7px 16px', fontSize: 11.5, textDecoration: 'none' }}>Мои грамоты</a>
      </div>
    </div>
  )
}

const PERIOD_PRESETS = [
  { key: 'month', label: 'Текущий месяц' }, { key: 'today', label: 'Сегодня' }, { key: 'yesterday', label: 'Вчера' },
  { key: '7d', label: '7 дней' }, { key: '30d', label: '30 дней' }, { key: 'all', label: 'Всё время' },
]
function PeriodSelector({ mode, setMode, customDay, setCustomDay }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const currentLabel = mode === 'custom' ? customDay : (PERIOD_PRESETS.find(p => p.key === mode)?.label || 'Период')
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        padding: '8px 18px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: 'linear-gradient(135deg, #FFD70022, #FFD7000d)', border: '1px solid #FFD70088', color: '#FFD700',
      }}>{currentLabel}</button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 40, minWidth: 200, padding: 8, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)' }}>
          {PERIOD_PRESETS.map(p => (
            <button key={p.key} onClick={() => { setMode(p.key); setOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, fontSize: 12.5, background: mode === p.key ? 'var(--bg-page)' : 'none', color: mode === p.key ? 'var(--accent-gold)' : 'var(--text-primary)', fontWeight: mode === p.key ? 600 : 400, border: 'none', cursor: 'pointer' }}>{p.label}</button>
          ))}
          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '6px 0' }} />
          <div style={{ padding: '0 4px' }}>
            <DatePicker value={customDay} onChange={v => { if (v) { setCustomDay(v); setMode('custom'); setOpen(false) } }} placeholder="Своя дата" />
          </div>
        </div>
      )}
    </div>
  )
}

function formatDaysHuman(days) {
  if (days <= 0) return 'уже сейчас'
  if (days < 14) return `${days} дн.`
  if (days < 60) return `${Math.round(days / 7)} нед.`
  const months = Math.round(days / 30)
  return `${months} мес.`
}

function PersonalGoalsSection() {
  const { showSuccess, showError } = useFeedback()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ goalType: 'intermediate', parentGoalId: '', title: '', description: '', targetValue: '', targetUnit: '', targetDate: '' })
  const [editingProgress, setEditingProgress] = useState(null)
  const [progressInput, setProgressInput] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [celebratingId, setCelebratingId] = useState(null)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    const h = await auth()
    const r = await fetch('/api/personal-goals', { headers: h })
    if (r.ok) setGoals((await r.json()).goals || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.title.trim()) { showError('Укажите название цели'); return }
    const h = await auth()
    const r = await fetch('/api/personal-goals', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { showSuccess('Цель добавлена'); setShowCreate(false); setForm({ goalType: 'intermediate', parentGoalId: '', title: '', description: '', targetValue: '', targetUnit: '', targetDate: '' }); load() }
    else showError('Не удалось создать цель')
  }
  const saveProgress = async (id) => {
    const h = await auth()
    const r = await fetch('/api/personal-goals', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, currentValue: progressInput }) })
    if (r.ok) { setEditingProgress(null); load() } else showError('Не удалось сохранить прогресс')
  }
  const markDone = async (id) => {
    setCelebratingId(id)
    const h = await auth()
    await fetch('/api/personal-goals', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'completed' }) })
    showSuccess('Цель достигнута!')
    setTimeout(() => { setCelebratingId(null); load() }, 1400)
  }
  const remove = async (id) => {
    const h = await auth()
    await fetch('/api/personal-goals', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setConfirmDeleteId(null)
    load()
  }

  const globals = goals.filter(g => g.goal_type === 'global' && g.status === 'active')
  const intermediates = goals.filter(g => g.goal_type === 'intermediate' && g.status === 'active')
  const done = goals.filter(g => g.status === 'completed')

  const GoalCard = ({ g }) => {
    const celebrating = celebratingId === g.id
    return (
    <div style={{ position: 'relative', padding: 18, borderRadius: 16, background: g.goal_type === 'global' ? 'linear-gradient(135deg, rgba(234,88,12,0.06), var(--bg-card))' : 'var(--bg-card)', boxShadow: 'var(--shadow-card)', border: g.goal_type === 'global' ? '1px solid var(--border-gold)' : '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      {celebrating && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(19,122,57,0.94)' }}>
          <div className="goal-celebrate">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
            <div style={{ color: '#fff', fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>Достигнута!</div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => {
            const ang = (i / 8) * Math.PI * 2
            const dx = Math.cos(ang) * 90, dy = Math.sin(ang) * 90
            return <span key={i} className="goal-confetti" style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, background: ['#ea580c', '#7c3aed', '#0e7490', '#137a39'][i % 4] }} />
          })}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{g.title}</span>
        {confirmDeleteId === g.id ? (
          <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => remove(g.id)} style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 7, padding: '3px 9px', cursor: 'pointer' }}>Удалить</button>
            <button onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 10.5, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Отмена</button>
          </span>
        ) : (
          <button onClick={() => setConfirmDeleteId(g.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        )}
      </div>
      {g.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>{g.description}</p>}
      {g.goal_type === 'global' && (
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: g.approval_status === 'approved' ? 'rgba(19,122,57,0.1)' : g.approval_status === 'needs_adjustment' ? 'rgba(220,38,38,0.1)' : 'rgba(234,88,12,0.1)', color: g.approval_status === 'approved' ? '#137a39' : g.approval_status === 'needs_adjustment' ? '#dc2626' : '#ea580c' }}>
            {g.approval_status === 'approved' ? 'Одобрена руководителем' : g.approval_status === 'needs_adjustment' ? 'Руководитель просит поправить' : 'Ждёт одобрения руководителя'}
          </span>
          {g.approval_status === 'needs_adjustment' && g.manager_comment && (
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6, padding: '8px 10px', borderRadius: 9, background: 'rgba(220,38,38,0.05)' }}>{g.manager_comment}</div>
          )}
        </div>
      )}
      {g.target_value != null ? (
        <>
          <div style={{ height: 9, borderRadius: 5, background: 'var(--bg-page)', overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${g.progressPct ?? Math.min(100, Math.round((g.current_value / g.target_value) * 100))}%`, borderRadius: 5, background: 'linear-gradient(90deg, #ea580c, #7c3aed)', transition: 'width .6s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
            {g.auto_tracked ? (
              <span>{g.current_value}{g.target_unit} из {g.target_value}{g.target_unit} <span style={{ color: 'var(--text-muted)' }}>— растёт само, от заработанной кармы</span></span>
            ) : editingProgress === g.id ? (
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input autoFocus type="number" className="input-field" style={{ width: 70, padding: '3px 8px', fontSize: 11 }} value={progressInput} onChange={e => setProgressInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveProgress(g.id)} />
                <button onClick={() => saveProgress(g.id)} style={{ color: 'var(--accent-gold)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                </button>
              </span>
            ) : (
              <span onClick={() => { setEditingProgress(g.id); setProgressInput(String(g.current_value)) }} style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }}>{g.current_value}{g.target_unit} из {g.target_value}{g.target_unit}</span>
            )}
            {g.target_date && <span>до {new Date(g.target_date).toLocaleDateString('ru')}</span>}
          </div>
          {g.pace && (g.pace.currentDays != null || g.pace.maxDays != null) && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 9, background: 'rgba(124,58,237,0.06)', fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {g.pace.currentDays != null && <div>При текущем темпе — <b style={{ color: 'var(--text-primary)' }}>{formatDaysHuman(g.pace.currentDays)}</b></div>}
              {g.pace.maxDays != null && <div>Если выйти на максимум по показателям — <b style={{ color: '#7c3aed' }}>{formatDaysHuman(g.pace.maxDays)}</b></div>}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.target_date ? `до ${new Date(g.target_date).toLocaleDateString('ru')}` : 'без числового прогресса'}</div>
      )}
      <button onClick={() => markDone(g.id)} style={{ marginTop: 12, fontSize: 11.5, fontWeight: 600, color: '#137a39', background: 'rgba(19,122,57,0.08)', border: '1px solid rgba(19,122,57,0.25)', borderRadius: 9, padding: '6px 14px', cursor: 'pointer' }}>Достигнута</button>
    </div>
  )}

  if (loading) return null

  return (
    <div style={{ marginTop: 32, paddingTop: 28, borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Мои личные цели</h2>
        <button onClick={() => setShowCreate(true)} className="btn-glass-outline" style={{ padding: '7px 16px', fontSize: 12 }}>+ Новая цель</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 640 }}>Твои собственные ориентиры. Глобальная — большая, на месяцы вперёд. Промежуточные — шаги к ней.</p>

      {globals.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Глобальные</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {globals.map(g => <GoalCard key={g.id} g={g} />)}
          </div>
        </div>
      )}
      {intermediates.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Промежуточные</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {intermediates.map(g => <GoalCard key={g.id} g={g} />)}
          </div>
        </div>
      )}
      {globals.length === 0 && intermediates.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 16 }}>Пока нет личных целей — добавьте первую</div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 94vw)', background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Новая личная цель</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setForm({ ...form, goalType: 'global' })} style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${form.goalType === 'global' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: form.goalType === 'global' ? 'rgba(217,119,6,0.08)' : 'var(--bg-page)', color: form.goalType === 'global' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Глобальная</button>
                <button onClick={() => setForm({ ...form, goalType: 'intermediate' })} style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${form.goalType === 'intermediate' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: form.goalType === 'intermediate' ? 'rgba(217,119,6,0.08)' : 'var(--bg-page)', color: form.goalType === 'intermediate' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Промежуточная</button>
              </div>
              {form.goalType === 'intermediate' && globals.length > 0 && (
                <select className="input-field" value={form.parentGoalId} onChange={e => setForm({ ...form, parentGoalId: e.target.value })}>
                  <option value="">Не привязана к глобальной</option>
                  {globals.map(g => <option key={g.id} value={g.id}>Шаг к «{g.title}»</option>)}
                </select>
              )}
              <input className="input-field" placeholder="Название цели" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
              <textarea className="input-field" placeholder="Описание (необязательно)" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" className="input-field" style={{ flex: 1 }} placeholder="Числовая цель (необяз.)" value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} />
                <input className="input-field" style={{ width: 90 }} placeholder="ед." value={form.targetUnit} onChange={e => setForm({ ...form, targetUnit: e.target.value })} />
              </div>
              <DatePicker value={form.targetDate} onChange={v => setForm({ ...form, targetDate: v })} placeholder="Срок (необязательно)" />
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={() => setShowCreate(false)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
                <button onClick={create} className="btn-glass" style={{ flex: 1 }}>Создать</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .goal-celebrate { text-align: center; animation: goalCelebratePop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes goalCelebratePop { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
        .goal-confetti { position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; border-radius: 2px; transform: translate(-50%,-50%); animation: goalConfettiFly 0.9s ease-out forwards; }
        @keyframes goalConfettiFly { to { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(300deg); opacity: 0; } }
      `}</style>
    </div>
  )
}

export default function GoalsPage() {
  const { showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [levels, setLevels] = useState([])
  const [pathOpen, setPathOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [mode, setMode] = useState('month')
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
  const [personalGoalsNearby, setPersonalGoalsNearby] = useState([])
  const [wheelResult, setWheelResult] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: { session } } = await supabase.auth.getSession()
      const h = { Authorization: `Bearer ${session.access_token}` }
      const [r1, r2, r3, r4] = await Promise.all([fetch('/api/kpi/my', { headers: h }), fetch('/api/kpi/levels', { headers: h }), fetch('/api/global-goals/my', { headers: h }), fetch('/api/personal-goals', { headers: h })])
      if (r4.ok) { const d4 = await r4.json(); setPersonalGoalsNearby((d4.goals || []).filter(g => g.status === 'active' && g.goal_type === 'global')) }
      if (r1.ok) setData(await r1.json())
      if (r2.ok) setLevels(await r2.json())
      if (r3.ok) setGlobalGoals(await r3.json())
      const { data: p } = await supabase.from('profiles').select('wheel_spins_available').eq('user_id', user.id).maybeSingle()
      setWheelSpins(p?.wheel_spins_available || 0)
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
    if (mode === 'month') return d.slice(0, 7) === todayISO.slice(0, 7)
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
  const periodLabel = mode === 'today' ? 'за сегодня' : mode === 'yesterday' ? 'за вчера' : mode === 'custom' ? `за ${customDay}` : mode === 'month' ? 'накопительно за текущий месяц' : mode === '7d' ? 'накопительно за 7 дн.' : mode === '30d' ? 'накопительно за 30 дн.' : 'за всё время'

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/" title="Мои цели" />

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28, alignItems: 'stretch' }}>
          <MotivationHero />

          {globalGoals.length > 0 && (
            <div style={{ flex: '1 1 380px', borderRadius: 22, padding: 24, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Общий путь компании</div>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: '0 0 14px' }}>То, к чему движется вся команда — и где в этом ты</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {globalGoals.map(g => {
                  const pct = g.target_value ? Math.min(100, Math.round((g.current_value || 0) / g.target_value * 100)) : 0
                  // Пытаемся связать текстовую цель компании с реальным
                  // показателем сотрудника по совпадению названия — не
                  // точная формула (для неё нужна была бы настоящая связь
                  // в базе, не текстовое поле), но конкретнее, чем ничего.
                  const matched = g.metric && data?.metrics?.find(m => m.name.toLowerCase().includes(g.metric.toLowerCase()) || g.metric.toLowerCase().includes(m.name.toLowerCase()))
                  const myBand = matched ? metricView(matched).band : null
                  return (
                    <div key={g.id} style={{ padding: 14, borderRadius: 14, background: 'var(--bg-page)', border: '1px solid var(--border-gold)' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{g.title}</div>
                      <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-card)', overflow: 'hidden', marginBottom: 5 }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct >= 100 ? '#137a39' : '#ea580c', transition: 'width .8s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: matched ? 8 : 0 }}>{g.current_value || 0}{g.unit} из {g.target_value}{g.unit} ({pct}%)</div>
                      {matched && myBand && (
                        <div style={{ padding: '6px 9px', borderRadius: 8, background: `${BAND_COLORS_LIGHT[myBand]}14`, border: `1px solid ${BAND_COLORS_LIGHT[myBand]}44` }}>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Твой вклад по «{matched.name}»: </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: BAND_COLORS_LIGHT[myBand] }}>{BAND_LABELS[myBand]}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Постоянная сетка на весь остаток страницы: основной контент
            (фильтр периода + карточки показателей) слева, узкая колонка
            энергии/уровня справа — не отдельная широкая строка сверху,
            как раньше. sticky — колонка остаётся на виду при прокрутке
            длинного списка показателей. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(240px, 280px)', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <PeriodSelector mode={mode} setMode={setMode} customDay={customDay} setCustomDay={setCustomDay} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Показатели {periodLabel}</span>
            </div>

            {(() => {
              const dailyMetrics = data.metrics.filter(m => (m.period || 'daily') === 'daily')
              const otherMetrics = data.metrics.filter(m => (m.period || 'daily') !== 'daily')
              const renderCard = m => {
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
                        {isCurrent && <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: 8, padding: '1px 6px', borderRadius: 20, background: t.color, color: '#0a0e1c', fontWeight: 700, whiteSpace: 'nowrap' }}>Вы здесь</span>}
                        <div style={{ fontSize: 9, color: achieved ? t.color : '#777', fontWeight: 700, letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                        <div style={{ fontSize: 15, color: achieved ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>{t.value}<span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{m.unit}</span></div>
                        {t.karma > 0 && <div style={{ fontSize: 8.5, color: achieved ? t.color : 'var(--text-muted)', marginTop: 2 }}>+{t.karma} карм.</div>}
                      </div>
                    )
                  })}
                </div>
                {myRank < 4 && value != null && (() => {
                  const next = thresholds[myRank]
                  if (!next) return null
                  const gap = Math.round(Math.abs(next.value - value) * 10) / 10
                  return <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10 }}>До уровня «{next.label}» — ещё {gap}{m.unit}</div>
                })()}

                {(m.reward_image_url || m.reward_description) && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, padding: 10, borderRadius: 12, background: 'rgba(234,88,12,0.05)', border: '1px solid var(--border-gold)' }}>
                    {m.reward_image_url && <img src={m.reward_image_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: 'var(--accent-gold)', letterSpacing: 0.4 }}>Приз за максимум</div>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.reward_description}</div>
                    </div>
                  </div>
                )}
              </div>
                )
              }
              return (
                <>
                  {dailyMetrics.length > 0 && (() => {
                    // «Под угрозой сегодня» — рамка потери, не приобретения
                    // (по прямому запросу от 6 сентября 2026: «если не
                    // прозвоню 10 звонков — потеряю приз», не абстрактная
                    // полоска прогресса). Дневной показатель обнуляется
                    // каждый день — то, что не сделано сегодня, не
                    // наверстать завтра, это и создаёт настоящую срочность,
                    // не выдуманную.
                    const declineKarma = n => { const n10 = n % 10, n100 = n % 100; if (n100 >= 11 && n100 <= 14) return 'кармиков'; if (n10 === 1) return 'кармик'; if (n10 >= 2 && n10 <= 4) return 'кармика'; return 'кармиков' }
                    const atRisk = dailyMetrics.map(m => {
                      const { value, band } = metricView(m)
                      const { thresholds: th } = metricView(m)
                      const rank = bandRankOf(m, band)
                      if (rank >= 4) return null // уже ультра сегодня — не под угрозой
                      const next = th[rank]
                      if (!next || value == null) return null
                      // Защита от той же путаницы типа «среднее/сумма», что уже
                      // ловилась в аналитике — если разрыв больше самого порога,
                      // это почти наверняка не честная цифра, а рассинхрон
                      // единиц, лучше промолчать, чем показать сломанное число.
                      const rawGap = Math.abs(next.value - value)
                      if (next.value > 0 && rawGap > next.value * 1.5) return null
                      const isWholeUnit = !/%|мин|час/i.test(m.unit || '')
                      const gap = isWholeUnit ? Math.ceil(rawGap) : Math.round(rawGap * 10) / 10
                      if (gap <= 0) return null
                      const hasTopPrize = rank < 3 && (m.reward_image_url || m.reward_description)
                      return { metric: m, gap, nextLabel: next.label, karmaLoss: next.karma || 0, hasTopPrize }
                    }).filter(Boolean)
                    if (!atRisk.length) return null
                    const nearestPersonalGoal = personalGoalsNearby?.[0]
                    return (
                      <div style={{ marginBottom: 24, padding: 18, borderRadius: 18, background: 'linear-gradient(135deg, rgba(234,88,12,0.08), rgba(234,88,12,0.02))', border: '1px solid var(--border-gold)' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#ea580c', marginBottom: 12 }}>Ещё можно успеть сегодня</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                          {atRisk.map(({ metric, gap, nextLabel, karmaLoss, hasTopPrize }) => (
                            <div key={metric.id} style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, padding: '10px 12px', borderRadius: 12, background: 'var(--bg-card)' }}>
                              Ещё <b>{gap}{metric.unit}</b> по «{metric.name}» — и получишь{karmaLoss > 0 ? <> <b style={{ color: '#ea580c' }}>{karmaLoss} {declineKarma(karmaLoss)}</b></> : ''}{hasTopPrize ? <> и приз «{metric.reward_description}»</> : ''}. Не успеешь сегодня — сгорит.
                            </div>
                          ))}
                        </div>
                        {nearestPersonalGoal && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-gold)' }}>
                            Каждый такой шаг сегодня — это и шаг к «<b style={{ color: 'var(--text-primary)' }}>{nearestPersonalGoal.title}</b>».
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {dailyMetrics.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Ежедневные цели</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                        {dailyMetrics.map(renderCard)}
                      </div>
                    </div>
                  )}
                  {otherMetrics.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Копится к премии</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                        {otherMetrics.map(renderCard)}
                      </div>
                    </div>
                  )}
                  {data.metrics.length === 0 && <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32 }}>Руководитель ещё не задал показатели</div>}
                </>
              )
            })()}
          </div>

          {/* Боковая колонка — энергия, уровень, путь прогресса, советы,
              лента подарков. Раньше это была отдельная широкая строка
              сверху страницы (пункт 6 фидбека от 31 августа 2026 — «пол
              экрана пустого») — теперь узкая постоянная колонка, не
              отбирает место у самих карточек показателей. */}
          <div style={{ position: 'sticky', top: 20, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, padding: 18, border: `1px solid ${cur ? cur.color : 'var(--border-subtle)'}33` }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)' }}>Энергия</div>
                <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, background: 'linear-gradient(135deg, #ea580c, #0e7490)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{energy}</div>
              </div>

              {cur ? (
                <>
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
                </>
              ) : levels?.length > 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {next && <ProgressBar3D value={energy} max={next.energy_threshold} height={8} />}
                  <div style={{ marginTop: 6 }}>ещё {Math.max(0, (levels[0]?.energy_threshold || 0) - energy)} до «{levels[0]?.name}»</div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Уровни мастерства ещё не настроены</div>
              )}
              {cur && tipsOpen && next && (
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
                }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 14, padding: '10px 14px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(234,88,12,0.12))', border: '1px solid var(--border-gold)', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600, animation: 'pulseGlow 2s ease-in-out infinite' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" /><path d="M12 8v13M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8" /><path d="M12 8c-1.5-4-6-4-6-1s3 1 6 1M12 8c1.5-4 6-4 6-1s-3 1-6 1" /></svg>
                  Пушка призов · {wheelSpins}
                </button>
              )}
            </div>
        </div>

        <PersonalGoalsSection />
      </div>

      <LevelPathModal open={pathOpen} onClose={() => setPathOpen(false)} energy={energy} />
      {videoTraining && <TrainingVideoModal training={videoTraining} onClose={() => setVideoTraining(null)} />}

      {wheelOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={() => !wheelSpinning && setWheelOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 24, padding: 32, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--text-primary)' }}>Пушка призов</h3>
            {wheelConfig === null ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Загрузка...</p>
            ) : wheelConfig.prizes?.length ? (
              <CannonPrizeGame
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
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Пушка призов пока не настроена</p>
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
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20, padding: 16, borderRadius: 14, background: 'rgba(234,88,12,0.06)', border: '1px solid var(--border-gold)' }}>
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
                      {recommended && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(234,88,12,0.12)', color: 'var(--accent-gold)', border: '1px solid var(--border-gold)', whiteSpace: 'nowrap' }}>Рекомендуем</span>}
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
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 18px', background: 'linear-gradient(135deg, #ea580c, #0e7490)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{activeTest.training.title}</h3>
            {(activeTest.training.test_questions || []).map((q, qi) => (
              <div key={qi} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>{qi + 1}. {q.q}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(q.options || []).map((opt, oi) => (
                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', padding: '8px 12px', borderRadius: 10, border: `1px solid ${activeTest.answers[qi] === oi ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: activeTest.answers[qi] === oi ? 'rgba(234,88,12,0.08)' : 'transparent' }}>
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
