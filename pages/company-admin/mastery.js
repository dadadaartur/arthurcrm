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
const AUTO_ENERGY = { energy_min: 5, energy_mid: 10, energy_top: 15, energy_ultra: 20 }

const TYPE_META = [
  { key: 'average', label: 'Среднее за период', hint: 'Средняя арифметика за день, неделю или месяц.', ex: 'CSI, средний чек, время обработки', color: '#FFD700' },
  { key: 'cumulative', label: 'Накопительное', hint: 'Общая сумма за период.', ex: 'Звонки, продажи, задачи', color: '#FFD700' },
  { key: 'plan', label: 'Процент выполнения плана', hint: 'Факт ÷ план × 100%.', ex: 'План продаж, SLA', color: '#a0e9ff' },
  { key: 'ratio', label: 'Доля / конверсия', hint: 'Успешные ÷ всего × 100, из двух параметров.', ex: 'Конверсия лид → встреча', color: '#a0e9ff' },
  { key: 'inverse', label: 'Инверсия (меньше — лучше)', hint: 'Ниже значение — выше уровень.', ex: 'SLA лида, время, жалобы', color: '#c084fc' },
  { key: 'binary', label: 'Бинарный (да/нет в %)', hint: 'Доля выполненных условий.', ex: 'Скрипт, подтверждение', color: '#c084fc' },
  { key: 'min_period', label: 'Накопит. с минимумом в днях', hint: 'Сумма, если минимум достигается каждый день.', ex: 'Стабильность, посещаемость', color: '#4ade80' },
  { key: 'dynamics', label: 'Динамика (прирост)', hint: 'Изменение к прошлому периоду, %.', ex: 'Рост продаж', color: '#4ade80' },
  { key: 'rating', label: 'Рейтинг в команде', hint: 'Процентиль среди коллег.', ex: 'Топ-10 по продажам', color: '#ffb3c6' },
  { key: 'weighted', label: 'Взвешенный индекс', hint: 'Комплексный KPI с весами.', ex: '0.5×продажи + 0.3×CSI', color: '#ffb3c6' },
]

const THRESH_ORDER = [
  { k: 'thr_ultra', band: 'ultra', label: 'Ультра' },
  { k: 'thr_top', band: 'top', label: 'Топ' },
  { k: 'thr_mid', band: 'mid', label: 'Средн' },
  { k: 'thr_min', band: 'min', label: 'Мин' },
]
const KARMA_ORDER = [
  { k: 'karma_ultra', band: 'ultra' },
  { k: 'karma_top', band: 'top' },
  { k: 'karma_mid', band: 'mid' },
  { k: 'karma_min', band: 'min' },
]

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 18px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const lbl = { fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }

