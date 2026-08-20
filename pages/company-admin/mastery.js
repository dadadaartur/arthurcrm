import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import DateRangePicker from '../../components/DateRangePicker'
import TrainingVideoModal from '../../components/TrainingVideoModal'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { BAND_LABELS, BAND_COLORS, TYPE_LABELS } from '../../lib/kpi'

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
  { k: 'thr_min', label: 'Мин', sub: 'допустимый', color: BAND_COLORS.min, ph: '5' },
  { k: 'thr_mid', label: 'Средн', sub: 'норма', color: BAND_COLORS.mid, ph: '10' },
  { k: 'thr_top', label: 'Топ', sub: 'цель', color: BAND_COLORS.top, ph: '15' },
  { k: 'thr_ultra', label: 'Ультра', sub: 'лучший', color: BAND_COLORS.ultra, ph: '20' },
]
const THRESH_INVERSE = [
  { k: 'thr_ultra', label: 'Ультра', sub: 'лучший', color: BAND_COLORS.ultra, ph: '5' },
  { k: 'thr_top', label: 'Топ', sub: 'цель', color: BAND_COLORS.top, ph: '8' },
  { k: 'thr_mid', label: 'Средн', sub: 'норма', color: BAND_COLORS.mid, ph: '11' },
  { k: 'thr_min', label: 'Мин', sub: 'допустимый', color: BAND_COLORS.min, ph: '15' },
]

