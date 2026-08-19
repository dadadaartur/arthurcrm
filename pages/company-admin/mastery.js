import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'
import { BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_').replace(/^_+|_+$/g, '')
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

function MasteryAdmin() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [pool, setPool] = useState([])
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [trainings, setTrainings] = useState({})
  const [tForm, setTForm] = useState({ title: '', type: 'video', url: '', content: '', test_questions: '', recommend_below: 'all' })
  const [form, setForm] = useState({ name: '', unit: '%', mode: 'formula', thr_min: 5, thr_mid: 10, thr_top: 15, thr_ultra: 20, energy_min: 10, energy_mid: 20, energy_top: 30, energy_ultra: 50, karma_min: 1, karma_mid: 3, karma_top: 5, karma_ultra: 10, description: '', advice: '', num: '', den: '', mult: 100 })
  const [newParam, setNewParam] = useState({ label: '', unit: 'шт' })
  const [date, setDate] = useState('')
  const [values, setValues] = useState({})
  const [importOpen, setImportOpen] = useState(false)
  const [importTab, setImportTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [gUrl, setGUrl] = useState('')

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

  const addParam = () => {
    if (!newParam.label.trim()) return
    const key = slug(newParam.label)
    if (!pool.find(p => p.key === key)) setPool(p => [...p, { key, label: newParam.label.trim(), unit: newParam.unit || 'шт' }])
    setNewParam({ label: '', unit: 'шт' })
    return key
  }

  const createMetric = async (e) => {
    e.preventDefault()
    let inputs = [], formula = null
    if (form.mode === 'formula') {
      if (!form.num || !form.den) { setMsg('Выберите параметры числителя и знаменателя'); return }
      inputs = [pool.find(p => p.key === form.num), pool.find(p => p.key === form.den)].filter(Boolean)
      formula = { num: form.num, den: form.den, mult: Number(form.mult) || 100 }
    }
    const nums = {}
    ;['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'energy_min', 'energy_mid', 'energy_top', 'energy_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => nums[k] = Number(form[k]) || 0)
    const h = await auth()
    const res = await fetch('/api/company-admin/kpi/metrics', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, ...nums, inputs, formula }) })
    setMsg(res.ok ? 'Показатель создан' : 'Ошибка создания')
    if (res.ok) setForm({ ...form, name: '', description: '', advice: '' })
    load()
  }
  const delMetric = async id => { const h = await auth(); await fetch('/api/company-admin/kpi/metrics', { method: 'DELETE', headers: h, body: JSON.stringify({ id }) }); load() }

  const loadTrainings = async mid => { const h = await auth(); const r = await fetch(`/api/company-admin/kpi/trainings?metricId=${mid}`, { headers: h }); if (r.ok) { const d = await r.json(); setTrainings(t => ({ ...t, [mid]: d })) } }
  const addTraining = async mid => {
    const h = await auth(); let tq = null
    if (tForm.type === 'test') { try { tq = JSON.parse(tForm.test_questions || '[]') } catch { setMsg('Неверный JSON теста'); return } }
    await fetch('/api/company-admin/kpi/trainings', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ metric_id: mid, title: tForm.title, type: tForm.type, url: tForm.url || null, content: tForm.content || null, test_questions: tq, recommend_below: tForm.recommend_below }) })
    setTForm({ title: '', type: 'video', url: '', content: '', test_questions: '', recommend_below: 'all' })
    loadTrainings(mid)
  }
  const delTraining = async (id, mid) => { const h = await auth(); await fetch('/api/company-admin/kpi/trainings', { method: 'DELETE', headers: h, body: JSON.stringify({ id }) }); loadTrainings(mid) }
  const uploadVideo = async (file) => {
    if (!file) return
    const path = `trainings/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('task-proofs').upload(path, file)
    if (error) { setMsg('Ошибка загрузки: ' + error.message); return }
    const { data } = supabase.storage.from('task-proofs').getPublicUrl(path)
    setTForm(t => ({ ...t, url: data.publicUrl }))
    setMsg('Видео загружено с устройства')
  }

  const sharedCols = pool
  const directCols = metrics.filter(m => !m.formula).map(m => ({ key: 'm' + m.id, label: m.name, unit: m.unit }))
  const cols = [...sharedCols, ...directCols]
  const computeValue = (m, uid) => {
    if (m.formula) {
      const den = Number(values[uid]?.[m.formula.den]) || 0
      const num = Number(values[uid]?.[m.formula.num]) || 0
      return den > 0 ? Math.round((num / den) * (m.formula.mult || 100) * 10) / 10 : null
    }
    const v = values[uid]?.['m' + m.id]
    return v === '' || v == null ? null : Number(v)
  }
  const saveManual = async () => {
    if (!date) { setMsg('Выберите дату в календаре'); return }
    const h = await auth()
    const entries = []
    employees.forEach(emp => metrics.forEach(m => {
      const v = computeValue(m, emp.user_id)
      if (v != null) entries.push({ metricId: m.id, userId: emp.user_id, value: v })
    }))
    if (!entries.length) { setMsg('Нет заполненных значений'); return }
    const res = await fetch('/api/company-admin/kpi/entries', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ date, entries }) })
    setMsg(res.ok ? 'Результаты сохранены — энергия и кармики начислены' : 'Ошибка сохранения')
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
    if (!id) { setMsg('Неверная ссылка на Google-таблицу'); return }
    try {
      const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`)
      const text = await r.text()
      setMsg(applyRows(parseText(text)))
    } catch (e) { setMsg('Не удалось скачать таблицу (проверьте доступ «по ссылке»)') }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление целями и мастерством" />
        {msg && <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: 13 }}>{msg}</div>}

        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Новый показатель</h3>
          <form onSubmit={createMetric} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: '#888' }}>Название</label><input className="input-field" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Конверсия лид → встреча" required /></div>
            <div><label style={{ fontSize: 12, color: '#888' }}>Единица</label><select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option></select></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Тип расчёта</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['formula', 'Формула (авто из параметров)'], ['direct', 'Прямое значение']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, mode: k })}
                    style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: form.mode === k ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.mode === k ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`, color: form.mode === k ? '#FFD700' : '#aaa' }}>{l}</button>
                ))}
              </div>
            </div>
            {form.mode === 'formula' && (
              <div style={{ gridColumn: '1 / -1', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
                  <div><label style={{ fontSize: 12, color: '#888' }}>Числитель (например, встречи)</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.num} onChange={e => setForm({ ...form, num: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                  <div><label style={{ fontSize: 12, color: '#888' }}>Знаменатель (например, звонки)</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.den} onChange={e => setForm({ ...form, den: e.target.value })}><option value="">—</option>{pool.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                  <div><label style={{ fontSize: 12, color: '#888' }}>Множитель</label><input type="number" className="input-field" style={{ width: '100%' }} value={form.mult} onChange={e => setForm({ ...form, mult: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <input className="input-field" placeholder="Новый параметр (Кол-во звонков)" value={newParam.label} onChange={e => setNewParam({ ...newParam, label: e.target.value })} />
                  <input className="input-field" style={{ width: 80 }} placeholder="шт" value={newParam.unit} onChange={e => setNewParam({ ...newParam, unit: e.target.value })} />
                  <button type="button" onClick={addParam} style={ghostBtn}>Добавить параметр</button>
                </div>
                <p style={{ fontSize: 11, color: '#666', marginTop: 8 }}>Параметр вводится один раз и используется всеми показателями, где он нужен.</p>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {['thr_min', 'thr_mid', 'thr_top', 'thr_ultra'].map((k, i) => <div key={k}><label style={{ fontSize: 11, color: BAND_COLORS[['min', 'mid', 'top', 'ultra'][i]] }}>{BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {['energy_min', 'energy_mid', 'energy_top', 'energy_ultra'].map((k, i) => <div key={k}><label style={{ fontSize: 11, color: '#888' }}>Энергия {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {['karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].map((k, i) => <div key={k}><label style={{ fontSize: 11, color: '#888' }}>Кармики {BAND_LABELS[['min', 'mid', 'top', 'ultra'][i]]}</label><input type="number" className="input-field" style={{ width: '100%' }} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
            </div>
            <div><label style={{ fontSize: 12, color: '#888' }}>Описание (как считается)</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#888' }}>Советы для выполнения</label><textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
            <div style={{ gridColumn: '1 / -1' }}><button type="submit" style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить показатель</button></div>
          </form>
        </div>

        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Ручной контроль (результаты за день)</h3>
            <button onClick={() => setImportOpen(true)} title="Инструкция по импорту"
              style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.5)', background: 'rgba(255,215,0,0.08)', color: '#FFD700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(255,215,0,0.2)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 6a2 2 0 1 1 3.4 1.4c-.6.6-1.4 1-1.4 2" stroke="#FFD700" strokeWidth="1.4" strokeLinecap="round" /><circle cx="8" cy="12" r="0.9" fill="#FFD700" /></svg>
            </button>
            <div style={{ marginLeft: 'auto', width: 200 }}><DatePicker value={date} onChange={setDate} placeholder="Дата отчёта" /></div>
            <button onClick={saveManual} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить результаты</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead><tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Сотрудник</th>
                {cols.map(c => <th key={c.key} style={{ padding: '8px 6px', color: '#a0e9ff', fontWeight: 500 }}>{c.label}</th>)}
                {metrics.filter(m => m.formula).map(m => <th key={m.id} style={{ padding: '8px 6px', color: '#FFD700', fontWeight: 500 }}>{m.name} (авто)</th>)}
              </tr></thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 10px', color: '#fff' }}>{empName(emp)}</td>
                    {cols.map(c => (
                      <td key={c.key} style={{ padding: '6px' }}>
                        <input type="number" step="0.1" value={values[emp.user_id]?.[c.key] ?? ''} onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))} className="input-field" style={{ width: 90 }} />
                      </td>
                    ))}
                    {metrics.filter(m => m.formula).map(m => {
                      const v = computeValue(m, emp.user_id)
                      return <td key={m.id} style={{ padding: '6px', color: v != null ? '#FFD700' : '#555', fontWeight: 600 }}>{v != null ? v + m.unit : '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {metrics.map(m => (
            <div key={m.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 600, margin: 0 }}>{m.name}</h3>
                  <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                    {m.formula ? `Формула: ${pool.find(p => p.key === m.formula.num)?.label || m.formula.num} / ${pool.find(p => p.key === m.formula.den)?.label || m.formula.den} × ${m.formula.mult}` : 'Прямое значение'} ·
                    <span style={{ color: BAND_COLORS.min }}> мин {m.thr_min}</span> ·<span style={{ color: BAND_COLORS.mid }}> средн {m.thr_mid}</span> ·<span style={{ color: BAND_COLORS.top }}> топ {m.thr_top}</span> ·<span style={{ color: BAND_COLORS.ultra }}> ультра {m.thr_ultra}{m.unit}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setExpanded(expanded === m.id ? null : m.id); loadTrainings(m.id) }} style={ghostBtn}>{expanded === m.id ? 'Свернуть' : 'Тренинги'}</button>
                  <button onClick={() => delMetric(m.id)} style={{ ...ghostBtn, borderColor: 'rgba(244,67,54,0.4)', color: '#f87171' }}>Удалить</button>
                </div>
              </div>
              {expanded === m.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(trainings[m.id] || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: 13, color: '#fff' }}>{t.title} <span style={{ fontSize: 11, color: '#888' }}>· {t.type === 'video' ? 'видео' : t.type === 'test' ? 'тест' : 'текст'} · {t.recommend_below === 'all' ? 'рекомендован всем' : 'ниже «' + BAND_LABELS[t.recommend_below] + '»'}</span></span>
                      <button onClick={() => delTraining(t.id, m.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>Удалить</button>
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="input-field" placeholder="Название тренинга" value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} />
                    <select className="input-field" value={tForm.type} onChange={e => setTForm({ ...tForm, type: e.target.value })}><option value="video">Видео</option><option value="text">Текст</option><option value="test">Тест</option></select>
                    {tForm.type === 'video' && (
                      <>
                        <input className="input-field" placeholder="URL видео (или загрузите файл)" value={tForm.url} onChange={e => setTForm({ ...tForm, url: e.target.value })} />
                        <label style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 11V3M4.5 6.5L8 3l3.5 3.5" stroke="#FFD700" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 13h10" stroke="#FFD700" strokeWidth="1.4" strokeLinecap="round" /></svg>
                          Загрузить с устройства
                          <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => uploadVideo(e.target.files[0])} />
                        </label>
                      </>
                    )}
                    <select className="input-field" value={tForm.recommend_below} onChange={e => setTForm({ ...tForm, recommend_below: e.target.value })}><option value="all">Рекомендовать всем</option><option value="min">Ниже «мин»</option><option value="mid">Ниже «средн»</option><option value="top">Ниже «топ»</option></select>
                    <textarea className="input-field" style={{ gridColumn: '1 / -1' }} rows={2} placeholder={tForm.type === 'test' ? 'JSON теста: [{"q":"Вопрос","options":["A","B"],"correct":0}]' : 'Текст тренинга'} value={tForm.type === 'test' ? tForm.test_questions : tForm.content} onChange={e => setTForm(tForm.type === 'test' ? { ...tForm, test_questions: e.target.value } : { ...tForm, content: e.target.value })} />
                    <div><button onClick={() => addTraining(m.id)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить тренинг</button></div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {metrics.length === 0 && <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#777' }}>Показателей пока нет — создайте первый выше</div>}
        </div>
      </div>

      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setImportOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 640, maxHeight: '85vh', overflowY: 'auto', background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26 }}>
            <h3 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 12px', background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Импорт результатов (Excel / Google)</h3>
            <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, marginBottom: 14 }}>
              Правила таблицы: первая строка — заголовки. Обязательная колонка <b style={{ color: '#fff' }}>Email</b>. Остальные заголовки должны точно совпадать с названиями параметров: {cols.map(c => `«${c.label}»`).join(', ') || '—'}. Дата отчёта выбирается в календаре на странице.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['paste', 'Вставить из Excel'], ['google', 'Google-таблица']].map(([k, l]) => (
                <button key={k} onClick={() => setImportTab(k)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: importTab === k ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${importTab === k ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`, color: importTab === k ? '#FFD700' : '#aaa' }}>{l}</button>
              ))}
            </div>
            {importTab === 'paste' && (
              <>
                <textarea className="input-field" style={{ width: '100%' }} rows={8} placeholder={'Email\tКол-во звонков\tНазначено встреч\nivanov@co.ru\t120\t14'} value={pasteText} onChange={e => setPasteText(e.target.value)} />
                <button onClick={() => { setMsg(applyRows(parseText(pasteText))); setImportOpen(false) }} style={{ ...ghostBtn, marginTop: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Применить</button>
              </>
            )}
            {importTab === 'google' && (
              <>
                <input className="input-field" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…" value={gUrl} onChange={e => setGUrl(e.target.value)} />
                <p style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Таблица должна быть открыта «по ссылке». Настройте один раз — дальше просто обновляйте цифры.</p>
                <button onClick={fetchGoogle} style={{ ...ghostBtn, marginTop: 10 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Забрать данные</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default withAuth(MasteryAdmin, { adminOnly: true })