const EditGlyph = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3Z" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 6.5l3 3" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)
const DelGlyph = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#f87171" strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="3 4" className="mx-delring" />
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
  const [confirmDelete, setConfirmDelete] = useState(null)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    if (r.ok) { const m = await r.json(); setMetrics(m); const p = {}; (m || []).forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i })); setPool(Object.values(p)) }
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

  const doDelete = async () => {
    if (!confirmDelete) return
    const h = await auth()
    await fetch('/api/company-admin/kpi/metrics', { method: 'DELETE', headers: h, body: JSON.stringify({ id: confirmDelete.id }) })
    showSuccess('Цель удалена')
    setConfirmDelete(null)
    load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px', background: 'transparent' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.</span>
            <button onClick={() => setCreateOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Создать цель</button>
          </div>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '44px 72px' }}>
          {metrics.length === 0 && <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Целей пока нет — создайте первую</div>}
          {metrics.map(m => {
            const isInverse = m.kpi_type === 'inverse'
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 19, fontWeight: 600, color: '#fff', lineHeight: 1.3, wordBreak: 'break-word', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{m.name}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#c084fc', textShadow: '0 0 12px rgba(192,132,252,0.5)', fontWeight: 500 }}>{TYPE_LABELS[m.kpi_type || 'cumulative']}</div>
                    {isInverse && <div style={{ marginTop: 4, fontSize: 11, color: '#a0e9ff' }}>меньше значение = выше уровень</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="mx-icobtn mx-edit" onClick={() => setEditMetric(m)} title="Редактировать"><EditGlyph /></button>
                    <button className="mx-icobtn mx-del" onClick={() => setConfirmDelete(m)} title="Удалить"><DelGlyph /></button>
                  </div>
                </div>

                <div style={{ position: 'relative', paddingLeft: 22 }}>
                  <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1.5, borderRadius: 2, background: 'linear-gradient(180deg, #c084fc, #4ade80, #FFD700, #f97316)', opacity: 0.4 }} />
                  {THRESH_ORDER.map(t => (
                    <div key={t.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: BAND_COLORS[t.band], boxShadow: `0 0 10px ${BAND_COLORS[t.band]}`, marginLeft: -22, flexShrink: 0 }} />
                      {t.band === 'ultra'
                        ? <span className="mx-ultra" style={{ width: 120, fontSize: 13 }}>Ультра</span>
                        : <span style={{ width: 120, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{t.label}</span>}
                      <span style={{ fontSize: 15, fontWeight: 600, color: BAND_COLORS[t.band], textShadow: `0 0 14px ${BAND_COLORS[t.band]}66` }}>{m[t.k]}{m.unit}</span>
                    </div>
                  ))}
                </div>

                <button className="mx-related" onClick={() => setMaterialsMetric(m)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 7h7M8 11h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  связанные тесты и тренинги
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <GoalFormModal open={createOpen || !!editMetric} initial={editMetric} pool={pool} setPool={setPool} companyKarma={companyKarma} onClose={() => { setCreateOpen(false); setEditMetric(null) }} onSave={saveMetric} />
      <MaterialsModal metric={materialsMetric} onClose={() => setMaterialsMetric(null)} />

      <PremiumModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Удалить цель?" showCloseButton={false}>
        <p style={{ marginBottom: 18 }}>Вы действительно хотите удалить «{confirmDelete?.name}»? Это действие нельзя отменить.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setConfirmDelete(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
          <button onClick={doDelete} style={{ flex: 1, padding: '10px 18px', borderRadius: 12, background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.5)', color: '#f87171', cursor: 'pointer', fontWeight: 600 }}>Удалить</button>
        </div>
      </PremiumModal>

      <style jsx global>{`
        .mx-icobtn { background: none; border: none; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 11px; transition: all .3s cubic-bezier(.22,1,.36,1); }
        .mx-edit:hover { background: rgba(160,233,255,.12); box-shadow: 0 0 18px rgba(160,233,255,.45); transform: translateY(-2px) rotate(-8deg); }
        .mx-del:hover { background: rgba(248,113,113,.12); box-shadow: 0 0 18px rgba(248,113,113,.45); transform: translateY(-2px) rotate(90deg); }
        .mx-delring { transform-origin: 12px 12px; animation: mxSpin 7s linear infinite; }
        @keyframes mxSpin { to { transform: rotate(360deg); } }
        .mx-ultra { display: inline-block; background: linear-gradient(90deg,#c084fc,#FFD700,#ffb3c6,#c084fc); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: mxUltraShift 4s linear infinite; font-weight: 700; }
        @keyframes mxUltraShift { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
        .mx-related { display: inline-flex; align-items: center; gap: 8px; margin-top: auto; align-self: flex-start; padding: 9px 18px; border-radius: 22px; font-size: 12px; font-weight: 600; letter-spacing: .3px; cursor: pointer; color: #fff; background: linear-gradient(135deg, rgba(192,132,252,.2), rgba(160,233,255,.14)); border: 1px solid rgba(192,132,252,.5); backdrop-filter: blur(8px); transition: all .3s; position: relative; overflow: hidden; }
        .mx-related:hover { box-shadow: 0 0 22px rgba(192,132,252,.55); transform: translateY(-2px); border-color: #c084fc; }
        .mx-related::after { content: ''; position: absolute; top: 0; left: -70%; width: 45%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.28), transparent); transform: skewX(-20deg); animation: mxSheen 3.2s ease-in-out infinite; }
        @keyframes mxSheen { 0% { left: -70%; } 60% { left: 130%; } 100% { left: 130%; } }
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
      setForm(initial ? { name: initial.name, unit: initial.unit, kpi_type: initial.kpi_type || 'cumulative', thr_min: initial.thr_min, thr_mid: initial.thr_mid, thr_top: initial.thr_top, thr_ultra: initial.thr_ultra, karma_min: initial.karma_min, karma_mid: initial.karma_mid, karma_top: initial.karma_top, karma_ultra: initial.karma_ultra, description: initial.description || '', advice: initial.advice || '', num: initial.formula?.num || '', den: initial.formula?.den || '', mult: initial.formula?.mult || 100 }
        : { name: '', unit: '%', kpi_type: null, thr_min: 5, thr_mid: 10, thr_top: 15, thr_ultra: 20, karma_min: 1, karma_mid: 3, karma_top: 5, karma_ultra: 10, description: '', advice: '', num: '', den: '', mult: 100 })
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(940px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(20,26,48,0.97), rgba(8,11,22,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 30, position: 'relative' }}>
        <button onClick={onClose} className="mx-icobtn mx-del" style={{ position: 'absolute', top: 16, right: 16, zIndex: 5 }}><DelGlyph /></button>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Баланс компании: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм. · Энергия авто (5/10/15/20)</div>

        {step === 'type' ? (
          <>
            <h3 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 4px', color: '#fff' }}>Выберите тип показателя</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 22px' }}>От самых востребованных к более редким</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TYPE_META.map((t, i) => {
                const intensity = 1 - (i / TYPE_META.length) * 0.65
                const isTop = i < 2
                const baseShadow = `0 0 ${Math.round(22 * intensity)}px ${t.color}${isTop ? '30' : '14'}`
                return (
                  <button key={t.key} onClick={() => { setForm(f => ({ ...f, kpi_type: t.key })); setStep('form') }}
                    style={{ display: 'flex', gap: 16, alignItems: 'center', textAlign: 'left', padding: '16px 18px', borderRadius: 16, cursor: 'pointer', background: `linear-gradient(135deg, ${t.color}${isTop ? '24' : '10'}, transparent 75%)`, border: `1px solid ${t.color}${isTop ? '70' : '33'}`, boxShadow: baseShadow, transition: 'all .25s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 ${Math.round(30 * intensity)}px ${t.color}55` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = baseShadow }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: t.color, border: `1.5px solid ${t.color}88`, background: `${t.color}15`, textShadow: `0 0 10px ${t.color}` }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, textShadow: `0 0 14px ${t.color}88` }}>{t.label}</span>
                        {isTop && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: `${t.color}25`, color: t.color, border: `1px solid ${t.color}55`, letterSpacing: 0.5, fontWeight: 700 }}>ПОПУЛЯРНЫЙ</span>}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 }}>{t.hint}</div>
                      <div style={{ color: t.color, fontSize: 11, marginTop: 3, opacity: 0.9 }}>Примеры: {t.ex}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 18px', color: '#fff' }}>{initial ? 'Редактировать цель' : 'Новая цель'} · <span style={{ color: '#a0e9ff' }}>{TYPE_LABELS[form.kpi_type]}</span></h3>
            {isInverse && <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: 'rgba(160,233,255,0.07)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff', fontSize: 12 }}>Меньше — лучше. Заполняйте от лучшего (малого) к допустимому (большому).</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Название (до 24)</label><input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label style={lbl}>Единица</label><select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option></select></div>
              <div><label style={lbl}>Тип</label><button onClick={() => setStep('type')} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11, width: '100%' }}>Сменить</button></div>
              {form.kpi_type === 'ratio' && (<>
                <div><label style={lbl}>Числитель</label><select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={lbl}>Знаменатель</label><select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={lbl}>Множитель</label><input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}><input className="input-field" style={{ flex: 1 }} placeholder="Новый параметр" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} /><button onClick={addParam} style={{ ...ghostBtn, padding: '8px 12px', fontSize: 11 }}>+</button></div>
              </>)}
            </div>

            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: 0.5 }}>ПОРОГИ ВЫПОЛНЕНИЯ</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {THRESH_ORDER.map(t => (
                  <div key={t.k}><label style={{ fontSize: 11, display: 'block', marginBottom: 6, color: BAND_COLORS[t.band], fontWeight: 600 }}>{t.label}</label><input type="number" step="0.1" className="input-field" style={{ width: '100%', borderColor: `${BAND_COLORS[t.band]}44` }} value={form[t.k]} onChange={e => setForm({ ...form, [t.k]: e.target.value })} /></div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: 0.5 }}>КАРМИКИ ЗА УРОВЕНЬ</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {KARMA_ORDER.map(x => (
                  <div key={x.k}><label style={{ fontSize: 11, display: 'block', marginBottom: 6, color: BAND_COLORS[x.band], fontWeight: 600 }}>{BAND_LABELS[x.band]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form[x.k]} onChange={e => setForm({ ...form, [x.k]: e.target.value })} /></div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
              <div><label style={lbl}>Описание</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><label style={lbl}>Советы</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
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
      <div style={{ width: 'min(880px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(20,26,48,0.97), rgba(8,11,22,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <button onClick={onClose} className="mx-icobtn mx-del" style={{ position: 'absolute', top: 14, right: 14, zIndex: 5 }}><DelGlyph /></button>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#fff', paddingRight: 40 }}>Материалы: {metric.name}</h3>
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
          {uploading && <div style={{ gridColumn: '1 / -1', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, #FFD700, #4ade80)', borderRadius: 3, animation: 'mxUp 1.1s ease-in-out infinite' }} /></div>}
          <div style={{ gridColumn: '1 / -1' }}><button onClick={add} disabled={uploading} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12, opacity: uploading ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{uploading ? 'Загрузка видео…' : 'Добавить тренинг'}</button></div>
        </div>
      </div>
      {video && <TrainingVideoModal training={video} onClose={() => setVideo(null)} />}
      <style jsx>{`@keyframes mxUp { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
    </div>
  )
}

export default withAuth(MasteryAdmin, { adminOnly: true })
