import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import DateRangePicker from '../../components/DateRangePicker'
import TrainingVideoModal from '../../components/TrainingVideoModal'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { BAND_LABELS, BAND_COLORS, TYPE_LABELS, resolveThresholds } from '../../lib/kpi'

const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, ' ').replace(/^ +|_+$/g, '')
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 18px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const AUTO_ENERGY = { energy_min: 5, energy_mid: 10, energy_top: 15, energy_ultra: 20 }
const TYPE_META = [
  { key: 'average', label: 'Среднее за период', hint: 'Средняя арифметика за день/неделю/месяц.', ex: 'CSI, средний чек, время обработки' },
  { key: 'cumulative', label: 'Накопительное', hint: 'Общая сумма за период.', ex: 'Звонки, продажи, задачи' },
  { key: 'plan', label: 'Процент выполнения плана', hint: 'Факт ÷ план × 100%.', ex: 'План продаж, SLA' },
  { key: 'ratio', label: 'Доля / конверсия', hint: 'Успешные ÷ всего × 100, из двух параметров.', ex: 'Конверсия лид→встреча' },
  { key: 'inverse', label: 'Инверсия (меньше — лучше)', hint: 'Ниже значение — выше уровень.', ex: 'SLA лида, время, жалобы' },
  { key: 'binary', label: 'Бинарный (да/нет в %)', hint: 'Доля выполненных условий.', ex: 'Скрипт, подтверждение' },
  { key: 'min_period', label: 'Накопит. с минимумом в днях', hint: 'Сумма, если минимум каждый день.', ex: 'Стабильность, посещаемость' },
  { key: 'dynamics', label: 'Динамика (прирост)', hint: 'Изменение к прошлому периоду, %.', ex: 'Рост продаж' },
  { key: 'rating', label: 'Рейтинг в команде', hint: 'Процентиль среди коллег.', ex: 'Топ-10 по продажам' },
  { key: 'weighted', label: 'Взвешенный индекс', hint: 'Комплексный KPI с весами.', ex: '0.5×продажи +0.3×CSI' },
]
const THRESH_NORMAL = [
  { k: 'thr_min', label: 'Мин — допустимый', color: BAND_COLORS.min, ph: '5' },
  { k: 'thr_mid', label: 'Средний', color: BAND_COLORS.mid, ph: '10' },
  { k: 'thr_top', label: 'Топ', color: BAND_COLORS.top, ph: '15' },
  { k: 'thr_ultra', label: 'Ультра — лучший', color: BAND_COLORS.ultra, ph: '20' },
]
const THRESH_INVERSE = [
  { k: 'thr_ultra', label: 'Ультра — лучший (меньше всего)', color: BAND_COLORS.ultra, ph: '5' },
  { k: 'thr_top', label: 'Топ', color: BAND_COLORS.top, ph: '8' },
  { k: 'thr_mid', label: 'Средний', color: BAND_COLORS.mid, ph: '11' },
  { k: 'thr_min', label: 'Мин — допустимый (больше всего)', color: BAND_COLORS.min, ph: '15' },
]
// Палитра для кастомных уровней — те же цвета, что уже используются по
// всему проекту, чтобы новые уровни не выбивались из общего стиля.
const TIER_PALETTE = ['#f87171', '#f97316', '#FFD700', '#4ade80', '#a0e9ff', '#c084fc', '#ffb3c6', '#e2e8f0']
const newTierKey = () => 'tier_' + Math.random().toString(36).slice(2, 8)
// При первом переключении на «Свои уровни» — не начинаем с пустого места,
// а конвертируем то, что админ уже заполнил в стандартном шаблоне (или
// значения по умолчанию 5/10/15/20), чтобы не терять уже введённые данные.
const toCustomTiers = (form, isInverse) => {
  const order = isInverse ? ['ultra', 'top', 'mid', 'min'] : ['min', 'mid', 'top', 'ultra']
  return order.map((b, i) => ({
    key: newTierKey(),
    label: BAND_LABELS[b],
    value: Number(form['thr_' + b]) || 0,
    karma: Number(form['karma_' + b]) || 0,
    energy: [5, 10, 15, 20][isInverse ? order.length - 1 - i : i],
    color: TIER_PALETTE[b === 'min' ? 1 : b === 'mid' ? 2 : b === 'top' ? 3 : 5],
  }))
}
const CloseX = ({ onClick }) => (
  <button onClick={onClick} className="mx-close" title="Закрыть">
    <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="15" stroke="#f87171" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 5" className="mx-ring" />
      <path d="M12 12 L22 22 M22 12 L12 22" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="mx-x" />
    </svg>
    <style jsx>{`
      .mx-close { position: absolute; top: 12px; right: 12px; background: none; border: none; cursor: pointer; padding: 4px; transition: transform .4s cubic-bezier(.34,1.56,.64,1); z-index: 5; }
      .mx-close:hover { transform: rotate(90deg) scale(1.12); }
      .mx-ring { transform-origin: 17px 17px; animation: mxSpin 6s linear infinite; }
      @keyframes mxSpin { to { transform: rotate(360deg); } }
    `}</style>
  </button>
)
const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
)
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

