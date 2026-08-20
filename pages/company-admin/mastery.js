import { useEffect, useMemo, useState } from 'react'
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
  { key: 'average', label: 'Среднее за период', hint: 'Средняя арифметика за день, неделю или месяц.', ex: 'CSI, средний чек, время обработки', color: '#FFD700' },
  { key: 'cumulative', label: 'Накопительное', hint: 'Общая сумма за период.', ex: 'Звонки, продажи, задачи', color: '#a0e9ff' },
  { key: 'plan', label: 'Процент выполнения плана', hint: 'Факт ÷ план × 100%.', ex: 'План продаж, SLA', color: '#4ade80' },
  { key: 'ratio', label: 'Доля / конверсия', hint: 'Успешные ÷ всего × 100, из двух параметров.', ex: 'Конверсия лид → встреча', color: '#c084fc' },
  { key: 'inverse', label: 'Инверсия (меньше — лучше)', hint: 'Ниже значение — выше уровень.', ex: 'SLA лида, время, жалобы', color: '#ffb3c6' },
  { key: 'binary', label: 'Бинарный (да/нет в %)', hint: 'Доля выполненных условий.', ex: 'Скрипт, подтверждение', color: '#FFD700' },
  { key: 'min_period', label: 'Накопит. с минимумом в днях', hint: 'Сумма, если минимум достигается каждый день.', ex: 'Стабильность, посещаемость', color: '#a0e9ff' },
  { key: 'dynamics', label: 'Динамика (прирост)', hint: 'Изменение к прошлому периоду, %.', ex: 'Рост продаж', color: '#4ade80' },
  { key: 'rating', label: 'Рейтинг в команде', hint: 'Процентиль среди коллег.', ex: 'Топ-10 по продажам', color: '#c084fc' },
  { key: 'weighted', label: 'Взвешенный индекс', hint: 'Комплексный KPI с весами.', ex: '0.5×продажи + 0.3×CSI', color: '#ffb3c6' }
]

const THRESH_ORDER = [
  { b: 'ultra', k: 'thr_ultra', label: 'Ультра' },
  { b: 'top', k: 'thr_top', label: 'Топ' },
  { b: 'mid', k: 'thr_mid', label: 'Средн' },
  { b: 'min', k: 'thr_min', label: 'Мин' }
]

const KARMA_ORDER = [
  { b: 'ultra', k: 'karma_ultra' },
  { b: 'top', k: 'karma_top' },
  { b: 'mid', k: 'karma_mid' },
  { b: 'min', k: 'karma_min' }
]

const pageBg = {
  minHeight: '100vh',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  padding: '40px 32px',
  position: 'relative',
  background: 'radial-gradient(circle at 15% 15%, rgba(160,233,255,0.08), transparent 32%), radial-gradient(circle at 85% 20%, rgba(192,132,252,0.08), transparent 35%), radial-gradient(circle at 50% 100%, rgba(255,215,0,0.07), transparent 55%), #000'
}

const unitWord = m => {
  if (!m) return ''
  if (m.unit && m.unit !== 'шт') return ` ${m.unit}`
  const n = (m.name || '').toLowerCase()
  if (n.includes('звон')) return ' звонков'
  if (n.includes('встреч')) return ' встреч'
  if (n.includes('письм')) return ' писем'
  if (n.includes('задач')) return ' задач'
  if (n.includes('коммент')) return ' комментариев'
  if (n.includes('чат')) return ' чатов'
  return ''
}

