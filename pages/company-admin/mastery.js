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
// Порядок уровней: всегда Ультра сверху, вниз к уменьшению
const THRESH_ORDER = [
  { b: 'ultra', label: 'Ультра' },
  { b: 'top', label: 'Топ' },
  { b: 'mid', label: 'Средн' },
  { b: 'min', label: 'Мин' },
]
const iconBtn = { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', transition: 'all .25s', padding: 0 }

const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3Z" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.5 6.5l3 3" stroke="#a0e9ff" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
    const headers = { ...h, 'Content-Type': 'application/json' }
    const r = id
      ? await fetch('/api/company-admin/kpi/metrics', { method: 'PUT', headers, body: JSON.stringify({ id, ...payload }) })
      : await fetch('/api/company-admin/kpi/metrics', { method: 'POST', headers, body: JSON.stringify(payload) })
    const d = await r.json().catch(() => ({}))
    if (r.ok) { showSuccess(id ? 'Цель обновлена' : 'Цель создана'); setCreateOpen(false); setEditMetric(null); load() }
    else showError('Ошибка сохранения: ' + (d.error || 'неизвестная ошибка'))
  }

  const doDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/metrics', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
    setDeleting(false)
    if (r.ok) { showSuccess('Цель удалена'); setDeleteTarget(null); load() }
    else { const d = await r.json().catch(() => ({})); showError('Не удалось удалить: ' + (d.error || '')) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px', background: 'transparent' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Баланс: <b style={{ color: '#FFD700' }}>{companyKarma}</b> карм.</span>
            <button onClick={() => setCreateOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Создать цель</button>
          </div>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
          {metrics.length === 0 && <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(15,20,35,0.6)', borderRadius: 20 }}>Целей пока нет — создайте первую</div>}
          {metrics.map(m => (
            <div key={m.id} style={{ position: 'relative', background: 'rgba(15,20,35,0.6)', backdropFilter: 'blur(14px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color .25s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              {/* Кнопки прямо в углу карточки, рядом с контентом */}
              <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
                <button onClick={() => setEditMetric(m)} title="Редактировать" style={iconBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(160,233,255,0.5)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(160,233,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <PencilIcon />
                </button>
                <button onClick={() => setDeleteTarget(m)} title="Удалить" style={iconBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(248,113,113,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <TrashIcon />
                </button>
              </div>

              <div style={{ paddingRight: 76 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, lineHeight: 1.35, wordBreak: 'break-word' }}>{m.name}</div>
                <div style={{ color: '#c084fc', fontSize: 12, marginTop: 4 }}>{TYPE_LABELS[m.kpi_type || 'cumulative']}</div>
              </div>

              {/* Пороги: Ультра сверху, вниз к уменьшению */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {THRESH_ORDER.map(t => (
                  <div key={t.b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: BAND_COLORS[t.b], boxShadow: `0 0 8px ${BAND_COLORS[t.b]}`, flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, width: 56, flexShrink: 0 }}>{t.label}</span>
                    <span style={{ color: BAND_COLORS[t.b], fontSize: 14, fontWeight: 600 }}>{m['thr_' + t.b]}{m.unit}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setMaterialsMetric(m)} style={{ marginTop: 16, background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', letterSpacing: 0.3, transition: 'color .2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFD700'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
                связанные тесты и тренинги →
              </button>
            </div>
          ))}
        </div>
      </div>

      <GoalFormModal open={createOpen || !!editMetric} initial={editMetric} pool={pool} setPool={setPool} companyKarma={companyKarma} onClose={() => { setCreateOpen(false); setEditMetric(null) }} onSave={saveMetric} />
      <MaterialsModal metric={materialsMetric} onClose={() => setMaterialsMetric(null)} />

      {/* Подтверждение удаления */}
      <PremiumModal isOpen={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Удалить цель?" showCloseButton={false}>
        <p style={{ marginBottom: 20 }}>Вы действительно хотите удалить «{deleteTarget?.name}»? Это действие нельзя отменить.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
          <button onClick={doDelete} disabled={deleting} style={{ flex: 1, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>{deleting ? 'Удаляем...' : 'Удалить'}</button>
        </div>
      </PremiumModal>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(980px, 95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 28, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
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
              {THRESH_ORDER.map(t => (
                <div key={t.b}><label style={{ fontSize: 11, color: BAND_COLORS[t.b], display: 'block', marginBottom: 4 }}>{t.label}</label><input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={form['thr_' + t.b]} onChange={e => setForm({ ...form, ['thr_' + t.b]: e.target.value })} /></div>
              ))}
              {THRESH_ORDER.map(t => (
                <div key={'k' + t.b}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Кармики · {BAND_LABELS[t.b]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form['karma_' + t.b]} onChange={e => setForm({ ...form, ['karma_' + t.b]: e.target.value })} /></div>
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
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
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
