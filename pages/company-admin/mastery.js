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
import PeriodHint, { PERIOD_LABELS } from '../../components/PeriodHint'

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
// Простые кастомные иконки для карточек выбора типа расчёта — единый
// стиль (stroke, без заливки, без эмодзи) с остальным проектом.
const TYPE_ICONS = {
  average: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  cumulative: <><rect x="4" y="14" width="4" height="7" /><rect x="10" y="9" width="4" height="12" /><rect x="16" y="4" width="4" height="17" /></>,
  plan: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  ratio: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 9 9h-9z" /></>,
  inverse: <path d="M20 7L13 14l-4-4-6 6" />,
  binary: <><circle cx="8" cy="12" r="5" /><path d="M13 9l3 3-3 3" /></>,
  min_period: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8 15l2 2 4-4" /></>,
  dynamics: <><path d="M4 17l5-6 4 4 7-9" /><path d="M15 6h5v5" /></>,
  rating: <><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" /></>,
  weighted: <><path d="M12 3v18M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z" /><path d="M5 8h14" /></>,
}
const TypeIcon = ({ type, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {TYPE_ICONS[type]}
  </svg>
)
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
  const [departments, setDepartments] = useState([])
  const [myScope, setMyScope] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMetric, setEditMetric] = useState(null)
  const [materialsMetric, setMaterialsMetric] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailsMetric, setDetailsMetric] = useState(null)

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Сессия истекла — обновите страницу и войдите заново')
    return { Authorization: `Bearer ${session.access_token}` }
  }

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { showError('Сессия не найдена — войдите заново'); return }
      const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      const h = await auth()
      const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
      if (r.ok) {
        const m = await r.json()
        setMetrics(m)
        const p = {}
        ;(m || []).forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i }))
        setPool(Object.values(p))
      } else {
        const d = await r.json().catch(() => ({}))
        showError('Не удалось загрузить цели: ' + (d.error || `код ${r.status}`))
      }
      const dr = await fetch('/api/company-admin/departments', { headers: h })
      if (dr.ok) { const dd = await dr.json(); setDepartments(dd.departments || []); setMyScope(dd.scope) }
      if (prof?.company_id) {
        const { data: acc } = await supabase.from('company_karma_accounts').select('balance').eq('company_id', prof.company_id).maybeSingle()
        setCompanyKarma(acc?.balance || 0)
      }
    } catch (e) {
      showError('Не удалось загрузить раздел целей: ' + (e.message || 'ошибка соединения'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const saveMetric = async (payload, id) => {
    try {
      const h = await auth()
      const r = id
        ? await fetch('/api/company-admin/kpi/metrics', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...payload }) })
        : await fetch('/api/company-admin/kpi/metrics', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await r.json()
      if (r.ok) { showSuccess(id ? 'Показатель обновлён' : 'Показатель создан'); setCreateOpen(false); setEditMetric(null); load() }
      else showError('Ошибка: ' + (d.error || 'сохранение не удалось'))
    } catch (e) {
      showError(e.message || 'Не удалось сохранить — проверьте соединение')
    }
  }

  const delMetric = async id => {
    try {
      const h = await auth()
      const r = await fetch(`/api/company-admin/kpi/metrics?id=${id}`, { method: 'DELETE', headers: h })
      if (r.ok) { showSuccess('Показатель удалён'); load() }
      else { const d = await r.json().catch(() => ({})); showError('Не удалось удалить показатель: ' + (d.error || `код ${r.status}`)) }
    } catch (e) {
      showError(e.message || 'Не удалось удалить показатель')
    }
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16, marginBottom: 28, alignItems: 'start' }}>
          {metrics.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Целей пока нет — создайте первую</div>}
          {metrics.map(m => (
            <div key={m.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 18, padding: 22, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.25s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.12)' }}>{PERIOD_LABELS[m.period || 'daily']}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(m.reward_image_url || m.reward_description) && (
                    <span title="Настроен приз за максимум" style={{ display: 'flex' }}>
                      {m.reward_image_url ? (
                        <img src={m.reward_image_url} alt="" style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="1" /><path d="M12 8v13M3 12h18M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>
                      )}
                    </span>
                  )}
                  <PeriodHint period={m.period || 'daily'} resetHour={m.reset_hour ?? 8} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                <div onClick={() => setDetailsMetric(m)} title="Показать полностью" style={{ color: '#fff', fontWeight: 600, fontSize: 16, minWidth: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, cursor: 'pointer' }}>{m.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: '#c084fc', whiteSpace: 'nowrap' }}>{TYPE_LABELS[m.kpi_type || 'cumulative']}</span>
                  <span style={{ fontSize: 9, padding: '1px 8px', borderRadius: 20, whiteSpace: 'nowrap', background: m.department_id ? 'rgba(160,233,255,0.1)' : 'rgba(255,215,0,0.1)', color: m.department_id ? '#a0e9ff' : '#FFD700', border: `1px solid ${m.department_id ? 'rgba(160,233,255,0.3)' : 'rgba(255,215,0,0.3)'}` }}>
                    {m.department_id ? (departments.find(d => d.id === m.department_id)?.name || 'Отдел') : 'Вся компания'}
                  </span>
                </div>
              </div>

              {/* Рейтинговая шкала порогов — каждый уровень собственным
                  сегментом с названием и значением внутри, вместо мелких
                  пилюль отдельно от тонкой линии-индикатора. */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {resolveThresholds(m).map(t => (
                  <div key={t.key} style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: `${t.color}14`, border: `1px solid ${t.color}40` }}>
                    <div style={{ fontSize: 9, color: t.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                    <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, marginTop: 2 }}>{t.value}<span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>{m.unit}</span></div>
                  </div>
                ))}
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

      <GoalFormModal open={createOpen || !!editMetric} initial={editMetric} pool={pool} setPool={setPool} companyKarma={companyKarma} departments={departments} myScope={myScope} onClose={() => { setCreateOpen(false); setEditMetric(null) }} onSave={saveMetric} />
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

      {detailsMetric && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={() => setDetailsMetric(null)}>
          <div style={{ background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 20, padding: 28, maxWidth: 520, width: '94%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0 }}>{detailsMetric.name}</h3>
              <button onClick={() => setDetailsMetric(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <span style={{ fontSize: 11, color: '#c084fc' }}>{TYPE_LABELS[detailsMetric.kpi_type || 'cumulative']}</span>
            {detailsMetric.description && <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, margin: '14px 0' }}>{detailsMetric.description}</p>}
            {detailsMetric.advice && (
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.2)', fontSize: 13, color: '#a0e9ff', marginBottom: 16 }}>{detailsMetric.advice}</div>
            )}
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Пороги выполнения</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(resolveThresholds(detailsMetric).length, 4)}, 1fr)`, gap: 8 }}>
              {resolveThresholds(detailsMetric).map(t => (
                <div key={t.key} style={{ padding: 12, borderRadius: 10, textAlign: 'center', background: `${t.color}0d`, border: `1px solid ${t.color}33` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</div>
                  <div style={{ fontSize: 16, color: '#fff', marginTop: 4, fontWeight: 600 }}>{t.value}{detailsMetric.unit}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>+{t.energy} эн. · +{t.karma} к.</div>
                </div>
              ))}
            </div>
            {detailsMetric.source === 'auto' && (
              <div style={{ marginTop: 16, fontSize: 11, color: '#4ade80' }}>Источник: автоматический (внешняя интеграция)</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`, color: active ? color : '#999', transition: 'all 0.25s ease' }}>{children}</button>
)

