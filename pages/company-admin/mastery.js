import { useEffect, useState } from 'react'
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
const ghostBtn = {
  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12,
  padding: '10px 22px', color: '#fff', cursor: 'pointer', fontSize: 13,
  transition: 'all .25s', letterSpacing: 0.3
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
const smallBtn = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '5px 12px', color: '#aaa', cursor: 'pointer',
  fontSize: 11, transition: 'all 0.2s'
}

function MasteryAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [pool, setPool] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [trainings, setTrainings] = useState({})
  const [tForm, setTForm] = useState({ title: '', type: 'video', url: '', content: '', test_questions: '', recommend_below: 'all' })
  const [form, setForm] = useState({
    name: '', unit: '%', mode: 'formula', kpi_type: 'cumulative',
    thr_min: 5, thr_mid: 10, thr_top: 15, thr_ultra: 20,
    energy_min: 10, energy_mid: 20, energy_top: 30, energy_ultra: 50,
    karma_min: 1, karma_mid: 3, karma_top: 5, karma_ultra: 10,
    description: '', advice: '', num: '', den: '', mult: 100
  })
  const [newParam, setNewParam] = useState({ label: '', unit: 'шт' })
  // Заполнение показателей: день или период
  const [fillMode, setFillMode] = useState('day')
  const [date, setDate] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [values, setValues] = useState({})
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
    const { data: emps } = await supabase.from('profiles')
      .select('user_id, display_name, email, first_name, last_name')
      .eq('company_id', prof.company_id).is('deleted_at', null).eq('is_company_admin', false)
    setEmployees(emps || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const addParam = () => {
    if (!newParam.label.trim()) return
    const key = slug(newParam.label)
    if (!pool.find(p => p.key === key)) setPool(p => [...p, { key, label: newParam.label.trim(), unit: newParam.unit || 'шт' }])
    setNewParam({ label: '', unit: 'шт' })
  }

  const createMetric = async (e) => {
    e.preventDefault()
    let inputs = [], formula = null
    if (form.mode === 'formula') {
      if (!form.num || !form.den) { showError('Выберите числитель и знаменатель'); return }
      inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean)
      formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 }
    }
    const nums = {}
    ;['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'energy_min', 'energy_mid', 'energy_top', 'energy_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => nums[k] = Number(form[k]) || 0)
    const h = await auth()
    const res = await fetch('/api/company-admin/kpi/metrics', {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...nums, inputs, formula })
    })
    if (res.ok) { showSuccess('Показатель создан'); setForm({ ...form, name: '', description: '', advice: '' }) }
    else showError('Ошибка создания')
    load()
  }

  const openEdit = (m) => {
    setEditMetric(m)
    setEditForm({
      name: m.name, unit: m.unit, kpi_type: m.kpi_type || 'cumulative',
      thr_min: m.thr_min, thr_mid: m.thr_mid, thr_top: m.thr_top, thr_ultra: m.thr_ultra,
      energy_min: m.energy_min, energy_mid: m.energy_mid, energy_top: m.energy_top, energy_ultra: m.energy_ultra,
      karma_min: m.karma_min, karma_mid: m.karma_mid, karma_top: m.karma_top, karma_ultra: m.karma_ultra,
      description: m.description || '', advice: m.advice || '',
      num: m.formula?.num || '', den: m.formula?.den || '', mult: m.formula?.mult || 100
    })
  }

  const saveEdit = async () => {
    if (!editMetric || !editForm) return
    const nums = {}
    ;['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'energy_min', 'energy_mid', 'energy_top', 'energy_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra', 'mult'].forEach(k => nums[k] = Number(editForm[k]) || 0)
    let inputs = editMetric.inputs || [], formula = editMetric.formula || null
    if (editForm.num && editForm.den) {
      inputs = [pool.find(p => p.key === editForm.num), pool.find(p => p.key === editForm.den)].filter(Boolean)
      formula = { num: editForm.num, den: editForm.den, mult: nums.mult }
    }
    const h = await auth()
    const res = await fetch('/api/company-admin/kpi/metrics', {
      method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editMetric.id, ...editForm, ...nums, inputs, formula })
    })
    if (res.ok) { showSuccess('Показатель обновлён'); setEditMetric(null); setEditForm(null) }
    else showError('Ошибка сохранения')
    load()
  }

  const delMetric = async id => {
    const h = await auth()
    await fetch('/api/company-admin/kpi/metrics', { method: 'DELETE', headers: h, body: JSON.stringify({ id }) })
    showSuccess('Показатель удалён')
    load()
  }

  const loadTrainings = async mid => {
    const h = await auth()
    const r = await fetch(`/api/company-admin/kpi/trainings?metricId=${mid}`, { headers: h })
    if (r.ok) { const d = await r.json(); setTrainings(t => ({ ...t, [mid]: d })) }
  }
  const addTraining = async mid => {
    const h = await auth(); let tq = null
    if (tForm.type === 'test') { try { tq = JSON.parse(tForm.test_questions || '[]') } catch { showError('Неверный JSON теста'); return } }
    await fetch('/api/company-admin/kpi/trainings', {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric_id: mid, title: tForm.title, type: tForm.type, url: tForm.url || null, content: tForm.content || null, test_questions: tq, recommend_below: tForm.recommend_below })
    })
    showSuccess('Тренинг добавлен')
    setTForm({ title: '', type: 'video', url: '', content: '', test_questions: '', recommend_below: 'all' })
    loadTrainings(mid)
  }
  const delTraining = async (id, mid) => {
    const h = await auth()
    await fetch('/api/company-admin/kpi/trainings', { method: 'DELETE', headers: h, body: JSON.stringify({ id }) })
    showSuccess('Тренинг удалён')
    loadTrainings(mid)
  }
  const uploadVideo = async (file) => {
    if (!file) return
    const path = `trainings/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('task-proofs').upload(path, file)
    if (error) { showError('Ошибка загрузки: ' + error.message); return }
    const { data } = supabase.storage.from('task-proofs').getPublicUrl(path)
    setTForm(t => ({ ...t, url: data.publicUrl }))
    showSuccess('Видео загружено с устройства')
  }

  // ===== Заполнение показателей =====
  const sharedCols = pool
  const directCols = metrics.filter(m => !m.formula).map(m => ({ key: 'm' + m.id, label: m.name, unit: m.unit }))
  const cols = [...sharedCols, ...directCols]
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
    const out = []
    const d = new Date(range.from + 'T00:00:00')
    const end = new Date(range.to + 'T00:00:00')
    while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
    return out
  }

  const saveFill = async () => {
    const dates = fillMode === 'day' ? (date ? [date] : []) : datesInRange()
    if (!dates.length) { showError(fillMode === 'day' ? 'Выберите дату' : 'Выберите период'); return }
    const h = await auth()
    const entries = []
    const daysCount = dates.length
    employees.forEach(emp => {
      metrics.forEach(m => {
        const raw = computeValue(m, emp.user_id)
        if (raw == null) return
        const perDay = daysCount > 1 ? Math.round((raw / daysCount) * 10) / 10 : raw
        dates.forEach(d => entries.push({ metricId: m.id, userId: emp.user_id, value: perDay, date: d }))
      })
    })
    if (!entries.length) { showError('Нет заполненных значений'); return }
    const res = await fetch('/api/company-admin/kpi/entries-bulk', {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries })
    })
    if (res.ok) showSuccess(`Сохранено: ${entries.length} записей`)
    else showError('Ошибка сохранения')
  }

  // ===== Импорт =====
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
    if (!id) { showError('Неверная ссылка на Google-таблицу'); return }
    try {
      const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`)
      const text = await r.text()
      const msg = applyRows(parseText(text))
      if (msg.startsWith('Применено')) showSuccess(msg); else showError(msg)
    } catch (e) { showError('Не удалось скачать таблицу (проверьте доступ «по ссылке»)') }
  }
  const copyTemplate = async (kind) => {
    const header = ['Email', ...cols.map(c => c.label)]
    const example = ['ivanov@company.ru', ...cols.map(() => '0')]
    const text = kind === 'excel' ? [header.join('\t'), example.join('\t')].join('\n') : [header.join('\t'), example.join('\t')].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(kind === 'excel' ? 'Шаблон для Excel скопирован' : 'Шаблон для Google Таблиц скопирован')
    } catch (e) { showError('Не удалось скопировать') }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями и мастерством" />

        {/* ===== Новый показатель ===== */}
        <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 18, color: '#fff' }}>Новый показатель</h3>
          <form onSubmit={createMetric}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название (до 24 символов)</label>
                <input maxLength={24} className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Конверсия лид → встреча" required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Единица</label>
                <select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Тип расчёта</label>
                <select className="input-field" style={{ width: '100%' }} value={form.kpi_type} onChange={e => setForm({ ...form, kpi_type: e.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Источник значения</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['formula', 'Формула (доля от параметров)'], ['direct', 'Прямое значение']].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setForm({ ...form, mode: k })}
                      style={{
                        padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        background: form.mode === k ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${form.mode === k ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
                        color: form.mode === k ? '#FFD700' : '#aaa', transition: 'all 0.2s'
                      }}>{l}</button>
                  ))}
                </div>
              </div>
              {form.mode === 'formula' && (
                <>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Числитель (успешные)</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}>
                      <option value="">—</option>
                      {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Знаменатель (всего)</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}>
                      <option value="">—</option>
                      {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Множитель</label>
                    <input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <input className="input-field" style={{ flex: 1 }} placeholder="Новый параметр (Кол-во звонков)" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} />
                    <input className="input-field" style={{ width: 70 }} placeholder="шт" value={newParam.unit} onChange={e => setNewParam({ ...newParam, unit: e.target.value })} />
                    <button type="button" onClick={addParam} style={{ ...ghostBtn, padding: '9px 16px', fontSize: 12, whiteSpace: 'nowrap' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить</button>
                  </div>
                </>
              )}
              {['thr_min', 'thr_mid', 'thr_top', 'thr_ultra'].map((k, i) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: BAND_COLORS[['min', 'mid', 'top', 'ultra'][i]], display: 'block', marginBottom: 6 }}>{BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label>
                  <input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              {['energy_min', 'energy_mid', 'energy_top', 'energy_ultra'].map((k, i) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Энергия · {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map((k, i) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Кармики · {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание (как считается)</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Советы для выполнения</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <button type="submit" style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить показатель</button>
              </div>
            </div>
          </form>
        </div>

        {/* ===== Заполнить показатели ===== */}
        <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: '#fff' }}>Заполнить показатели</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setFillMode('day')} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                background: fillMode === 'day' ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${fillMode === 'day' ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
                color: fillMode === 'day' ? '#FFD700' : '#aaa'
              }}>За день</button>
              <button onClick={() => setFillMode('period')} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                background: fillMode === 'period' ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${fillMode === 'period' ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
                color: fillMode === 'period' ? '#FFD700' : '#aaa'
              }}>За период</button>
            </div>
            {/* Кастомный символ загрузки (интеграции) */}
            <button onClick={() => setImportOpen(true)} title="Импорт результатов"
              style={{
                width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                background: 'rgba(160,233,255,0.08)', border: '1px solid rgba(160,233,255,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#a0e9ff'; e.currentTarget.style.boxShadow = '0 0 12px rgba(160,233,255,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(160,233,255,0.35)'; e.currentTarget.style.boxShadow = 'none' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 10V2M5 5l3-3 3 3" stroke="#a0e9ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 10v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" stroke="#a0e9ff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              {fillMode === 'day'
                ? <div style={{ width: 190 }}><DatePicker value={date} onChange={setDate} placeholder="Дата отчёта" /></div>
                : <DateRangePicker from={range.from} to={range.to} onChange={setRange} />}
              <button onClick={saveFill} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </div>
          {fillMode === 'period' && range.from && range.to && (
            <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
              Итог за период будет распределён равномерно по дням ({datesInRange().length} дн.) — так средние и накопительные показатели считаются корректно.
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 700 }}>
              {/* Шапка таблицы — единая сетка */}
              <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${cols.length}, 110px) repeat(${formulaMetrics.length}, 110px)`, gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'center' }}>Сотрудник</div>
                {cols.map(c => (
                  <div key={c.key} style={{ fontSize: 11, color: '#a0e9ff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</div>
                ))}
                {formulaMetrics.map(m => (
                  <div key={m.id} style={{ fontSize: 11, color: '#FFD700', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name} (авто)</div>
                ))}
              </div>
              {employees.map(emp => (
                <div key={emp.user_id} style={{ display: 'grid', gridTemplateColumns: `220px repeat(${cols.length}, 110px) repeat(${formulaMetrics.length}, 110px)`, gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={empName(emp)}>{empName(emp)}</div>
                  {cols.map(c => (
                    <input key={c.key} type="number" step="0.1"
                      value={values[emp.user_id]?.[c.key] ?? ''}
                      onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))}
                      className="input-field" style={{ width: '100%', textAlign: 'center' }} />
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
        </div>

        {/* ===== Список показателей ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
          {metrics.map(m => (
            <div key={m.id} style={{
              background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)',
              borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)',
              transition: 'border-color 0.25s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name}</h3>
                  <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0', lineHeight: 1.5 }}>
                    {TYPE_LABELS[m.kpi_type || 'cumulative']} ·
                    {m.formula ? ` ${pool.find(p => p.key === m.formula.num)?.label || '—'} / ${pool.find(p => p.key === m.formula.den)?.label || '—'} × ${m.formula.mult} ·` : ''}
                    {' '}мин {m.thr_min} / средн {m.thr_mid} / топ {m.thr_top} / ультра {m.thr_ultra}{m.unit}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button onClick={() => { setExpanded(expanded === m.id ? null : m.id); loadTrainings(m.id) }} style={smallBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)'; e.currentTarget.style.color = '#FFD700' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#aaa' }}>
                  {expanded === m.id ? 'Свернуть' : 'Тренинги'}
                </button>
                <button onClick={() => openEdit(m)} style={smallBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(160,233,255,0.5)'; e.currentTarget.style.color = '#a0e9ff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#aaa' }}>
                  Редактировать
                </button>
                <button onClick={() => delMetric(m.id)} style={{ ...smallBtn, borderColor: 'rgba(244,67,54,0.3)', color: '#f87171' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(244,67,54,0.3)'}>
                  Удалить
                </button>
              </div>
              {expanded === m.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(trainings[m.id] || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: 12, color: '#fff' }}>{t.title} <span style={{ fontSize: 10, color: '#888' }}>· {t.type === 'video' ? 'видео' : t.type === 'test' ? 'тест' : 'текст'} · {t.recommend_below === 'all' ? 'всем' : 'ниже «' + BAND_LABELS[t.recommend_below] + '»'}</span></span>
                      <button onClick={() => delTraining(t.id, m.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>Удалить</button>
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input className="input-field" placeholder="Название тренинга" value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} />
                    <select className="input-field" value={tForm.type} onChange={e => setTForm({ ...tForm, type: e.target.value })}>
                      <option value="video">Видео</option><option value="text">Текст</option><option value="test">Тест</option>
                    </select>
                    {tForm.type === 'video' && (
                      <>
                        <input className="input-field" placeholder="URL видео" value={tForm.url} onChange={e => setTForm({ ...tForm, url: e.target.value })} />
                        <label style={{ ...smallBtn, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', justifyContent: 'center' }}>
                          С устройства
                          <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => uploadVideo(e.target.files[0])} />
                        </label>
                      </>
                    )}
                    <select className="input-field" value={tForm.recommend_below} onChange={e => setTForm({ ...tForm, recommend_below: e.target.value })}>
                      <option value="all">Рекомендовать всем</option>
                      <option value="min">Ниже «мин»</option><option value="mid">Ниже «средн»</option><option value="top">Ниже «топ»</option>
                    </select>
                    <textarea className="input-field" style={{ gridColumn: '1 / -1' }} rows={2}
                      placeholder={tForm.type === 'test' ? 'JSON теста: [{"q":"Вопрос","options":["A","B"],"correct":0}]' : 'Текст тренинга'}
                      value={tForm.type === 'test' ? tForm.test_questions : tForm.content}
                      onChange={e => setTForm(tForm.type === 'test' ? { ...tForm, test_questions: e.target.value } : { ...tForm, content: e.target.value })} />
                    <div><button onClick={() => addTraining(m.id)} style={{ ...ghostBtn, padding: '8px 18px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить тренинг</button></div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {metrics.length === 0 && (
            <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)' }}>
              Показателей пока нет — создайте первый выше
            </div>
          )}
        </div>
      </div>

      {/* ===== Модалка импорта ===== */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setImportOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 620, maxHeight: '85vh', overflowY: 'auto', background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26, position: 'relative' }}>
            {/* Крестик закрытия */}
            <button onClick={() => setImportOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Импорт результатов</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>
              Первая строка — заголовки. Обязательная колонка «Email», остальные — точно как названия параметров: {cols.map(c => `«${c.label}»`).join(', ') || '—'}.
            </p>
            {/* Копирование шаблонов */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              <button onClick={() => copyTemplate('excel')} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                Шаблон для Excel
              </button>
              <button onClick={() => copyTemplate('google')} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                Шаблон для Google Таблиц
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['paste', 'Вставить из Excel'], ['google', 'Ссылка на таблицу']].map(([k, l]) => (
                <button key={k} onClick={() => setImportTab(k)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  background: importTab === k ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${importTab === k ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
                  color: importTab === k ? '#FFD700' : '#aaa'
                }}>{l}</button>
              ))}
            </div>
            {importTab === 'paste' && (
              <>
                <textarea className="input-field" style={{ width: '100%' }} rows={7}
                  placeholder={'Email\tКол-во звонков\tНазначено встреч\nivanov@co.ru\t120\t14'}
                  value={pasteText} onChange={e => setPasteText(e.target.value)} />
                <button onClick={() => { const msg = applyRows(parseText(pasteText)); if (msg.startsWith('Применено')) { showSuccess(msg); setImportOpen(false) } else showError(msg) }}
                  style={{ ...ghostBtn, marginTop: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Применить</button>
              </>
            )}
            {importTab === 'google' && (
              <>
                <input className="input-field" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…" value={gUrl} onChange={e => setGUrl(e.target.value)} />
                <p style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Таблица должна быть открыта «по ссылке».</p>
                <button onClick={fetchGoogle} style={{ ...ghostBtn, marginTop: 10 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Забрать данные</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Модалка редактирования показателя ===== */}
      <PremiumModal isOpen={!!editMetric} onClose={() => { setEditMetric(null); setEditForm(null) }} title={`Показатель: ${editMetric?.name || ''}`} showCloseButton={false}>
        {editForm && (
          <div style={{ textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название</label>
              <input maxLength={24} className="input-field" style={{ width: '100%' }} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Тип расчёта</label>
              <select className="input-field" style={{ width: '100%' }} value={editForm.kpi_type} onChange={e => setEditForm({ ...editForm, kpi_type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Единица</label>
              <select className="input-field" style={{ width: '100%' }} value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}>
                <option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="мин">мин</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Числитель</label>
              <select className="input-field" style={{ width: '100%' }} value={editForm.num} onChange={e => setEditForm({ ...editForm, num: e.target.value })}>
                <option value="">—</option>
                {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Знаменатель</label>
              <select className="input-field" style={{ width: '100%' }} value={editForm.den} onChange={e => setEditForm({ ...editForm, den: e.target.value })}>
                <option value="">—</option>
                {pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Множитель</label>
              <input type="number" className="input-field" style={{ width: '100%' }} value={editForm.mult} onChange={e => setEditForm({ ...editForm, mult: e.target.value })} />
            </div>
            {['thr_min', 'thr_mid', 'thr_top', 'thr_ultra'].map((k, i) => (
              <div key={k} style={{ gridColumn: i < 2 ? 'auto' : 'auto' }}>
                <label style={{ fontSize: 11, color: BAND_COLORS[['min', 'mid', 'top', 'ultra'][i]], display: 'block', marginBottom: 6 }}>{BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label>
                <input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} />
              </div>
            ))}
            {['energy_min', 'energy_mid', 'energy_top', 'energy_ultra'].map(k => (
              <div key={k}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Энергия · {k.split('_')[1]}</label>
                <input type="number" className="input-field" style={{ width: '100%' }} value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} />
              </div>
            ))}
            {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map(k => (
              <div key={k}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Кармики · {k.split('_')[1]}</label>
                <input type="number" className="input-field" style={{ width: '100%' }} value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} />
              </div>
            ))}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание</label>
              <textarea className="input-field" style={{ width: '100%' }} rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Советы</label>
              <textarea className="input-field" style={{ width: '100%' }} rows={2} value={editForm.advice} onChange={e => setEditForm({ ...editForm, advice: e.target.value })} />
            </div>
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
