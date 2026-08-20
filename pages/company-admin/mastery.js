import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import TrainingVideoModal from '../../components/TrainingVideoModal'
import PremiumModal from '../../components/PremiumModal'
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
  { key: 'average', label: 'Среднее за период', hint: 'Средняя арифметика за день/неделю/месяц.', ex: 'CSI, средний чек, время обработки' },
  { key: 'cumulative', label: 'Накопительное', hint: 'Общая сумма за период.', ex: 'Звонки, продажи, задачи' },
  { key: 'plan', label: 'Процент выполнения плана', hint: 'Факт ÷ план × 100%.', ex: 'План продаж, SLA' },
  { key: 'ratio', label: 'Доля / конверсия', hint: 'Успешные ÷ всего × 100, из двух параметров.', ex: 'Конверсия лид→встреча' },
  { key: 'inverse', label: 'Инверсия (меньше — лучше)', hint: 'Ниже значение — выше уровень.', ex: 'SLA лида, время, жалобы' },
  { key: 'binary', label: 'Бинарный (да/нет в %)', hint: 'Доля выполненных условий.', ex: 'Скрипт, подтверждение' },
  { key: 'min_period', label: 'Накопит. с минимумом в днях', hint: 'Сумма, если минимум каждый день.', ex: 'Стабильность, посещаемость' },
  { key: 'dynamics', label: 'Динамика (прирост)', hint: 'Изменение к прошлому периоду, %.', ex: 'Рост продаж' },
  { key: 'rating', label: 'Рейтинг в команде', hint: 'Процентиль среди коллег.', ex: 'Топ-10 по продажам' },
  { key: 'weighted', label: 'Взвешенный индекс', hint: 'Комплексный KPI с весами.', ex: '0.5×продажи +0.3×CSI' }
]

const THRESH_ORDER = [
  { k: 'thr_ultra', key: 'ultra', label: 'Ультра', sub: 'лучший результат' },
  { k: 'thr_top', key: 'top', label: 'Топ', sub: 'цель' },
  { k: 'thr_mid', key: 'mid', label: 'Средн', sub: 'норма' },
  { k: 'thr_min', key: 'min', label: 'Мин', sub: 'допустимый' }
]

const valueWithUnit = (m, v) => {
  if (v == null || v === '') return '—'
  const label = m.unit_label && m.unit_label.trim() ? m.unit_label.trim() : (m.unit && m.unit !== 'шт' ? m.unit : '')
  return label ? `${v} ${label}` : `${v}`
}

const EditGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 6.5l3 3" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M16 3l5 5" stroke="#a0e9ff" strokeWidth="1.4" opacity="0.55" strokeLinecap="round" />
  </svg>
)

const DeleteGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#f87171" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 4" />
    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#f87171" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
)