// Одна строка кастомного порога: название, значение, кармики, энергия,
// выбор цвета из палитры и удаление — всё через ту же стеклянную кнопочную
// стилистику, что и остальной проект, без стандартных браузерных контролов.
function TierRow({ tier, onChange, onDelete, canDelete }) {
  const [colorOpen, setColorOpen] = useState(false)
  const set = (k, v) => onChange({ ...tier, [k]: v })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '30px 1.4fr 0.8fr 0.7fr 0.7fr 30px', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
      <button type="button" onClick={() => setColorOpen(o => !o)} title="Цвет уровня"
        style={{ width: 20, height: 20, borderRadius: '50%', background: tier.color, border: '2px solid rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }} />
      {colorOpen && (
        <div style={{ position: 'absolute', top: 34, left: 8, zIndex: 10, display: 'flex', gap: 5, padding: 8, borderRadius: 10, background: '#1a1f2f', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 20px rgba(0,0,0,0.5)' }}>
          {TIER_PALETTE.map(c => (
            <button key={c} type="button" onClick={() => { set('color', c); setColorOpen(false) }}
              style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: c === tier.color ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
          ))}
        </div>
      )}
      <input className="input-field" style={{ width: '100%', fontSize: 12 }} placeholder="Название уровня" value={tier.label} onChange={e => set('label', e.target.value)} />
      <input type="number" step="0.1" className="input-field" style={{ width: '100%', fontSize: 12 }} placeholder="Порог" value={tier.value} onChange={e => set('value', e.target.value)} />
      <input type="number" className="input-field" style={{ width: '100%', fontSize: 12 }} placeholder="Кармики" value={tier.karma} onChange={e => set('karma', e.target.value)} />
      <input type="number" className="input-field" style={{ width: '100%', fontSize: 12 }} placeholder="Энергия" value={tier.energy} onChange={e => set('energy', e.target.value)} />
      <button type="button" onClick={onDelete} disabled={!canDelete} title={canDelete ? 'Удалить уровень' : 'Должен остаться хотя бы один уровень'}
        style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, padding: 6, color: canDelete ? '#f87171' : '#555', cursor: canDelete ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TrashIcon />
      </button>
    </div>
  )
}

function MasteryAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [pool, setPool] = useState([])
  const [companyKarma, setCompanyKarma] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMetric, setEditMetric] = useState(null)
  const [materialsMetric, setMaterialsMetric] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    if (r.ok) {
      const m = await r.json()
      setMetrics(m)
      const p = {}
      ;(m || []).forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i }))
      setPool(Object.values(p))
    }
    const { data: acc } = await supabase.from('company_karma_accounts').select('balance').eq('company_id', prof.company_id).maybeSingle()
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
    if (r.ok) { showSuccess(id ? 'Показатель обновлён' : 'Показатель создан'); setCreateOpen(false); setEditMetric(null); load() }
    else showError('Ошибка: ' + (d.error || 'сохранение не удалось'))
  }

  const delMetric = async id => {
    const h = await auth()
    const r = await fetch(`/api/company-admin/kpi/metrics?id=${id}`, { method: 'DELETE', headers: h })
    if (r.ok) { showSuccess('Показатель удалён'); load() }
    else showError('Не удалось удалить показатель')
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      delMetric(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#888', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(255,215,0,0.06)' }}>Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.</span>
            <button onClick={() => setCreateOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Создать цель</button>
          </div>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginBottom: 28, alignItems: 'start' }}>
          {metrics.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Целей пока нет — создайте первую</div>}
          {metrics.map(m => (
            <div key={m.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.25s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, minWidth: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }} title={m.name}>{m.name}</div>
                <span style={{ fontSize: 10, color: '#c084fc', whiteSpace: 'nowrap' }}>{TYPE_LABELS[m.kpi_type || 'cumulative']}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {resolveThresholds(m).map(t => <span key={t.key} style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: `${t.color}12`, color: t.color, border: `1px solid ${t.color}33` }}>{t.label} {t.value}{m.unit}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setMaterialsMetric(m)} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Материалы</button>
                <button onClick={() => setEditMetric(m)} title="Редактировать" style={{ background: 'rgba(160,233,255,0.08)', border: '1px solid rgba(160,233,255,0.3)', borderRadius: 10, padding: '8px 10px', color: '#a0e9ff', cursor: 'pointer', transition: 'all .25s', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#a0e9ff'; e.currentTarget.style.boxShadow = '0 0 12px rgba(160,233,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(160,233,255,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <PencilIcon />
                </button>
                <button onClick={() => setDeleteConfirm(m)} title="Удалить" style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 10, padding: '8px 10px', color: '#f87171', cursor: 'pointer', transition: 'all .25s', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.boxShadow = '0 0 12px rgba(244,67,54,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(244,67,54,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GoalFormModal open={createOpen || !!editMetric} initial={editMetric} pool={pool} setPool={setPool} companyKarma={companyKarma} onClose={() => { setCreateOpen(false); setEditMetric(null) }} onSave={saveMetric} />
      <MaterialsModal metric={materialsMetric} onClose={() => setMaterialsMetric(null)} />

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: '#1a1f2f', border: '1px solid rgba(244,67,54,0.4)', borderRadius: 20, padding: 28, maxWidth: 380, width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Удалить цель?</div>
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 20 }}>«{deleteConfirm.name}» будет удалена. Это действие нельзя отменить.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...ghostBtn, flex: 1 }}>Отмена</button>
              <button onClick={confirmDelete} style={{ flex: 1, background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.5)', borderRadius: 12, padding: '9px 18px', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`, color: active ? color : '#999', transition: 'all 0.25s ease' }}>{children}</button>
)