function GoalFormModal({ open, initial, pool, setPool, companyKarma, departments, myScope, onClose, onSave }) {
  const { showError } = useFeedback()
  const [step, setStep] = useState('type')
  const [newParam, setNewParam] = useState({ label: '', unit: 'шт' })
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (open) {
      const hasCustom = Array.isArray(initial?.thresholds) && initial.thresholds.length > 0
      setForm(initial ? { name: initial.name, unit: initial.unit, kpi_type: initial.kpi_type || 'cumulative', thr_min: initial.thr_min, thr_mid: initial.thr_mid, thr_top: initial.thr_top, thr_ultra: initial.thr_ultra, karma_min: initial.karma_min, karma_mid: initial.karma_mid, karma_top: initial.karma_top, karma_ultra: initial.karma_ultra, description: initial.description || '', advice: initial.advice || '', num: initial.formula?.num || '', den: initial.formula?.den || '', mult: initial.formula?.mult || 100, useCustom: hasCustom, customTiers: hasCustom ? initial.thresholds.map(t => ({ ...t })) : null, source: initial.source || 'manual', source_url: initial.source_config?.url || '', department_id: initial.department_id || '', period: initial.period || 'daily', reset_hour: initial.reset_hour ?? 8, reward_description: initial.reward_description || '', reward_image_file: null, reward_preview_url: initial.reward_image_url || '' }
        : { name: '', unit: '%', kpi_type: null, thr_min: 5, thr_mid: 10, thr_top: 15, thr_ultra: 20, karma_min: 1, karma_mid: 3, karma_top: 5, karma_ultra: 10, description: '', advice: '', num: '', den: '', mult: 100, useCustom: false, customTiers: null, source: 'manual', source_url: '', department_id: '', period: 'daily', reset_hour: 8, reward_description: '', reward_image_file: null, reward_preview_url: '' })
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

  const submit = async () => {
    try {
      if (!form.name.trim()) { showError('Укажите название цели'); return }
      if (myScope !== null && !form.department_id) { showError('Выберите отдел — вы не администратор компании, показатель нужно привязать к своей команде'); return }
      let inputs = [], formula = null
      if (form.kpi_type === 'ratio') {
        if (!form.num || !form.den) { showError('Для «Доля / конверсия» выберите числитель и знаменатель'); return }
        inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean); formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 }
      }
      if (form.useCustom && (!form.customTiers || form.customTiers.length === 0)) { showError('Добавьте хотя бы один уровень или переключитесь на стандартный шаблон'); return }
      const nums = {}; ['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => nums[k] = Number(form[k]) || 0)
      // Свои уровни — сортируем от мягкого к строгому с учётом направления,
      // чтобы lib/kpi.js::bandFor читал их в правильном порядке.
      let thresholds = null
      if (form.useCustom && form.customTiers?.length) {
        thresholds = [...form.customTiers]
          .sort((a, b) => isInverse ? Number(b.value) - Number(a.value) : Number(a.value) - Number(b.value))
          .map(t => ({ key: t.key, label: (t.label || '').trim() || t.key, value: Number(t.value) || 0, karma: Number(t.karma) || 0, energy: Number(t.energy) || 0, color: t.color }))
      }
      // Фото приза (п.3 фидбека) — грузим в тот же бакет, что и остальные
      // изображения проекта, тем же способом, что и товары магазина.
      let rewardImageUrl = initial?.reward_image_url || null
      if (form.reward_image_file) {
        const ext = form.reward_image_file.name.split('.').pop()
        const path = `public/reward-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, form.reward_image_file)
        if (!upErr) rewardImageUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }
      onSave({ ...form, mode: form.kpi_type === 'ratio' ? 'formula' : 'direct', ...nums, ...AUTO_ENERGY, inputs, formula, thresholds, source: form.source, source_config: form.source === 'auto' ? { url: form.source_url, emailField: 'email', valueField: 'value', ...(initial?.source_config?.mock_data ? { mock_data: initial.source_config.mock_data } : {}) } : null, department_id: form.department_id || null, reward_image_url: rewardImageUrl, reward_description: form.reward_description || null }, initial?.id)
    } catch (e) {
      showError('Не удалось подготовить цель к сохранению: ' + (e.message || 'непредвиденная ошибка'))
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(980px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <CloseX onClick={onClose} />
        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>Баланс компании: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм. · Энергия авто (5/10/15/20)</div>
        {step === 'type' ? (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: '#fff' }}>Выберите тип расчёта</h3>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 18px' }}>Как считать значение показателя — от этого зависят и пороги ниже</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {TYPE_META.map(t => (
                <button key={t.key} onClick={() => { setForm(f => ({ ...f, kpi_type: t.key })); setStep('form') }}
                  style={{ display: 'flex', gap: 14, textAlign: 'left', padding: '16px 18px', borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.background = 'rgba(255,215,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>
                    <TypeIcon type={t.key} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.label}</span>
                    <span style={{ display: 'block', color: '#999', fontSize: 12, lineHeight: 1.5 }}>{t.hint}</span>
                    <span style={{ display: 'inline-block', marginTop: 6, color: '#FFD700', fontSize: 10, padding: '2px 9px', borderRadius: 20, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>{t.ex}</span>
                  </span>
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Кому виден показатель</label>
                <select className="input-field" style={{ width: '100%' }} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                  {myScope === null && <option value="">Вся компания</option>}
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name} (отдел и все вложенные)</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Период обновления</label>
                <select className="input-field" style={{ width: '100%' }} value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                  <option value="quarterly">Ежеквартально</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Час обновления (МСК)</label>
                <input type="number" min="0" max="23" className="input-field" style={{ width: '100%' }} value={form.reset_hour} onChange={e => setForm({ ...form, reset_hour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })} />
              </div>
            </div>
            {myScope !== null && departments.length === 0 && <p style={{ fontSize: 11, color: '#f87171', margin: '-10px 0 16px' }}>У вас нет ни одного отдела в управлении — создайте отдел в «Отделах компании», прежде чем заводить показатель.</p>}

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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Источник значений</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Seg active={form.source !== 'auto'} onClick={() => setForm({ ...form, source: 'manual' })} color="#a0e9ff">Ручной ввод</Seg>
                <Seg active={form.source === 'auto'} onClick={() => setForm({ ...form, source: 'auto' })} color="#4ade80">Авто (внешний источник)</Seg>
              </div>
            </div>
            {form.source === 'auto' && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>URL внешнего источника (отдаёт JSON вида [{'{'}email, value{'}'}])</label>
                <input className="input-field" style={{ width: '100%' }} placeholder="https://ваша-crm.ru/api/kpi-export" value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} />
                <p style={{ fontSize: 11, color: '#777', margin: '8px 0 0' }}>
                  Раз в день (и по кнопке «Проверить сейчас») система дёргает эту ссылку и сама зачисляет пороги/награды. Ещё нет реальной CRM для интеграции — настройте и проверьте всю цепочку на тестовом источнике на странице <Link href="/company-admin/crm-sandbox" style={{ color: '#4ade80' }}>«Тест-стенд автозачёта»</Link>.
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Описание</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Советы</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
            </div>

            <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.2)' }}>
              <div style={{ fontSize: 11, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Приз за достижение максимума (необязательно)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, alignItems: 'start' }}>
                <div>
                  <label htmlFor="reward-image-upload" style={{ display: 'block', width: 100, height: 100, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: '1px dashed rgba(255,215,0,0.4)', background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
                    {form.reward_preview_url ? (
                      <img src={form.reward_preview_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888', textAlign: 'center', padding: 6 }}>Фото приза</span>
                    )}
                  </label>
                  <input id="reward-image-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setForm({ ...form, reward_image_file: f, reward_preview_url: URL.createObjectURL(f) }) }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Что получит сотрудник</label>
                  <textarea className="input-field" style={{ width: '100%' }} rows={3} placeholder="Например: Сертификат в ресторан на 5000₽" value={form.reward_description} onChange={e => setForm({ ...form, reward_description: e.target.value })} />
                </div>
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