const ModalClose = ({ onClick }) => (
  <button onClick={onClick} className="mx-close" title="Закрыть">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l10 10M13 3L3 13" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  </button>
)

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
      setMetrics(m || [])
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

    if (r.ok) {
      showSuccess(id ? 'Показатель обновлён' : 'Показатель создан')
      setCreateOpen(false)
      setEditMetric(null)
      load()
    } else {
      showError('Ошибка: ' + (d.error || 'сохранение не удалось'))
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const h = await auth()
    await fetch('/api/company-admin/kpi/metrics', { method: 'DELETE', headers: h, body: JSON.stringify({ id: deleteConfirm.id }) })
    showSuccess('Цель удалена')
    setDeleteConfirm(null)
    load()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <Spinner size={72} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
              Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.
            </span>
            <button onClick={() => setCreateOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Создать цель
            </button>
          </div>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {metrics.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: '#777' }}>
              Целей пока нет — создайте первую
            </div>
          )}

          {metrics.map(m => (
            <div key={m.id} className="mx-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word', color: '#fff' }}>
                    {m.name}
                  </div>

                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#c084fc', textShadow: '0 0 12px rgba(192,132,252,0.45)' }}>
                      {TYPE_LABELS[m.kpi_type || 'cumulative']}
                    </span>
                  </div>

                  {m.kpi_type === 'inverse' && (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#a0e9ff', textShadow: '0 0 10px rgba(160,233,255,0.35)' }}>
                      меньше значение = выше уровень
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingTop: 2 }}>
                  <button className="mx-icon mx-edit" onClick={() => setEditMetric(m)} title="Редактировать">
                    <EditGlyph />
                  </button>
                  <button className="mx-icon mx-del" onClick={() => setDeleteConfirm({ id: m.id, name: m.name })} title="Удалить">
                    <DeleteGlyph />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
                {THRESH_ORDER.map(t => (
                  <div key={t.k} style={{ padding: '9px 10px', borderRadius: 12, background: `radial-gradient(circle at 18% 18%, ${BAND_COLORS[t.key]}10, transparent 72%)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: BAND_COLORS[t.key], boxShadow: `0 0 8px ${BAND_COLORS[t.key]}`, flexShrink: 0 }} />
                      {t.key === 'ultra' ? <span className="mx-ultra">Ультра</span> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)' }}>{t.label}</span>}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: BAND_COLORS[t.key], textShadow: `0 0 16px ${BAND_COLORS[t.key]}55` }}>
                      {valueWithUnit(m, m[t.k])}
                    </div>

                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      {t.sub}
                    </div>
                  </div>
                ))}
              </div>

              <button className="mx-link" onClick={() => setMaterialsMetric(m)}>
                связанные тесты и тренинги →
              </button>
            </div>
          ))}
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

      <PremiumModal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Удалить цель?" showCloseButton={false}>
        <p style={{ color: '#ccc', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
          Вы действительно хотите удалить цель <b style={{ color: '#fff' }}>«{deleteConfirm?.name}»</b>? Все связанные данные и история будут потеряны.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setDeleteConfirm(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
          <button
            onClick={confirmDelete}
            style={{ flex: 1, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171', cursor: 'pointer', transition: 'all 0.25s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,67,54,0.22)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(244,67,54,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,67,54,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            Удалить навсегда
          </button>
        </div>
      </PremiumModal>

      <style jsx global>{`
        .mx-card {
          background: rgba(15,20,35,0.72);
          border-radius: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color .25s, transform .25s, box-shadow .25s;
          display: flex;
          flex-direction: column;
        }

        .mx-card:hover {
          border-color: rgba(255,215,0,0.35);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
        }

        .mx-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          cursor: pointer;
          transition: all .35s cubic-bezier(.22,1,.36,1);
          padding: 0;
          flex-shrink: 0;
        }

        .mx-edit:hover {
          border-color: rgba(160,233,255,.55);
          box-shadow: 0 0 16px rgba(160,233,255,.35);
          transform: translateY(-1px) rotate(-10deg) scale(1.08);
        }

        .mx-del:hover {
          border-color: rgba(248,113,113,.55);
          box-shadow: 0 0 16px rgba(248,113,113,.35);
          transform: translateY(-1px) rotate(90deg) scale(1.08);
        }

        .mx-ultra {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .6px;
          background: linear-gradient(90deg, #c084fc, #FFD700, #ffb3c6, #a0e9ff, #c084fc);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: mxUltraShift 3.5s linear infinite, mxUltraGlow 2.2s ease-in-out infinite;
        }

        @keyframes mxUltraShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        @keyframes mxUltraGlow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(192,132,252,0.55)); }
          50% { filter: drop-shadow(0 0 12px rgba(255,215,0,0.95)); }
        }

        .mx-link {
          margin-top: 14px;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          text-align: left;
          transition: all .25s;
          letter-spacing: .2px;
        }

        .mx-link:hover {
          color: #FFD700;
          text-shadow: 0 0 12px rgba(255,215,0,.45);
        }

        .mx-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .35s cubic-bezier(.22,1,.36,1);
          z-index: 5;
        }

        .mx-close:hover {
          transform: rotate(90deg) scale(1.08);
          border-color: rgba(248,113,113,.55);
          box-shadow: 0 0 14px rgba(248,113,113,.35);
        }
      `}</style>
    </div>
  )
}

function GoalFormModal({ open, initial, pool, setPool, companyKarma, onClose, onSave }) {
  const [step, setStep] = useState('type')
  const [newParam, setNewParam] = useState({ label: '', unit: 'шт' })
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name,
        unit: initial.unit,
        unit_label: initial.unit_label || '',
        kpi_type: initial.kpi_type || 'cumulative',
        thr_ultra: initial.thr_ultra,
        thr_top: initial.thr_top,
        thr_mid: initial.thr_mid,
        thr_min: initial.thr_min,
        karma_ultra: initial.karma_ultra,
        karma_top: initial.karma_top,
        karma_mid: initial.karma_mid,
        karma_min: initial.karma_min,
        description: initial.description || '',
        advice: initial.advice || '',
        num: initial.formula?.num || '',
        den: initial.formula?.den || '',
        mult: initial.formula?.mult || 100
      } : {
        name: '',
        unit: '%',
        unit_label: '',
        kpi_type: null,
        thr_ultra: 20,
        thr_top: 15,
        thr_mid: 10,
        thr_min: 5,
        karma_ultra: 10,
        karma_top: 5,
        karma_mid: 3,
        karma_min: 1,
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

    let inputs = []
    let formula = null

    if (form.kpi_type === 'ratio') {
      if (!form.num || !form.den) return
      inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean)
      formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 }
    }

    const nums = {}
    THRESH_ORDER.forEach(t => nums[t.k] = Number(form[t.k]) || 0)
    ;['karma_ultra', 'karma_top', 'karma_mid', 'karma_min'].forEach(k => nums[k] = Number(form[k]) || 0)

    onSave({
      name: form.name,
      unit: form.unit,
      unit_label: form.unit_label || null,
      kpi_type: form.kpi_type,
      description: form.description || '',
      advice: form.advice || '',
      mode: form.kpi_type === 'ratio' ? 'formula' : 'direct',
      ...nums,
      ...AUTO_ENERGY,
      inputs,
      formula
    }, initial?.id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(980px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <ModalClose onClick={onClose} />

        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
          Баланс компании: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм. · Энергия авто (5/10/15/20)
        </div>

        {step === 'type' ? (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff' }}>Выберите тип расчёта</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TYPE_META.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setForm(f => ({ ...f, kpi_type: t.key })); setStep('form') }}
                  style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.background = 'rgba(255,215,0,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <span style={{ color: '#FFD700', fontWeight: 600, fontSize: 13 }}>{t.label}</span>
                  <span style={{ color: '#999', fontSize: 12, lineHeight: 1.4 }}>{t.hint} <span style={{ color: '#666' }}>Примеры: {t.ex}</span></span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff' }}>
              {initial ? 'Редактировать цель' : 'Новая цель'} · {TYPE_LABELS[form.kpi_type]}
            </h3>

            {isInverse && (
              <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'rgba(160,233,255,0.07)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff', fontSize: 12 }}>
                Меньше — лучше. Визуально уровень «Ультра» всегда первый, но значение для него должно быть лучшим, то есть меньшим.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Название (до 24)</label>
                <input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Единица</label>
                <select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="%">%</option>
                  <option value="шт">шт</option>
                  <option value="руб">руб</option>
                  <option value="мин">мин</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Тип</label>
                <button onClick={() => setStep('type')} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11, width: '100%' }}>Сменить</button>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Подпись значения</label>
                <input className="input-field" style={{ width: '100%' }} placeholder="например: звонков, встреч, рублей" value={form.unit_label || ''} onChange={e => setForm({ ...form, unit_label: e.target.value })} />
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

              {THRESH_ORDER.map(t => (
                <div key={t.k}>
                  <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                    {t.key === 'ultra' ? <span className="mx-ultra">Ультра</span> : <span style={{ color: BAND_COLORS[t.key] }}>{t.label}</span>}
                  </label>
                  <input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={form[t.k]} onChange={e => setForm({ ...form, [t.k]: e.target.value })} />
                </div>
              ))}

              {[
                { k: 'karma_ultra', b: 'ultra' },
                { k: 'karma_top', b: 'top' },
                { k: 'karma_mid', b: 'mid' },
                { k: 'karma_min', b: 'min' }
              ].map(x => (
                <div key={x.k}>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                    Кармики · {x.b === 'ultra' ? <span className="mx-ultra">Ультра</span> : BAND_LABELS[x.b]}
                  </label>
                  <input type="number" className="input-field" style={{ width: '100%' }} value={form[x.k]} onChange={e => setForm({ ...form, [x.k]: e.target.value })} />
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

  useEffect(() => {
    if (metric) load(metric.id)
  }, [metric])

  const load = async mid => {
    const h = await auth()
    const r = await fetch(`/api/company-admin/kpi/trainings?metricId=${mid}`, { headers: h })
    if (r.ok) setTrainings(await r.json())
  }

  const add = async () => {
    if (!tForm.title.trim()) {
      showError('Укажите название')
      return
    }

    let url = tForm.url

    if (tForm.type === 'video' && file) {
      setUploading(true)
      const path = `trainings/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('trainings').upload(path, file)
      setUploading(false)

      if (error) {
        showError('Ошибка загрузки видео')
        return
      }

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
    } else {
      showError('Ошибка создания тренинга')
    }
  }

  if (!metric) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(880px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <ModalClose onClick={onClose} />

        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff', paddingRight: 40 }}>
          Материалы: {metric.name}
        </h3>

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
              <div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, #FFD700, #4ade80)', borderRadius: 3, animation: 'mxUpMove 1.1s ease-in-out infinite' }} />
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

      <style jsx>{`
        @keyframes mxUpMove {
          0% { margin-left: -40%; }
          100% { margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}

export default withAuth(MasteryAdmin, { adminOnly: true })