function GoalFormModal({ open, initial, pool, setPool, companyKarma, onClose, onSave }) {
  const [step, setStep] = useState('type')
  const [newParam, setNewParam] = useState({ label: '', unit: 'шт' })
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (open) {
      const hasCustom = Array.isArray(initial?.thresholds) && initial.thresholds.length > 0
      setForm(initial ? { name: initial.name, unit: initial.unit, kpi_type: initial.kpi_type || 'cumulative', thr_min: initial.thr_min, thr_mid: initial.thr_mid, thr_top: initial.thr_top, thr_ultra: initial.thr_ultra, karma_min: initial.karma_min, karma_mid: initial.karma_mid, karma_top: initial.karma_top, karma_ultra: initial.karma_ultra, description: initial.description || '', advice: initial.advice || '', num: initial.formula?.num || '', den: initial.formula?.den || '', mult: initial.formula?.mult || 100, useCustom: hasCustom, customTiers: hasCustom ? initial.thresholds.map(t => ({ ...t })) : null }
        : { name: '', unit: '%', kpi_type: null, thr_min: 5, thr_mid: 10, thr_top: 15, thr_ultra: 20, karma_min: 1, karma_mid: 3, karma_top: 5, karma_ultra: 10, description: '', advice: '', num: '', den: '', mult: 100, useCustom: false, customTiers: null })
      setStep(initial?.kpi_type ? 'form' : 'type')
    }
  }, [open, initial])

  if (!open || !form) return null
  const isInverse = form.kpi_type === 'inverse'
  const addParam = () => { if (!newParam.label.trim()) return; const key = slug(newParam.label); if (!pool.find(p => p.key === key)) setPool(p => [...p, { key, label: newParam.label.trim(), unit: newParam.unit || 'шт' }]); setNewParam({ label: '', unit: 'шт' }) }

  const toggleCustom = () => {
    if (!form.useCustom) {
      // Включаем «Свои уровни» — если ещё не настраивали, стартуем не с
      // пустого места, а с конвертации того, что уже введено в стандартном
      // шаблоне (или значений по умолчанию).
      setForm({ ...form, useCustom: true, customTiers: form.customTiers || toCustomTiers(form, isInverse) })
    } else {
      setForm({ ...form, useCustom: false })
    }
  }
  const updateTier = (i, next) => setForm(f => ({ ...f, customTiers: f.customTiers.map((t, idx) => idx === i ? next : t) }))
  const deleteTier = i => setForm(f => ({ ...f, customTiers: f.customTiers.filter((_, idx) => idx !== i) }))
  const addTier = () => setForm(f => ({ ...f, customTiers: [...(f.customTiers || []), { key: newTierKey(), label: `Уровень ${(f.customTiers?.length || 0) + 1}`, value: 0, karma: 0, energy: 5, color: TIER_PALETTE[(f.customTiers?.length || 0) % TIER_PALETTE.length] }] }))

  const submit = () => {
    if (!form.name.trim()) return
    let inputs = [], formula = null
    if (form.kpi_type === 'ratio') { if (!form.num || !form.den) return; inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean); formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 } }
    const nums = {}; ['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => nums[k] = Number(form[k]) || 0)
    // Свои уровни — сортируем от мягкого к строгому с учётом направления,
    // чтобы lib/kpi.js::bandFor читал их в правильном порядке.
    let thresholds = null
    if (form.useCustom && form.customTiers?.length) {
      thresholds = [...form.customTiers]
        .sort((a, b) => isInverse ? Number(b.value) - Number(a.value) : Number(a.value) - Number(b.value))
        .map(t => ({ key: t.key, label: t.label.trim() || t.key, value: Number(t.value) || 0, karma: Number(t.karma) || 0, energy: Number(t.energy) || 0, color: t.color }))
    }
    onSave({ ...form, mode: form.kpi_type === 'ratio' ? 'formula' : 'direct', ...nums, ...AUTO_ENERGY, inputs, formula, thresholds }, initial?.id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(980px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <CloseX onClick={onClose} />
        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>Баланс компании: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм. · Энергия авто (5/10/15/20)</div>
        {step === 'type' ? (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff' }}>Выберите тип расчёта</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TYPE_META.map(t => (
                <button key={t.key} onClick={() => { setForm(f => ({ ...f, kpi_type: t.key })); setStep('form') }}
                  style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.background = 'rgba(255,215,0,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                  <span style={{ color: '#FFD700', fontWeight: 600, fontSize: 13 }}>{t.label}</span>
                  <span style={{ color: '#999', fontSize: 12, lineHeight: 1.4 }}>{t.hint} <span style={{ color: '#666' }}>Примеры: {t.ex}</span></span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff' }}>{initial ? 'Редактировать цель' : 'Новая цель'} · {TYPE_LABELS[form.kpi_type]}</h3>
            {isInverse && <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'rgba(160,233,255,0.07)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff', fontSize: 12 }}>Меньше — лучше. Заполняйте от лучшего (малого) к допустимому (большому).</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Название (до 24)</label><input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Единица</label><select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option></select></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Тип</label><button onClick={() => setStep('type')} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11, width: '100%' }}>Сменить</button></div>
              {form.kpi_type === 'ratio' && (<>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Числитель</label><select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Знаменатель</label><select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Множитель</label><input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}><input className="input-field" style={{ flex: 1 }} placeholder="Новый параметр" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} /><button onClick={addParam} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11 }}>+</button></div>
              </>)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Пороги выполнения</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Seg active={!form.useCustom} onClick={toggleCustom} color="#a0e9ff">Шаблон · 4 уровня</Seg>
                <Seg active={form.useCustom} onClick={toggleCustom} color="#c084fc">Свои уровни</Seg>
              </div>
            </div>

            {!form.useCustom ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {(isInverse ? THRESH_INVERSE : THRESH_NORMAL).map(t => (
                  <div key={t.k}><label style={{ fontSize: 11, color: t.color, display: 'block', marginBottom: 4 }}>{t.label}</label><input type="number" step="0.1" placeholder={t.ph} className="input-field" style={{ width: '100%' }} value={form[t.k]} onChange={e => setForm({ ...form, [t.k]: e.target.value })} /></div>
                ))}
                {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map((k, i) => (
                  <div key={k}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Кармики · {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {isInverse && <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: 'rgba(160,233,255,0.07)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff', fontSize: 11 }}>Меньше — лучше: у самого строгого уровня должен быть самый маленький порог.</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '30px 1.4fr 0.8fr 0.7fr 0.7fr 30px', gap: 8, padding: '0 10px', marginBottom: 6 }}>
                  <span />
                  <span style={{ fontSize: 10, color: '#666' }}>Название</span>
                  <span style={{ fontSize: 10, color: '#666' }}>Порог</span>
                  <span style={{ fontSize: 10, color: '#666' }}>Кармики</span>
                  <span style={{ fontSize: 10, color: '#666' }}>Энергия</span>
                  <span />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(form.customTiers || []).map((t, i) => (
                    <TierRow key={t.key} tier={t} onChange={next => updateTier(i, next)} onDelete={() => deleteTier(i)} canDelete={(form.customTiers || []).length > 1} />
                  ))}
                </div>
                <button type="button" onClick={addTier} style={{ ...ghostBtn, marginTop: 10, fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Добавить уровень</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Описание</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Советы</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
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

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  useEffect(() => { if (metric) load(metric.id) }, [metric])
  const load = async mid => { const h = await auth(); const r = await fetch(`/api/company-admin/kpi/trainings?metricId=${mid}`, { headers: h }); if (r.ok) setTrainings(await r.json()) }

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
    const r = await fetch('/api/company-admin/kpi/trainings', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ metric_id: metric.id, ...tForm, url }) })
    if (r.ok) { showSuccess('Тренинг добавлен'); setTForm({ title: '', type: 'video', url: '', content: '', recommend_below: 'all' }); setFile(null); load(metric.id) }
    else showError('Ошибка создания тренинга')
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
                {t.type === 'video' && <button onClick={() => setVideo(t)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Показать</button>}
                <Link href={`/company-admin/tests?training=${t.id}`} style={{ ...ghostBtn, textDecoration: 'none', borderColor: 'rgba(192,132,252,0.4)', color: '#c084fc' }}>Тест</Link>
              </div>
            </div>
          ))}
          {trainings.length === 0 && <p style={{ color: '#777', fontSize: 12 }}>Материалов пока нет</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input-field" placeholder="Название" value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} />
          <select className="input-field" value={tForm.type} onChange={e => setTForm({ ...tForm, type: e.target.value })}><option value="video">Видео</option><option value="text">Текст</option></select>
          {tForm.type === 'video' && (<>
            <input className="input-field" placeholder="Или URL видео" value={tForm.url} onChange={e => setTForm({ ...tForm, url: e.target.value })} />
            <label style={{ ...ghostBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>{file ? file.name : 'Загрузить файл'}<input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} /></label>
          </>)}
          {uploading && (
            <div style={{ gridColumn: '1 / -1', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, #FFD700, #4ade80)', borderRadius: 3, animation: 'upMove 1.1s ease-in-out infinite' }} />
              <style jsx>{`@keyframes upMove { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <button onClick={add} disabled={uploading} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12, opacity: uploading ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{uploading ? 'Загрузка видео…' : 'Добавить тренинг'}</button>
          </div>
        </div>
      </div>
      {video && <TrainingVideoModal training={video} onClose={() => setVideo(null)} />}
    </div>
  )
}

export default withAuth(MasteryAdmin, { adminOnly: true })
