import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import DateRangePicker from '../../components/DateRangePicker'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { BAND_LABELS, BAND_COLORS, TYPE_LABELS } from '../../lib/kpi'

const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_').replace(/^_+|_+$/g, '')
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '10px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
// Премиум-сегмент (плавный, не системный)
const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button onClick={onClick} style={{
    padding: '8px 18px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
    background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`,
    color: active ? color : '#999', transition: 'all 0.25s ease', backdropFilter: 'blur(8px)',
    boxShadow: active ? `0 0 14px ${color}22` : 'none'
  }}
  onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#ddd' } }}
  onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#999' } }}>
    {children}
  </button>
)

function MasteryAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [pool, setPool] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [trainings, setTrainings] = useState({})
  const [tForm, setTForm] = useState({ title: '', type: 'video', url: '', content: '', recommend_below: 'all' })
  const [form, setForm] = useState({ name: '', unit: '%', kpi_type: 'cumulative', thr_min: 5, thr_mid: 10, thr_top: 15, thr_ultra: 20, energy_min: 10, energy_mid: 20, energy_top: 30, energy_ultra: 50, karma_min: 1, karma_mid: 3, karma_top: 5, karma_ultra: 10, description: '', advice: '', num: '', den: '', mult: 100 })
  const [newParam, setNewParam] = useState({ label: '', unit: 'шт' })
  const [fillMode, setFillMode] = useState('day')
  const [date, setDate] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [values, setValues] = useState({})
  const [manualOpen, setManualOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importTab, setImportTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [gUrl, setGUrl] = useState('')
  const [editMetric, setEditMetric] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    const h = await auth()
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    if (r.ok) {
      const m = await r.json()
      setMetrics(m)
      const p = {}
      ;(m || []).forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i }))
      setPool(Object.values(p))
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const { data: emps } = await supabase.from('profiles').select('user_id, display_name, email, first_name, last_name').eq('company_id', prof.company_id).is('deleted_at', null).eq('is_company_admin', false)
    setEmployees(emps || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const isFormula = form.kpi_type === 'ratio'
  const isInverse = form.kpi_type === 'inverse'
  const addParam = () => {
    if (!newParam.label.trim()) return
    const key = slug(newParam.label)
    if (!pool.find(p => p.key === key)) setPool(p => [...p, { key, label: newParam.label.trim(), unit: newParam.unit || 'шт' }])
    setNewParam({ label: '', unit: 'шт' })
  }

  const createMetric = async (e) => {
    e.preventDefault()
    let inputs = [], formula = null
    if (isFormula) {
      if (!form.num || !form.den) { showError('Выберите числитель и знаменатель'); return }
      inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean)
      formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 }
    }
    const nums = {}
    ;['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'energy_min', 'energy_mid', 'energy_top', 'energy_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => nums[k] = Number(form[k]) || 0)
    const h = await auth()
    const res = await fetch('/api/company-admin/kpi/metrics', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, mode: isFormula ? 'formula' : 'direct', ...nums, inputs, formula }) })
    if (res.ok) { showSuccess('Показатель создан'); setForm({ ...form, name: '', description: '', advice: '' }) }
    else showError('Ошибка создания')
    load()
  }

  const openEdit = (m) => {
    setEditMetric(m)
    setEditForm({ name: m.name, unit: m.unit, kpi_type: m.kpi_type || 'cumulative', thr_min: m.thr_min, thr_mid: m.thr_mid, thr_top: m.thr_top, thr_ultra: m.thr_ultra, energy_min: m.energy_min, energy_mid: m.energy_mid, energy_top: m.energy_top, energy_ultra: m.energy_ultra, karma_min: m.karma_min, karma_mid: m.karma_mid, karma_top: m.karma_top, karma_ultra: m.karma_ultra, description: m.description || '', advice: m.advice || '', num: m.formula?.num || '', den: m.formula?.den || '', mult: m.formula?.mult || 100 })
  }
  const saveEdit = async () => {
    if (!editMetric || !editForm) return
    const nums = {}
    ;['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'energy_min', 'energy_mid', 'energy_top', 'energy_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra', 'mult'].forEach(k => nums[k] = Number(editForm[k]) || 0)
    let inputs = editMetric.inputs || [], formula = editMetric.formula || null
    if (editForm.kpi_type === 'ratio' && editForm.num && editForm.den) {
      inputs = [pool.find(p => p.key === editForm.num), pool.find(p => p.key === editForm.den)].filter(Boolean)
      formula = { num: editForm.num, den: editForm.den, mult: nums.mult }
    }
    const h = await auth()
    const res = await fetch('/api/company-admin/kpi/metrics', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editMetric.id, ...editForm, mode: editForm.kpi_type === 'ratio' ? 'formula' : 'direct', ...nums, inputs, formula }) })
    if (res.ok) { showSuccess('Показатель обновлён'); setEditMetric(null); setEditForm(null) } else showError('Ошибка сохранения')
    load()
  }
  const delMetric = async id => { const h = await auth(); await fetch('/api/company-admin/kpi/metrics', { method: 'DELETE', headers: h, body: JSON.stringify({ id }) }); showSuccess('Показатель удалён'); load() }

  const loadTrainings = async mid => { const h = await auth(); const r = await fetch(`/api/company-admin/kpi/trainings?metricId=${mid}`, { headers: h }); if (r.ok) { const d = await r.json(); setTrainings(t => ({ ...t, [mid]: d })) } }
  const addTraining = async mid => {
    const h = await auth()
    await fetch('/api/company-admin/kpi/trainings', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ metric_id: mid, title: tForm.title, type: tForm.type, url: tForm.url || null, content: tForm.content || null, recommend_below: tForm.recommend_below }) })
    showSuccess('Тренинг добавлен')
    // Уведомляем сотрудников, которым рекомендован материал
    const targets = tForm.recommend_below === 'all' ? employees : employees
    if (targets.length) {
      await supabase.from('notifications').insert(targets.map(e => ({ user_id: e.user_id, message: `Вам рекомендован материал «${tForm.title}» — откройте раздел «Мои цели»`, link: '/goals' })))
    }
    setTForm({ title: '', type: 'video', url: '', content: '', recommend_below: 'all' })
    loadTrainings(mid)
  }
  const delTraining = async (id, mid) => { const h = await auth(); await fetch('/api/company-admin/kpi/trainings', { method: 'DELETE', headers: h, body: JSON.stringify({ id }) }); showSuccess('Тренинг удалён'); loadTrainings(mid) }
  const uploadVideo = async (file) => {
    if (!file) return
    const path = `trainings/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('task-proofs').upload(path, file)
    if (error) { showError('Ошибка загрузки'); return }
    const { data } = supabase.storage.from('task-proofs').getPublicUrl(path)
    setTForm(t => ({ ...t, url: data.publicUrl }))
    showSuccess('Видео загружено')
  }

  // ===== Заполнение показателей =====
  const sharedCols = pool
  const directCols = metrics.filter(m => !m.formula).map(m => ({ key: 'm' + m.id, label: m.name, unit: m.unit, inverse: m.kpi_type === 'inverse' }))
  const cols = [...sharedCols.map(c => ({ ...c, inverse: false })), ...directCols]
  const formulaMetrics = metrics.filter(m => m.formula)
  const computeValue = (m, uid) => {
    if (m.formula) {
      const den = Number(values[uid]?.[m.formula.den]) || 0
      const num = Number(values[uid]?.[m.formula.num]) || 0
      return den > 0 ? Math.round((num / den) * (m.formula.mult || 100) * 10) / 10 : null
    }
    const v = values[uid]?.['m' + m.id]
    return v === '' || v == null ? null : Number(v)
  }
  const datesInRange = () => {
    if (!range.from || !range.to) return []
    const out = []; const d = new Date(range.from + 'T00:00:00'); const end = new Date(range.to + 'T00:00:00')
    while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
    return out
  }
  const saveFill = async () => {
    const dates = fillMode === 'day' ? (date ? [date] : []) : datesInRange()
    if (!dates.length) { showError(fillMode === 'day' ? 'Выберите дату' : 'Выберите период'); return }
    const h = await auth()
    const entries = []
    employees.forEach(emp => metrics.forEach(m => {
      const raw = computeValue(m, emp.user_id)
      if (raw == null) return
      const perDay = dates.length > 1 ? Math.round((raw / dates.length) * 10) / 10 : raw
      dates.forEach(d => entries.push({ metricId: m.id, userId: emp.user_id, value: perDay, date: d }))
    }))
    if (!entries.length) { showError('Нет заполненных значений'); return }
    const res = await fetch('/api/company-admin/kpi/entries-bulk', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ entries }) })
    if (res.ok) showSuccess(`Сохранено: ${entries.length} записей`)
    else showError('Ошибка сохранения')
  }

  const applyRows = (rows) => {
    if (!rows?.length) return 'Пустые данные'
    const header = rows[0].map(h => (h || '').trim())
    const emailIdx = header.findIndex(h => /email|почта/i.test(h))
    if (emailIdx < 0) return 'Не найдена колонка «Email»'
    const labelToKey = {}; cols.forEach(c => labelToKey[c.label.toLowerCase()] = c.key)
    const colMap = header.map((h, i) => ({ i, key: labelToKey[h.toLowerCase()] })).filter(x => x.key)
    let applied = 0
    const next = { ...values }
    rows.slice(1).forEach(r => {
      const email = (r[emailIdx] || '').trim().toLowerCase()
      const emp = employees.find(e => (e.email || '').toLowerCase() === email)
      if (!emp) return
      next[emp.user_id] = { ...(next[emp.user_id] || {}) }
      colMap.forEach(({ i, key }) => { const v = parseFloat(String(r[i]).replace(',', '.')); if (!isNaN(v)) { next[emp.user_id][key] = v; applied++ } })
    })
    setValues(next)
    return `Применено значений: ${applied}`
  }
  const parseText = (text) => {
    const delim = text.includes('\t') ? '\t' : (text.split(';').length > text.split(',').length ? ';' : ',')
    return text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(delim))
  }
  const fetchGoogle = async () => {
    const id = (gUrl.match(/\/d\/([\w-]+)/) || [])[1]
    if (!id) { showError('Неверная ссылка на таблицу'); return }
    try {
      const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`)
      const text = await r.text()
      const msg = applyRows(parseText(text))
      if (msg.startsWith('Применено')) { showSuccess(msg); setImportOpen(false) } else showError(msg)
    } catch (e) { showError('Не удалось скачать таблицу') }
  }
  const copyTemplate = async () => {
    const header = ['Email', ...cols.map(c => c.label)]
    const example = ['ivanov@company.ru', ...cols.map(() => '0')]
    try { await navigator.clipboard.writeText([header.join('\t'), example.join('\t')].join('\n')); showSuccess('Шаблон скопирован — выполните вставку в Google или Excel таблицу комбинацией Ctrl+V') } catch (e) { showError('Не удалось скопировать') }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
  const gridTemplate = `200px repeat(${cols.length}, minmax(72px, 96px)) repeat(${formulaMetrics.length}, minmax(80px, 100px))`

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями и мастерством" extra={
          <Link href="/company-admin/tests" style={{ marginLeft: 'auto', ...ghostBtn, textDecoration: 'none', display: 'inline-block' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Тесты и срезы</Link>
        } />

        {/* ===== Новый показатель ===== */}
        <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 18 }}>Новый показатель</h3>
          <form onSubmit={createMetric}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название (до 24 символов)</label>
                <input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Конверсия лид → встреча" required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Единица</label>
                <select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option></select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Тип расчёта</label>
                <select className="input-field" style={{ width: '100%' }} value={form.kpi_type} onChange={e => setForm({ ...form, kpi_type: e.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>

              {isInverse && (
                <div style={{ gridColumn: 'span 4', padding: 12, borderRadius: 12, background: 'rgba(160,233,255,0.07)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff', fontSize: 12 }}>
                  Инверсия: меньше — лучше. Пороги заполняйте от лучшего (минимального) значения: ультра = самое низкое.
                </div>
              )}

              {isFormula && (
                <div style={{ gridColumn: 'span 4', padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Числитель (успешные)</label>
                      <select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Знаменатель (всего)</label>
                      <select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Множитель</label>
                      <input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                    <input className="input-field" style={{ flex: 1 }} placeholder="Новый параметр (Кол-во звонков)" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} />
                    <input className="input-field" style={{ width: 70 }} placeholder="шт" value={newParam.unit} onChange={e => setNewParam({ ...newParam, unit: e.target.value })} />
                    <button type="button" onClick={addParam} style={{ ...ghostBtn, padding: '9px 16px', fontSize: 12, whiteSpace: 'nowrap' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить</button>
                  </div>
                </div>
              )}

              {['thr_min', 'thr_mid', 'thr_top', 'thr_ultra'].map((k, i) => (
                <div key={k}><label style={{ fontSize: 11, color: BAND_COLORS[['min', 'mid', 'top', 'ultra'][i]], display: 'block', marginBottom: 6 }}>{BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              {['energy_min', 'energy_mid', 'energy_top', 'energy_ultra'].map((k, i) => (
                <div key={k}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Энергия · {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map((k, i) => (
                <div key={k}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Кармики · {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Советы</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
              <div style={{ gridColumn: 'span 4' }}><button type="submit" style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить показатель</button></div>
            </div>
          </form>
        </div>

        {/* ===== Заполнить показатели ===== */}
        <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Заполнить показатели</h3>
            <div style={{ display: 'flex', gap: 8 }}><Seg active={fillMode === 'day'} onClick={() => setFillMode('day')}>За день</Seg><Seg active={fillMode === 'period'} onClick={() => setFillMode('period')}>За период</Seg></div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              {fillMode === 'day' ? <div style={{ width: 190 }}><DatePicker value={date} onChange={setDate} placeholder="Дата отчёта" /></div> : <DateRangePicker from={range.from} to={range.to} onChange={setRange} />}
              <button onClick={() => setImportOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(160,233,255,0.4)', color: '#a0e9ff' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Импорт из таблицы</button>
              <button onClick={() => setManualOpen(o => !o)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{manualOpen ? 'Скрыть ручной ввод' : 'Заполнить вручную'}</button>
              <button onClick={saveFill} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </div>

          {manualOpen && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 200 + cols.length * 84 + formulaMetrics.length * 90 }}>
                {/* Шапка с названиями над ячейками */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'center' }}>Сотрудник</div>
                  {cols.map(c => (
                    <div key={c.key} style={{ textAlign: 'center', minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: c.inverse ? '#a0e9ff' : '#a0e9ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</div>
                      <div style={{ fontSize: 9, color: '#666' }}>{c.inverse ? 'меньше = лучше' : (c.unit || '')}</div>
                    </div>
                  ))}
                  {formulaMetrics.map(m => (
                    <div key={m.id} style={{ textAlign: 'center', minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#FFD700', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name}</div>
                      <div style={{ fontSize: 9, color: '#666' }}>авто</div>
                    </div>
                  ))}
                </div>
                {employees.map(emp => (
                  <div key={emp.user_id} style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={empName(emp)}>{empName(emp)}</div>
                    {cols.map(c => (
                      <input key={c.key} type="number" step="0.1" value={values[emp.user_id]?.[c.key] ?? ''}
                        onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))}
                        className="input-field" style={{ width: '100%', textAlign: 'center', padding: '8px 4px' }} />
                    ))}
                    {formulaMetrics.map(m => {
                      const v = computeValue(m, emp.user_id)
                      return <div key={m.id} style={{ fontSize: 13, color: v != null ? '#FFD700' : '#555', fontWeight: 600, textAlign: 'center' }}>{v != null ? v + m.unit : '—'}</div>
                    })}
                  </div>
                ))}
                {employees.length === 0 && <p style={{ color: '#777', fontSize: 13 }}>Нет сотрудников</p>}
              </div>
            </div>
          )}
        </div>

        {/* ===== Показатели ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
          {metrics.map(m => (
            <div key={m.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.25s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name}</h3>
                  <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0', lineHeight: 1.5 }}>
                    {TYPE_LABELS[m.kpi_type || 'cumulative']} · мин {m.thr_min} / средн {m.thr_mid} / топ {m.thr_top} / ультра {m.thr_ultra}{m.unit}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button onClick={() => { setExpanded(expanded === m.id ? null : m.id); loadTrainings(m.id) }} style={{ ...ghostBtn, padding: '6px 14px', fontSize: 11 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{expanded === m.id ? 'Свернуть' : 'Материалы'}</button>
                <button onClick={() => openEdit(m)} style={{ ...ghostBtn, padding: '6px 14px', fontSize: 11, borderColor: 'rgba(160,233,255,0.4)', color: '#a0e9ff' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Редактировать</button>
                <button onClick={() => delMetric(m.id)} style={{ ...ghostBtn, padding: '6px 14px', fontSize: 11, borderColor: 'rgba(244,67,54,0.3)', color: '#f87171' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Удалить</button>
              </div>
              {expanded === m.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(trainings[m.id] || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: 12, color: '#fff' }}>{t.title} <span style={{ fontSize: 10, color: '#888' }}>· {t.type === 'video' ? 'видео' : t.type === 'test' ? 'тест' : 'текст'}</span></span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={`/company-admin/tests?training=${t.id}`} style={{ fontSize: 10, color: '#c084fc', textDecoration: 'none' }}>Тест</Link>
                        <button onClick={() => delTraining(t.id, m.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>Удалить</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input className="input-field" placeholder="Название тренинга" value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} />
                    <select className="input-field" value={tForm.type} onChange={e => setTForm({ ...tForm, type: e.target.value })}><option value="video">Видео</option><option value="text">Текст</option></select>
                    {tForm.type === 'video' && (<>
                      <input className="input-field" placeholder="URL видео" value={tForm.url} onChange={e => setTForm({ ...tForm, url: e.target.value })} />
                      <label style={{ ...ghostBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>С устройства<input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => uploadVideo(e.target.files[0])} /></label>
                    </>)}
                    <select className="input-field" value={tForm.recommend_below} onChange={e => setTForm({ ...tForm, recommend_below: e.target.value })}><option value="all">Рекомендовать всем</option><option value="min">Ниже «мин»</option><option value="mid">Ниже «средн»</option><option value="top">Ниже «топ»</option></select>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                      <button onClick={() => addTraining(m.id)} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить тренинг</button>
                      <Link href={`/company-admin/tests?training=&metric=${m.id}`} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12, textDecoration: 'none', borderColor: 'rgba(192,132,252,0.4)', color: '#c084fc' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Создать тест по тренингу</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {metrics.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Показателей пока нет</div>}
        </div>
      </div>

      {/* Импорт */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setImportOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 620, maxHeight: '80vh', overflowY: 'auto', background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setImportOpen(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Импорт результатов</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={copyTemplate} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Шаблон для Excel / Google</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Seg active={importTab === 'paste'} onClick={() => setImportTab('paste')}>Вставить из Excel</Seg>
              <Seg active={importTab === 'google'} onClick={() => setImportTab('google')}>Ссылка на таблицу</Seg>
            </div>
            {importTab === 'paste' && (<>
              <textarea className="input-field" style={{ width: '100%' }} rows={7} placeholder={'Email\tКол-во звонков\tНазначено встреч\nivanov@co.ru\t120\t14'} value={pasteText} onChange={e => setPasteText(e.target.value)} />
              <button onClick={() => { const msg = applyRows(parseText(pasteText)); if (msg.startsWith('Применено')) { showSuccess(msg); setImportOpen(false) } else showError(msg) }} style={{ ...ghostBtn, marginTop: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Применить</button>
            </>)}
            {importTab === 'google' && (<>
              <input className="input-field" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…" value={gUrl} onChange={e => setGUrl(e.target.value)} />
              <button onClick={fetchGoogle} style={{ ...ghostBtn, marginTop: 10 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Забрать данные</button>
            </>)}
          </div>
        </div>
      )}

      {/* Редактирование показателя — компактная скроллируемая модалка */}
      <PremiumModal isOpen={!!editMetric} onClose={() => { setEditMetric(null); setEditForm(null) }} title={`Показатель: ${editMetric?.name || ''}`} showCloseButton={false}>
        {editForm && (
          <div style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название</label><input maxLength={24} className="input-field" style={{ width: '100%' }} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Тип расчёта</label><select className="input-field" style={{ width: '100%' }} value={editForm.kpi_type} onChange={e => setEditForm({ ...editForm, kpi_type: e.target.value })}>{Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Единица</label><select className="input-field" style={{ width: '100%' }} value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}><option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option></select></div>
            {editForm.kpi_type === 'ratio' && (<>
              <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Числитель</label><select className="input-field" style={{ width: '100%' }} value={editForm.num} onChange={e => setEditForm({ ...editForm, num: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
              <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Знаменатель</label><select className="input-field" style={{ width: '100%' }} value={editForm.den} onChange={e => setEditForm({ ...editForm, den: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
            </>)}
            {['thr_min', 'thr_mid', 'thr_top', 'thr_ultra'].map(k => (
              <div key={k}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>{k.split('_')[1]}</label><input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} /></div>
            ))}
            {['energy_min', 'energy_mid', 'energy_top', 'energy_ultra'].map(k => (
              <div key={k}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Энергия · {k.split('_')[1]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} /></div>
            ))}
            {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map(k => (
              <div key={k}><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Кармики · {k.split('_')[1]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} /></div>
            ))}
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10 }}>
              <button onClick={() => { setEditMetric(null); setEditForm(null) }} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={saveEdit} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </div>
        )}
      </PremiumModal>
    </div>
  )
}
export default withAuth(MasteryAdmin, { adminOnly: true })
