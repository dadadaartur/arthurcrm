import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import TrainingVideoModal from '../../components/TrainingVideoModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { BAND_LABELS, BAND_COLORS, TYPE_LABELS } from '../../lib/kpi'

const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, ' ').replace(/^ +|_+$/g, '')
const ghostBtn = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,215,0,0.3)',
  borderRadius: 12,
  padding: '9px 18px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  transition: 'all .25s'
}
const hoverOn = e => {
  e.currentTarget.style.borderColor = '#FFD700'
  e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
const hoverOff = e => {
  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'
  e.currentTarget.style.boxShadow = 'none'
  e.currentTarget.style.transform = 'translateY(0)'
}
const AUTO_ENERGY = { energy_min: 5, energy_mid: 10, energy_top: 15, energy_ultra: 20 }

const TYPE_META = [
  { key: 'average', label: 'Среднее за период', hint: 'Средняя арифметика за день/неделю/месяц.', ex: 'CSI, средний чек, время обработки', color: '#FFD700' },
  { key: 'cumulative', label: 'Накопительное', hint: 'Общая сумма за период.', ex: 'Звонки, продажи, задачи', color: '#a0e9ff' },
  { key: 'plan', label: 'Процент выполнения плана', hint: 'Факт ÷ план × 100%.', ex: 'План продаж, SLA', color: '#4ade80' },
  { key: 'ratio', label: 'Доля / конверсия', hint: 'Успешные ÷ всего × 100, из двух параметров.', ex: 'Конверсия лид→встреча', color: '#c084fc' },
  { key: 'inverse', label: 'Инверсия (меньше — лучше)', hint: 'Ниже значение — выше уровень.', ex: 'SLA лида, время, жалобы', color: '#ffb3c6' },
  { key: 'binary', label: 'Бинарный (да/нет в %)', hint: 'Доля выполненных условий.', ex: 'Скрипт, подтверждение', color: '#FFD700' },
  { key: 'min_period', label: 'Накопит. с минимумом в днях', hint: 'Сумма, если минимум каждый день.', ex: 'Стабильность, посещаемость', color: '#a0e9ff' },
  { key: 'dynamics', label: 'Динамика (прирост)', hint: 'Изменение к прошлому периоду, %.', ex: 'Рост продаж', color: '#4ade80' },
  { key: 'rating', label: 'Рейтинг в команде', hint: 'Процентиль среди коллег.', ex: 'Топ-10 по продажам', color: '#c084fc' },
  { key: 'weighted', label: 'Взвешенный индекс', hint: 'Комплексный KPI с весами.', ex: '0.5×продажи +0.3×CSI', color: '#ffb3c6' },
]

const THRESH_NORMAL = [
  { k: 'thr_min', label: 'Мин', color: BAND_COLORS.min },
  { k: 'thr_mid', label: 'Средний', color: BAND_COLORS.mid },
  { k: 'thr_top', label: 'Топ', color: BAND_COLORS.top },
  { k: 'thr_ultra', label: 'Ультра', color: BAND_COLORS.ultra },
]
const THRESH_INVERSE = [
  { k: 'thr_ultra', label: 'Ультра', color: BAND_COLORS.ultra },
  { k: 'thr_top', label: 'Топ', color: BAND_COLORS.top },
  { k: 'thr_mid', label: 'Средний', color: BAND_COLORS.mid },
  { k: 'thr_min', label: 'Мин', color: BAND_COLORS.min },
]

const CloseX = ({ onClick }) => (
  <button onClick={onClick} className="mx-close" title="Закрыть">
    <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="15" stroke="#f87171" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 5" className="mx-ring" />
      <path d="M12 12 L22 22 M22 12 L12 22" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="mx-x" />
    </svg>
    <style jsx>{`.mx-close{position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;padding:4px;transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:5}.mx-close:hover{transform:rotate(90deg) scale(1.12)}.mx-ring{transform-origin:17px 17px;animation:mxSpin 6s linear infinite}@keyframes mxSpin{to{transform:rotate(360deg)}}`}</style>
  </button>
)

function MasteryAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [pool, setPool] = useState([])
  const [companyKarma, setCompanyKarma] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMetric, setEditMetric] = useState(null)
  const [materialsMetric, setMaterialsMetric] = useState(null)

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session.access_token}` }
  }

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    if (r.ok) {
      const m = await r.json()
      setMetrics(m)
      const p = {}
      m.forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i }))
      setPool(Object.values(p))
    }
    const { data: emps } = await supabase.from('profiles')
      .select('user_id, display_name, email, first_name, last_name')
      .eq('company_id', prof.company_id)
      .is('deleted_at', null)
      .eq('is_company_admin', false)
    setEmployees(emps || [])
    const { data: acc } = await supabase.from('company_karma_accounts')
      .select('balance')
      .eq('company_id', prof.company_id)
      .maybeSingle()
    setCompanyKarma(acc?.balance || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveMetric = async (payload, id) => {
    const h = await auth()
    const r = id
      ? await fetch('/api/company-admin/kpi/metrics', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...payload }) })
      : await fetch('/api/company-admin/kpi/metrics', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json()
    if (r.ok) {
      showSuccess(id ? 'Показатель обновлён' : 'Показатель создан')
      setCreateOpen(false)
      setEditMetric(null)
      load()
    } else showError('Ошибка: ' + (d.error || 'сохранение не удалось'))
  }

  const delMetric = async id => {
    const h = await auth()
    await fetch('/api/company-admin/kpi/metrics', {
      method: 'DELETE',
      headers: h,
      body: JSON.stringify({ id })
    })
    showSuccess('Показатель удалён')
    load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '20px 24px' }}>
      <div style={{ width: '100%', margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#888', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(255,215,0,0.06)' }}>
              Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.
            </span>
            <Link href="/company-admin/tests" style={{ ...ghostBtn, textDecoration: 'none' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Тесты
            </Link>
            <button onClick={() => setCreateOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Создать цель
            </button>
          </div>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginTop: 8 }}>
          {metrics.length === 0 && (
            <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>
              Целей пока нет — создайте первую
            </div>
          )}
          {metrics.map(m => {
            const thresholds = m.kpi_type === 'inverse' ? THRESH_INVERSE : THRESH_NORMAL
            return (
              <div key={m.id} style={{
                background: 'rgba(15,20,35,0.85)',
                borderRadius: 16,
                padding: 16,
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'border-color 0.25s, transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>
                    {m.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {/* Кнопка редактирования — премиальная иконка */}
                    <button
                      onClick={() => setEditMetric(m)}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(160,233,255,0.3)',
                        borderRadius: '50%',
                        width: 30,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a0e9ff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(160,233,255,0.15)'
                        e.currentTarget.style.borderColor = '#a0e9ff'
                        e.currentTarget.style.transform = 'rotate(45deg) scale(1.1)'
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(160,233,255,0.3)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        e.currentTarget.style.borderColor = 'rgba(160,233,255,0.3)'
                        e.currentTarget.style.transform = 'rotate(0) scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      title="Редактировать"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>

                    {/* Кнопка удаления — премиальная иконка */}
                    <button
                      onClick={() => delMetric(m.id)}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(244,67,54,0.3)',
                        borderRadius: '50%',
                        width: 30,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(244,67,54,0.15)'
                        e.currentTarget.style.borderColor = '#f87171'
                        e.currentTarget.style.transform = 'scale(1.15)'
                        e.currentTarget.style.boxShadow = '0 0 16px rgba(244,67,54,0.4)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        e.currentTarget.style.borderColor = 'rgba(244,67,54,0.3)'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      title="Удалить"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 500 }}>
                  {TYPE_LABELS[m.kpi_type || 'cumulative']}
                </div>

                {/* Визуализация порогов */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {thresholds.map(t => {
                    const value = m[t.k]
                    return (
                      <span key={t.k} style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: `${t.color}18`,
                        color: t.color,
                        border: `1px solid ${t.color}44`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                        {t.label} {value}{m.unit}
                      </span>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <button onClick={() => setMaterialsMetric(m)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    Материалы
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <GoalFormModal
        open={createOpen || !!editMetric}
        initial={editMetric}
        pool={pool}
        setPool={setPool}
        companyKarma={companyKarma}
        onClose={() => { setCreateOpen(false); setEditMetric(null) }}
        onSave={saveMetric}
      />
      <MaterialsModal metric={materialsMetric} onClose={() => setMaterialsMetric(null)} />
    </div>
  )
}

// —————————— Вспомогательные компоненты (без изменений) ——————————

const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{
    padding: '8px 16px',
    borderRadius: 12,
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`,
    color: active ? color : '#999',
    transition: 'all 0.25s ease'
  }}>{children}</button>
)