// ============ ПРЕМИАЛЬНЫЕ ИКОНКИ ============
const PencilIcon = ({ size = 16, color = '#a0e9ff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M16.474 5.408l2.118 2.117m-.756-3.982L12.192 9.192m-1.06 1.06L4.5 16.884V21h4.243l6.632-6.632m-1.06 1.06l2.118 2.118" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.5 3.5l6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.4"/>
  </svg>
)

const CloseXAnimated = ({ onClick, size = 28 }) => (
  <button onClick={onClick} className="mx-close-animated" title="Удалить" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="15" stroke="#f87171" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 5" className="mx-ring-a" />
      <path d="M12 12 L22 22 M22 12 L12 22" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="mx-x-a" />
    </svg>
    <style jsx>{`
      .mx-close-animated { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }
      .mx-close-animated:hover { transform: rotate(90deg) scale(1.15); }
      .mx-ring-a { transform-origin: 17px 17px; animation: mxSpinA 6s linear infinite; }
      @keyframes mxSpinA { to { transform: rotate(360deg); } }
      .mx-x-a { transition: stroke-opacity 0.2s; }
      .mx-close-animated:hover .mx-x-a { stroke-opacity: 1; }
    `}</style>
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
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, name }

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    if (r.ok) { const m = await r.json(); setMetrics(m); const p = {}; (m || []).forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i })); setPool(Object.values(p)) }
    const { data: emps } = await supabase.from('profiles').select('user_id, display_name, email, first_name, last_name').eq('company_id', prof.company_id).is('deleted_at', null).eq('is_company_admin', false)
    setEmployees(emps || [])
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

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const h = await auth()
    await fetch('/api/company-admin/kpi/metrics', { method: 'DELETE', headers: h, body: JSON.stringify({ id: deleteConfirm.id }) })
    showSuccess('Цель удалена')
    setDeleteConfirm(null)
    load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#888', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(255,215,0,0.06)' }}>Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.</span>
            <Link href="/company-admin/tests" style={{ ...ghostBtn, textDecoration: 'none' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Тесты</Link>
            <button onClick={() => setCreateOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Создать цель</button>
          </div>
        } />

        {/* Сетка карточек целей */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 28 }}>
          {metrics.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Целей пока нет — создайте первую</div>}
          {metrics.map(m => {
            const isInverse = m.kpi_type === 'inverse'
            const thresholds = isInverse ? THRESH_INVERSE : THRESH_NORMAL
            return (
              <div key={m.id} style={{
                background: 'rgba(15,20,35,0.85)', borderRadius: 18, padding: '20px 22px',
                border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.25s, box-shadow 0.25s',
                display: 'flex', flexDirection: 'column', gap: 14, position: 'relative'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}>

                {/* Шапка: тип + название + действия */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                    color: '#c084fc', padding: '3px 8px', borderRadius: 6,
                    background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)',
                    whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2
                  }}>{TYPE_LABELS[m.kpi_type || 'cumulative']}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', wordBreak: 'break-word'
                    }}>{m.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => setEditMetric(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,233,255,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                      title="Редактировать">
                      <PencilIcon size={16} color="#a0e9ff" />
                    </button>
                    <CloseXAnimated onClick={() => setDeleteConfirm({ id: m.id, name: m.name })} size={26} />
                  </div>
                </div>

                {/* Пороги — читаемая сетка 2×2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {thresholds.map(t => (
                    <div key={t.k} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      borderRadius: 10, background: `${t.color}0a`, border: `1px solid ${t.color}22`
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, boxShadow: `0 0 6px ${t.color}66`, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: '#888', lineHeight: 1.2 }}>{t.label} <span style={{ color: '#666' }}>· {t.sub}</span></div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.color, whiteSpace: 'nowrap' }}>{m[t.k]}{m.unit}</div>
                    </div>
                  ))}
                </div>

                {/* Инверсия-подсказка */}
                {isInverse && (
                  <div style={{ fontSize: 10, color: '#a0e9ff', padding: '4px 10px', borderRadius: 8, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.15)' }}>
                    ↓ Меньше значение = выше уровень
                  </div>
                )}

                {/* Ссылка на материалы — тонкая надпись без рамки */}
                <button onClick={() => setMaterialsMetric(m)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0',
                  fontSize: 11, color: '#888', textAlign: 'left', transition: 'color 0.2s',
                  textDecoration: 'none', letterSpacing: 0.2
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#FFD700' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#888' }}>
                  связанные тесты и тренинги →
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Модалки */}
      <GoalFormModal open={createOpen || !!editMetric} initial={editMetric} pool={pool} setPool={setPool} companyKarma={companyKarma} onClose={() => { setCreateOpen(false); setEditMetric(null) }} onSave={saveMetric} />
      <MaterialsModal metric={materialsMetric} onClose={() => setMaterialsMetric(null)} />

      {/* Подтверждение удаления */}
      <PremiumModal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Удалить цель?" showCloseButton={false}>
        <p style={{ color: '#ccc', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
          Вы действительно хотите удалить цель <b style={{ color: '#fff' }}>«{deleteConfirm?.name}»</b>? Все связанные данные и история будут потеряны.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setDeleteConfirm(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
          <button onClick={confirmDelete} style={{
            flex: 1, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.4)',
            color: '#f87171', cursor: 'pointer', transition: 'all 0.25s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,67,54,0.25)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(244,67,54,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,67,54,0.12)'; e.currentTarget.style.boxShadow = 'none' }}>
            Удалить навсегда
          </button>
        </div>
      </PremiumModal>
    </div>
  )
}

// ============ МОДАЛКА СОЗДАНИЯ / РЕДАКТИРОВАНИЯ ============
const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{
    padding: '8px 16px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
    background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`, color: active ? color : '#999',
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
        name: initial.name, unit: initial.unit, kpi_type: initial.kpi_type || 'cumulative',
        thr_min: initial.thr_min, thr_mid: initial.thr_mid, thr_top: initial.thr_top, thr_ultra: initial.thr_ultra,
        karma_min: initial.karma_min, karma_mid: initial.karma_mid, karma_top: initial.karma_top, karma_ultra: initial.karma_ultra,
        description: initial.description || '', advice: initial.advice || '',
        num: initial.formula?.num || '', den: initial.formula?.den || '', mult: initial.formula?.mult || 100
      } : {
        name: '', unit: '%', kpi_type: null,
        thr_min: 5, thr_mid: 10, thr_top: 15, thr_ultra: 20,
        karma_min: 1, karma_mid: 3, karma_top: 5, karma_ultra: 10,
        description: '', advice: '', num: '', den: '', mult: 100
      })
      setStep(initial?.kpi_type ? 'form' : 'type')
    }
  }, [open, initial])

  if (!open || !form) return null
  const isInverse = form.kpi_type === 'inverse'

  const addParam = () => { if (!newParam.label.trim()) return; const key = slug(newParam.label); if (!pool.find(p => p.key === key)) setPool(p => [...p, { key, label: newParam.label.trim(), unit: newParam.unit || 'шт' }]); setNewParam({ label: '', unit: 'шт' }) }

  const submit = () => {
    if (!form.name.trim()) return
    let inputs = [], formula = null
    if (form.kpi_type === 'ratio') { if (!form.num || !form.den) return; inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean); formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 } }
    const nums = {}; ['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => nums[k] = Number(form[k]) || 0)
    onSave({ ...form, mode: form.kpi_type === 'ratio' ? 'formula' : 'direct', ...nums, ...AUTO_ENERGY, inputs, formula }, initial?.id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(980px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Название (до 24)</label><input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Единица</label><select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option></select></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Тип</label><button onClick={() => setStep('type')} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11, width: '100%' }}>Сменить</button></div>
              {form.kpi_type === 'ratio' && (<>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Числитель</label><select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Знаменатель</label><select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Множитель</label><input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}><input className="input-field" style={{ flex: 1 }} placeholder="Новый параметр" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} /><button onClick={addParam} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11 }}>+</button></div>
              </>)}
              {(isInverse ? THRESH_INVERSE : THRESH_NORMAL).map(t => (
                <div key={t.k}><label style={{ fontSize: 11, color: t.color, display: 'block', marginBottom: 4 }}>{t.label}</label><input type="number" step="0.1" placeholder={t.ph} className="input-field" style={{ width: '100%' }} value={form[t.k]} onChange={e => setForm({ ...form, [t.k]: e.target.value })} /></div>
              ))}
              {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map((k, i) => (
                <div key={k}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Кармики · {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Описание</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Советы</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
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

// ============ МОДАЛКА МАТЕРИАЛОВ ============
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
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
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
              <div className="up-bar" style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, #FFD700, #4ade80)', borderRadius: 3 }} />
              <style jsx>{`.up-bar{animation:upMove 1.1s ease-in-out infinite}@keyframes upMove{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
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
