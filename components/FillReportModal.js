import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useFeedback } from '../context/ActionFeedbackContext'

const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const today = toISO(new Date())
const dateInput = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 12, padding: '6px 10px', outline: 'none', colorScheme: 'dark', width: 140 }
const tiny = a => ({ padding: '5px 13px', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: a ? 600 : 400, background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`, color: a ? '#FFD700' : '#aaa', transition: 'all 0.2s', whiteSpace: 'nowrap' })
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 10, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s', whiteSpace: 'nowrap' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

export default function FillReportModal({ open, onClose, onSaved }) {
  const { showSuccess, showError } = useFeedback()
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [tab, setTab] = useState('table')
  const [fillMode, setFillMode] = useState('day')
  const [date, setDate] = useState(today)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [values, setValues] = useState({})
  const [importTab, setImportTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [gUrl, setGUrl] = useState('')

  useEffect(() => { if (open) load() }, [open])
  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const h = { Authorization: `Bearer ${session.access_token}` }
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    setMetrics(r.ok ? (await r.json()) || [] : [])
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const { data: emps } = await supabase.from('profiles').select('user_id, first_name, last_name, display_name, email').eq('company_id', prof.company_id).is('deleted_at', null).eq('is_company_admin', false)
    setEmployees(emps || [])
  }

  const pool = (() => { const p = {}; metrics.forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i })); return Object.values(p) })()
  const directCols = metrics.filter(m => !m.formula).map(m => ({ key: 'm' + m.id, label: m.name, unit: m.unit, inverse: m.kpi_type === 'inverse' }))
  const cols = [...pool.map(c => ({ ...c, inverse: false })), ...directCols]
  const formulaMetrics = metrics.filter(m => m.formula)
  const gridTemplate = `180px repeat(${cols.length}, 96px) repeat(${formulaMetrics.length}, 100px)`
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const datesInRange = () => { if (!from || !to) return []; const out = [], d = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00'); while (d <= end) { out.push(toISO(d)); d.setDate(d.getDate() + 1) } return out }
  const computeValue = (m, uid) => {
    if (m.formula) { const den = Number(values[uid]?.[m.formula.den]) || 0, num = Number(values[uid]?.[m.formula.num]) || 0; return den > 0 ? Math.round((num / den) * (m.formula.mult || 100) * 10) / 10 : null }
    const v = values[uid]?.['m' + m.id]; return v === '' || v == null ? null : Number(v)
  }
  const save = async () => {
    const dates = fillMode === 'day' ? (date ? [date] : []) : datesInRange()
    if (!dates.length) { showError(fillMode === 'day' ? 'Выберите дату' : 'Выберите период «с/до»'); return }
    const { data: { session } } = await supabase.auth.getSession()
    const entries = []
    employees.forEach(emp => metrics.forEach(m => { const raw = computeValue(m, emp.user_id); if (raw == null) return; const perDay = dates.length > 1 ? Math.round((raw / dates.length) * 10) / 10 : raw; dates.forEach(d => entries.push({ metricId: m.id, userId: emp.user_id, value: perDay, date: d })) }))
    if (!entries.length) { showError('Нет заполненных значений'); return }
    const res = await fetch('/api/company-admin/kpi/entries-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ entries }) })
    if (res.ok) { showSuccess(`Сохранено: ${entries.length} записей`); setValues({}); onClose(); if (onSaved) onSaved() }
    else showError('Ошибка сохранения')
  }
  const applyRows = rows => { if (!rows?.length) return 'Пустые данные'; const header = rows[0].map(h => (h || '').trim()); const emailIdx = header.findIndex(h => /email|почта/i.test(h)); if (emailIdx < 0) return 'Не найдена колонка «Email»'; const ltk = {}; cols.forEach(c => ltk[c.label.toLowerCase()] = c.key); const colMap = header.map((h, i) => ({ i, key: ltk[h.toLowerCase()] })).filter(x => x.key); let applied = 0; const next = { ...values }; rows.slice(1).forEach(r => { const email = (r[emailIdx] || '').trim().toLowerCase(); const emp = employees.find(e => (e.email || '').toLowerCase() === email); if (!emp) return; next[emp.user_id] = { ...(next[emp.user_id] || {}) }; colMap.forEach(({ i, key }) => { const v = parseFloat(String(r[i]).replace(',', '.')); if (!isNaN(v)) { next[emp.user_id][key] = v; applied++ } }) }); setValues(next); return `Применено значений: ${applied}` }
  const parseText = t => { const d = t.includes('\t') ? '\t' : (t.split(';').length > t.split(',').length ? ';' : ','); return t.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(d)) }
  const fetchGoogle = async () => { const id = (gUrl.match(/\/d\/([\w-]+)/) || [])[1]; if (!id) { showError('Неверная ссылка'); return } try { const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`); const msg = applyRows(parseText(await r.text())); if (msg.startsWith('Применено')) { showSuccess(msg); setTab('table') } else showError(msg) } catch (e) { showError('Не удалось скачать') } }
  const copyTemplate = async () => { const header = ['Email', ...cols.map(c => c.label)]; const ex = ['ivanov@company.ru', ...cols.map(() => '0')]; try { await navigator.clipboard.writeText([header.join('\t'), ex.join('\t')].join('\n')); showSuccess('Шаблон скопирован — вставьте Ctrl+V') } catch (e) { showError('Не удалось') } }
  const dateBanner = fillMode === 'day' ? `Цифры будут записаны за дату: ${date || '—'}` : `Цифры распределятся по дням: ${from || '—'} … ${to || '—'}`

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(1240px, 96vw)', maxHeight: '90vh', background: 'linear-gradient(150deg, rgba(24,30,54,0.98), rgba(10,14,28,0.99))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#fff' }}>Заполнить показатели</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setTab('table')} style={tiny(tab === 'table')}>Таблица</button>
            <button onClick={() => setTab('import')} style={tiny(tab === 'import')}>Импорт</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setFillMode('day')} style={tiny(fillMode === 'day')}>За день</button>
            <button onClick={() => setFillMode('period')} style={tiny(fillMode === 'period')}>За период</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
            {fillMode === 'day'
              ? <input type="date" value={date} onChange={e => setDate(e.target.value)} style={dateInput} />
              : <><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={dateInput} /><span style={{ color: '#555' }}>—</span><input type="date" value={to} onChange={e => setTo(e.target.value)} style={dateInput} /></>}
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', fontSize: 11, marginBottom: 10 }}>{dateBanner}</div>

        {tab === 'table' ? (
          <>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <div style={{ width: 'fit-content', margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 6, marginBottom: 6, position: 'sticky', top: 0, background: 'rgba(10,14,28,0.98)', padding: '6px 0', zIndex: 2 }}>
                  <div style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>Сотрудник</div>
                  {cols.map(c => <div key={c.key} style={{ textAlign: 'center', padding: '4px', borderRadius: 8, background: c.inverse ? 'rgba(160,233,255,0.06)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><div style={{ fontSize: 10, color: '#a0e9ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</div><div style={{ fontSize: 9, color: '#666' }}>{c.inverse ? 'меньше=лучше' : (c.unit || '')}</div></div>)}
                  {formulaMetrics.map(m => <div key={m.id} style={{ textAlign: 'center', padding: '4px', borderRadius: 8, background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}><div style={{ fontSize: 10, color: '#FFD700', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div><div style={{ fontSize: 9, color: '#666' }}>авто</div></div>)}
                </div>
                {employees.map(emp => (
                  <div key={emp.user_id} style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 170 }} title={empName(emp)}>{empName(emp)}</div>
                    {cols.map(c => <input key={c.key} type="number" step="0.1" value={values[emp.user_id]?.[c.key] ?? ''} onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))} className="input-field" style={{ width: '100%', textAlign: 'center', padding: '8px 2px' }} />)}
                    {formulaMetrics.map(m => { const v = computeValue(m, emp.user_id); return <div key={m.id} style={{ fontSize: 12, color: v != null ? '#FFD700' : '#555', fontWeight: 600, textAlign: 'center' }}>{v != null ? v + m.unit : '—'}</div> })}
                  </div>
                ))}
                {employees.length === 0 && <p style={{ color: '#777', fontSize: 12 }}>Нет сотрудников</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={onClose} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={save} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <button onClick={copyTemplate} style={{ ...ghostBtn, padding: '6px 12px', fontSize: 11, marginBottom: 10 }}>Шаблон таблицы</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button onClick={() => setImportTab('paste')} style={tiny(importTab === 'paste')}>Вставить</button>
              <button onClick={() => setImportTab('google')} style={tiny(importTab === 'google')}>Ссылка</button>
            </div>
            {importTab === 'paste' ? (
              <>
                <textarea className="input-field" style={{ width: '100%' }} rows={8} placeholder={'Email\tКол-во звонков\nivanov@co.ru\t120'} value={pasteText} onChange={e => setPasteText(e.target.value)} />
                <button onClick={() => { const msg = applyRows(parseText(pasteText)); if (msg.startsWith('Применено')) { showSuccess(msg); setTab('table') } else showError(msg) }} style={{ ...ghostBtn, marginTop: 8 }}>Применить и к таблице</button>
              </>
            ) : (
              <>
                <input className="input-field" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…" value={gUrl} onChange={e => setGUrl(e.target.value)} />
                <button onClick={fetchGoogle} style={{ ...ghostBtn, marginTop: 8 }}>Забрать данные в таблицу</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