function GoalFormModal({ open, initial, pool, setPool, companyKarma, onClose, onSave }) {
  const [step, setStep] = useState('type')
  const [newParam, setNewParam] = useState({ label: '', unit: 'шт' })
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name,
        unit: initial.unit,
        kpi_type: initial.kpi_type || 'cumulative',
        thr_min: initial.thr_min,
        thr_mid: initial.thr_mid,
        thr_top: initial.thr_top,
        thr_ultra: initial.thr_ultra,
        karma_min: initial.karma_min,
        karma_mid: initial.karma_mid,
        karma_top: initial.karma_top,
        karma_ultra: initial.karma_ultra,
        description: initial.description || '',
        advice: initial.advice || '',
        num: initial.formula?.num || '',
        den: initial.formula?.den || '',
        mult: initial.formula?.mult || 100
      } : {
        name: '',
        unit: '%',
        kpi_type: null,
        thr_min: 5,
        thr_mid: 10,
        thr_top: 15,
        thr_ultra: 20,
        karma_min: 1,
        karma_mid: 3,
        karma_top: 5,
        karma_ultra: 10,
        description: '',
        advice: '',
        num: '',
        den: '',
        mult: 100
      })
      setStep(initial?.kpi_type ? 'form' : 'type')
    }
  }, [open, initial])

  if (!open || !form) return null
  const isInverse = form.kpi_type === 'inverse'
  const addParam = () => {
    if (!newParam.label.trim()) return
    const key = slug(newParam.label)
    if (!pool.find(p => p.key === key)) {
      setPool(p => [...p, { key, label: newParam.label.trim(), unit: newParam.unit || 'шт' }])
    }
    setNewParam({ label: '', unit: 'шт' })
  }

  const submit = () => {
    if (!form.name.trim()) return
    let inputs = [], formula = null
    if (form.kpi_type === 'ratio') {
      if (!form.num || !form.den) return
      inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean)
      formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 }
    }
    const nums = {}
    ['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => {
      nums[k] = Number(form[k]) || 0
    })
    onSave({
      ...form,
      mode: form.kpi_type === 'ratio' ? 'formula' : 'direct',
      ...nums,
      ...AUTO_ENERGY,
      inputs,
      formula
    }, initial?.id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(980px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <CloseX onClick={onClose} />
        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
          Баланс компании: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм. · Энергия авто (5/10/15/20)
        </div>

        {step === 'type' ? (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 18px', color: '#fff' }}>Выберите тип показателя</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TYPE_META.map(t => (
                <button key={t.key} onClick={() => { setForm(f => ({ ...f, kpi_type: t.key })); setStep('form') }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    textAlign: 'left',
                    padding: '18px 20px',
                    borderRadius: 14,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderLeft: `3px solid ${t.color}`,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.borderColor = `${t.color}66`
                    e.currentTarget.style.borderLeftColor = t.color
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.borderLeftColor = t.color
                  }}
                >
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{t.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>{t.hint}</span>
                  <span style={{ color: t.color, fontSize: 11, opacity: 0.8 }}>Примеры: {t.ex}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff' }}>{initial ? 'Редактировать цель' : 'Новая цель'} · {TYPE_LABELS[form.kpi_type]}</h3>
            {isInverse && <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'rgba(160,233,255,0.07)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff', fontSize: 12 }}>Меньше — лучше. Заполняйте от лучшего (малого) к допустимому (большому). SLA: ультра 5 мин → мин 15 мин.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Название (до 24)</label>
                <input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Единица</label>
                <select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Тип</label>
                <button onClick={() => setStep('type')} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11, width: '100%' }}>Сменить</button>
              </div>
              {form.kpi_type === 'ratio' && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Числитель</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}>
                      <option value="">—</option>
                      {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Знаменатель</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}>
                      <option value="">—</option>
                      {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Множитель</label>
                    <input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    <input className="input-field" style={{ flex: 1 }} placeholder="Новый параметр" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} />
                    <button onClick={addParam} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11 }}>+</button>
                  </div>
                </>
              )}
              {(isInverse ? THRESH_INVERSE : THRESH_NORMAL).map(t => (
                <div key={t.k}>
                  <label style={{ fontSize: 11, color: t.color, display: 'block', marginBottom: 4 }}>{t.label}</label>
                  <input type="number" step="0.1" placeholder="0" className="input-field" style={{ width: '100%' }} value={form[t.k]} onChange={e => setForm({ ...form, [t.k]: e.target.value })} />
                </div>
              ))}
              {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map((k, i) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Кармики · {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Описание</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Советы</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={onClose} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={submit} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MaterialsModal({ metric, onClose }) {
  const { showSuccess, showError } = useFeedback()
  const [trainings, setTrainings] = useState([])
  const [tForm, setTForm] = useState({ title: '', type: 'video', url: '', content: '', recommend_below: 'all' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [video, setVideo] = useState(null)

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session.access_token}` }
  }

  useEffect(() => { if (metric) load(metric.id) }, [metric])

  const load = async mid => {
    const h = await auth()
    const r = await fetch(`/api/company-admin/kpi/trainings?metricId=${mid}`, { headers: h })
    if (r.ok) setTrainings(await r.json())
  }

  const add = async () => {
    if (!tForm.title.trim()) { showError('Укажите название'); return }
    let url = tForm.url
    if (tForm.type === 'video' && file) {
      setUploading(true)
      const path = `trainings/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('trainings').upload(path, file)
      setUploading(false)
      if (error) { showError('Ошибка загрузки видео'); return }
      url = supabase.storage.from('trainings').getPublicUrl(path).data.publicUrl
    }
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/trainings', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric_id: metric.id, ...tForm, url })
    })
    if (r.ok) {
      showSuccess('Тренинг добавлен')
      setTForm({ title: '', type: 'video', url: '', content: '', recommend_below: 'all' })
      setFile(null)
      load(metric.id)
    } else showError('Ошибка создания тренинга')
  }

  if (!metric) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(880px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <CloseX onClick={onClose} />
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff' }}>Материалы: {metric.name}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {trainings.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: '#fff' }}>{t.title}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {t.type === 'video' && (
                  <button onClick={() => setVideo(t)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    Показать
                  </button>
                )}
                <Link href={`/company-admin/tests?training=${t.id}`} style={{ ...ghostBtn, textDecoration: 'none', borderColor: 'rgba(192,132,252,0.4)', color: '#c084fc' }}>
                  Тест
                </Link>
              </div>
            </div>
          ))}
          {trainings.length === 0 && <p style={{ color: '#777', fontSize: 12 }}>Материалов пока нет</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input-field" placeholder="Название" value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} />
          <select className="input-field" value={tForm.type} onChange={e => setTForm({ ...tForm, type: e.target.value })}>
            <option value="video">Видео</option>
            <option value="text">Текст</option>
          </select>
          {tForm.type === 'video' && (
            <>
              <input className="input-field" placeholder="Или URL видео" value={tForm.url} onChange={e => setTForm({ ...tForm, url: e.target.value })} />
              <label style={{ ...ghostBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>
                {file ? file.name : 'Загрузить файл'}
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
              </label>
            </>
          )}
          {uploading && (
            <div style={{ gridColumn: '1 / -1', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div className="up-bar" style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, #FFD700, #4ade80)', borderRadius: 3 }} />
              <style jsx>{`.up-bar{animation:upMove 1.1s ease-in-out infinite}@keyframes upMove{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <button onClick={add} disabled={uploading} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12, opacity: uploading ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              {uploading ? 'Загрузка видео…' : 'Добавить тренинг'}
            </button>
          </div>
        </div>
      </div>
      {video && <TrainingVideoModal training={video} onClose={() => setVideo(null)} />}
    </div>
  )
}

export default withAuth(MasteryAdmin, { adminOnly: true })