const fmtVal = (m, v) => {
  if (v == null || v === '') return '—'
  return `${v}${unitWord(m)}`
}

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 6.5l3 3" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#f87171" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 4" className="mx-ring" />
    <path d="M9 9l6 6M15 9l-6 6" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const stars = useMemo(() => {
    const colors = ['#ffffff', '#ffe0d0', '#d0e0ff', '#ffddaa', '#ffe4c4']
    return Array.from({ length: 110 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      op: Math.random() * 0.45 + 0.2,
      dur: Math.random() * 14 + 8,
      delay: Math.random() * 10
    }))
  }, [])

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
    if (prof?.company_id) {
      const { data: acc } = await supabase.from('company_karma_accounts').select('balance').eq('company_id', prof.company_id).maybeSingle()
      setCompanyKarma(acc?.balance || 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveMetric = async (payload, id) => {
    const h = await auth()
    const r = id
      ? await fetch('/api/company-admin/kpi/metrics', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...payload }) })
      : await fetch('/api/company-admin/kpi/metrics', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json().catch(() => ({}))
    if (r.ok) {
      showSuccess(id ? 'Цель обновлена' : 'Цель создана')
      setCreateOpen(false)
      setEditMetric(null)
      load()
    } else {
      showError('Ошибка сохранения: ' + (d.error || 'неизвестная ошибка'))
    }
  }

  const doDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/metrics', {
      method: 'DELETE',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.id })
    })
    setDeleting(false)
    if (r.ok) {
      showSuccess('Цель удалена')
      setDeleteTarget(null)
      load()
    } else {
      const d = await r.json().catch(() => ({}))
      showError('Не удалось удалить: ' + (d.error || ''))
    }
  }

  if (loading) {
    return (
      <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={72} />
      </div>
    )
  }

  return (
    <div style={pageBg}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {stars.map((s, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: s.left + '%',
            top: s.top + '%',
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: s.color,
            boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
            opacity: s.op,
            animation: `mxTwinkle ${s.dur}s ease-in-out infinite`,
            animationDelay: s.delay + 's'
          }} />
        ))}
      </div>

      <div style={{ maxWidth: 1600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <BackArrow href="/company-admin" title="Управление целями" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>
              Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.
            </span>
            <button onClick={() => setCreateOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Создать цель
            </button>
          </div>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '36px 56px' }}>
          {metrics.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              Целей пока нет — создайте первую
            </div>
          )}

          {metrics.map(m => (
            <div key={m.id} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                    color: '#fff',
                    textShadow: '0 0 18px rgba(255,255,255,0.22)'
                  }}>
                    {m.name}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, color: '#c084fc', textShadow: '0 0 10px rgba(192,132,252,0.45)' }}>
                    {TYPE_LABELS[m.kpi_type || 'cumulative']}
                  </div>

                  {m.kpi_type === 'inverse' && (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#a0e9ff' }}>
                      меньше значение = выше уровень
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 2 }}>
                  <button className="mx-icon mx-edit" onClick={() => setEditMetric(m)} title="Редактировать">
                    <PencilIcon />
                  </button>
                  <button className="mx-icon mx-del" onClick={() => setDeleteTarget(m)} title="Удалить">
                    <DeleteIcon />
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 18, position: 'relative', paddingLeft: 22 }}>
                <div style={{
                  position: 'absolute',
                  left: 4,
                  top: 6,
                  bottom: 6,
                  width: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(180deg, #c084fc, #4ade80, #FFD700, #f97316)',
                  opacity: 0.35
                }} />

                {THRESH_ORDER.map(t => (
                  <div key={t.b} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: BAND_COLORS[t.b],
                      boxShadow: `0 0 10px ${BAND_COLORS[t.b]}`,
                      marginLeft: -22,
                      flexShrink: 0
                    }} />

                    {t.b === 'ultra'
                      ? <span className="mx-ultra" style={{ width: 86, fontSize: 13 }}>Ультра</span>
                      : <span style={{ width: 86, fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>{t.label}</span>}

                    <span style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: BAND_COLORS[t.b],
                      textShadow: `0 0 14px ${BAND_COLORS[t.b]}55`
                    }}>
                      {fmtVal(m, m[t.k])}
                    </span>
                  </div>
                ))}
              </div>

              <button className="mx-related" onClick={() => setMaterialsMetric(m)}>
                связанные тесты и тренинги
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

      <PremiumModal isOpen={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Удалить цель?" showCloseButton={false}>
        <p style={{ marginBottom: 20 }}>
          Вы действительно хотите удалить «{deleteTarget?.name}»? Это действие нельзя отменить.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn-outline" style={{ flex: 1 }}>
            Отмена
          </button>
          <button
            onClick={doDelete}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '10px 18px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(244,67,54,0.12)',
              border: '1px solid rgba(244,67,54,0.4)',
              color: '#f87171',
              cursor: 'pointer',
              opacity: deleting ? 0.5 : 1
            }}
          >
            {deleting ? 'Удаляем...' : 'Удалить'}
          </button>
        </div>
      </PremiumModal>

      <style jsx global>{`
        @keyframes mxTwinkle {
          0%, 100% { opacity: 0.18; transform: scale(0.95); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }

        @keyframes mxSpin {
          to { transform: rotate(360deg); }
        }

        .mx-ring {
          transform-origin: 12px 12px;
          animation: mxSpin 7s linear infinite;
        }

        .mx-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.04);
          border: none;
          cursor: pointer;
          transition: all .35s cubic-bezier(.22,1,.36,1);
        }

        .mx-edit:hover {
          background: rgba(160,233,255,.12);
          box-shadow: 0 0 16px rgba(160,233,255,.35);
          transform: translateY(-1px) rotate(-8deg) scale(1.08);
        }

        .mx-del:hover {
          background: rgba(248,113,113,.12);
          box-shadow: 0 0 16px rgba(248,113,113,.35);
          transform: translateY(-1px) rotate(90deg) scale(1.08);
        }

        .mx-ultra {
          display: inline-block;
          background: linear-gradient(90deg, #c084fc, #FFD700, #ffb3c6, #a0e9ff, #c084fc);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: mxUltraShift 4s linear infinite;
          font-weight: 700;
        }

        @keyframes mxUltraShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        .mx-related {
          margin-top: 14px;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-size: 12px;
          letter-spacing: .3px;
          color: rgba(255,255,255,0.55);
          transition: color .25s;
        }

        .mx-related:hover {
          color: #a0e9ff;
          text-shadow: 0 0 12px rgba(160,233,255,.55);
        }

        .mx-related::after {
          content: '';
          display: block;
          height: 1px;
          margin-top: 4px;
          background: linear-gradient(90deg, #c084fc, #a0e9ff, #FFD700);
          background-size: 200% 100%;
          animation: mxLine 5s linear infinite;
          opacity: .35;
        }

        @keyframes mxLine {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .mx-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          cursor: pointer;
          color: #888;
          transition: transform .35s cubic-bezier(.22,1,.36,1), color .25s;
          z-index: 5;
        }

        .mx-close:hover {
          transform: rotate(90deg) scale(1.1);
          color: #f87171;
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
    KARMA_ORDER.forEach(x => nums[x.k] = Number(form[x.k]) || 0)

    onSave({
      name: form.name,
      unit: form.unit,
      kpi_type: form.kpi_type,
      description: form.description,
      advice: form.advice,
      mode: form.kpi_type === 'ratio' ? 'formula' : 'direct',
      ...nums,
      ...AUTO_ENERGY,
      inputs,
      formula
    }, initial?.id)
  }

  const lbl = { fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        width: 'min(980px, 95vw)',
        maxHeight: '88vh',
        overflowY: 'auto',
        background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))',
        border: '1px solid rgba(212,175,55,0.35)',
        borderRadius: 20,
        padding: 28,
        position: 'relative'
      }}>
        <button onClick={onClose} className="mx-close" title="Закрыть">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
          Баланс компании: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм. · Энергия авто: 5 / 10 / 15 / 20
        </div>

        {step === 'type' ? (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 18px', color: '#fff' }}>
              Выберите тип показателя
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TYPE_META.map((t, i) => {
                const intensity = Math.max(0.35, 1 - i * 0.07)
                const baseShadow = `0 0 ${Math.round(18 * intensity)}px ${t.color}${i < 2 ? '28' : '14'}`

                return (
                  <button
                    key={t.key}
                    onClick={() => { setForm(f => ({ ...f, kpi_type: t.key })); setStep('form') }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px 1fr',
                      gap: 16,
                      alignItems: 'center',
                      textAlign: 'left',
                      padding: '18px 20px',
                      borderRadius: 18,
                      cursor: 'pointer',
                      border: 'none',
                      background: `linear-gradient(135deg, ${t.color}${i < 2 ? '26' : i < 5 ? '18' : '10'}, transparent 72%)`,
                      boxShadow: baseShadow,
                      transition: 'all 0.25s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = `0 0 ${Math.round(32 * intensity)}px ${t.color}44`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = baseShadow
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${t.color}22`,
                      color: t.color,
                      fontWeight: 700,
                      fontSize: 15,
                      textShadow: `0 0 12px ${t.color}`
                    }}>
                      {i + 1}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 15, textShadow: `0 0 14px ${t.color}66` }}>
                          {t.label}
                        </span>
                        {i < 2 && (
                          <span style={{
                            fontSize: 9,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: `${t.color}22`,
                            color: t.color,
                            fontWeight: 700,
                            letterSpacing: 0.6
                          }}>
                            ПОПУЛЯРНЫЙ
                          </span>
                        )}
                      </div>

                      <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                        {t.hint}
                      </div>

                      <div style={{ color: t.color, opacity: 0.75, fontSize: 11, marginTop: 4 }}>
                        Примеры: {t.ex}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 18px', color: '#fff' }}>
              {initial ? 'Редактировать цель' : 'Новая цель'} · {TYPE_LABELS[form.kpi_type]}
            </h3>

            {isInverse && (
              <div style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 12,
                background: 'rgba(160,233,255,0.07)',
                border: '1px solid rgba(160,233,255,0.3)',
                color: '#a0e9ff',
                fontSize: 12
              }}>
                Меньше — лучше. Визуально уровни всегда идут сверху вниз: Ультра, Топ, Средн, Мин.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Название (до 24)</label>
                <input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label style={lbl}>Единица</label>
                <select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="%">%</option>
                  <option value="шт">шт</option>
                  <option value="руб">руб</option>
                  <option value="мин">мин</option>
                </select>
              </div>

              <div>
                <label style={lbl}>Тип</label>
                <button onClick={() => setStep('type')} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11, width: '100%' }}>
                  Сменить
                </button>
              </div>

              {form.kpi_type === 'ratio' && (
                <>
                  <div>
                    <label style={lbl}>Числитель</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}>
                      <option value="">—</option>
                      {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={lbl}>Знаменатель</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}>
                      <option value="">—</option>
                      {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={lbl}>Множитель</label>
                    <input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} />
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    <input className="input-field" style={{ flex: 1 }} placeholder="Новый параметр" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} />
                    <button onClick={addParam} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11 }}>+</button>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: 0.5 }}>
                ПОРОГИ ВЫПОЛНЕНИЯ
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {THRESH_ORDER.map(t => (
                  <div key={t.k}>
                    <label style={{ fontSize: 11, display: 'block', marginBottom: 6, color: BAND_COLORS[t.b], fontWeight: 600 }}>
                      {t.label}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-field"
                      style={{ width: '100%' }}
                      value={form[t.k]}
                      onChange={e => setForm({ ...form, [t.k]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: 0.5 }}>
                КАРМИКИ ЗА УРОВЕНЬ
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {KARMA_ORDER.map(x => (
                  <div key={x.k}>
                    <label style={{ fontSize: 11, display: 'block', marginBottom: 6, color: BAND_COLORS[x.b], fontWeight: 600 }}>
                      {BAND_LABELS[x.b]}
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      style={{ width: '100%' }}
                      value={form[x.k]}
                      onChange={e => setForm({ ...form, [x.k]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
              <div>
                <label style={lbl}>Описание</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div>
                <label style={lbl}>Советы</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={onClose} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={submit} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                Сохранить
              </button>
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
  const [form, setForm] = useState({ title: '', type: 'video', url: '', content: '' })
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
    if (!form.title.trim()) {
      showError('Укажите название')
      return
    }

    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/trainings', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric_id: metric.id,
        title: form.title,
        type: form.type,
        url: form.url || null,
        content: form.content || null,
        recommend_below: 'all'
      })
    })

    if (r.ok) {
      showSuccess('Тренинг добавлен')
      setForm({ title: '', type: 'video', url: '', content: '' })
      load(metric.id)
    } else {
      showError('Ошибка создания тренинга')
    }
  }

  if (!metric) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(6px)',
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        width: 'min(880px, 94vw)',
        maxHeight: '88vh',
        overflowY: 'auto',
        background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))',
        border: '1px solid rgba(212,175,55,0.35)',
        borderRadius: 20,
        padding: 28,
        position: 'relative'
      }}>
        <button onClick={onClose} className="mx-close" title="Закрыть">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff', paddingRight: 40 }}>
          Материалы: {metric.name}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {trainings.map(t => (
            <div key={t.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)'
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#fff' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  {t.type === 'video' ? 'Видео' : t.type === 'text' ? 'Текст' : t.type}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {(t.url || t.video_path) && (
                  <button onClick={() => setVideo(t)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    Смотреть
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
          <input className="input-field" placeholder="Название" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

          <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="video">Видео</option>
            <option value="text">Текст</option>
          </select>

          {form.type === 'video' && (
            <input className="input-field" style={{ gridColumn: '1 / -1' }} placeholder="URL видео" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          )}

          {form.type === 'text' && (
            <textarea className="input-field" style={{ gridColumn: '1 / -1' }} rows={3} placeholder="Текст тренинга" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <button onClick={add} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Добавить тренинг
            </button>
          </div>
        </div>
      </div>

      {video && <TrainingVideoModal training={video} onClose={() => setVideo(null)} />}
    </div>
  )
}

export default withAuth(MasteryAdmin, { adminOnly: true })
