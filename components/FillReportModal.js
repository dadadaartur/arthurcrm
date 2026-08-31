import { useEffect, useState } from 'react'
import DatePicker from './DatePicker'
import { supabase } from '../lib/supabaseClient'
import { useFeedback } from '../context/ActionFeedbackContext'

// Полная переработка (31 августа 2026, по фидбеку: «сломана и вёрстка,
// и непонятно как вручную вносить данные») — не только цвета, но и сама
// структура: раньше вводимые и вычисляемые формулой колонки визуально
// ничем не отличались в плотной таблице, дата пряталась мелкой строкой
// сбоку, у кнопки «Сохранить» не было состояния загрузки вовсе.
const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const today = toISO(new Date())

const tiny = a => ({
  padding: '7px 15px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: a ? 600 : 400,
  background: a ? 'rgba(184,134,11,0.1)' : 'var(--bg-page)', border: `1px solid ${a ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
  color: a ? '#8a6208' : 'var(--text-secondary)', transition: 'all 0.2s', whiteSpace: 'nowrap'
})
const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '10px 22px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, transition: 'all .25s', whiteSpace: 'nowrap' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 12px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) load() }, [open])
  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const h = { Authorization: `Bearer ${session.access_token}` }
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    setMetrics(r.ok ? (await r.json()) || [] : [])
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const { data: emps } = await supabase.from('profiles').select('user_id, first_name, last_name, display_name, email').eq('company_id', prof.company_id).is('deleted_at', null).eq('is_company_admin', false)
    setEmployees(emps || [])
    setLoading(false)
  }

  const pool = (() => { const p = {}; metrics.forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i })); return Object.values(p) })()
  const directCols = metrics.filter(m => !m.formula).map(m => ({ key: 'm' + m.id, label: m.name, unit: m.unit, inverse: m.kpi_type === 'inverse' }))
  const cols = [...pool.map(c => ({ ...c, inverse: false })), ...directCols]
  const formulaMetrics = metrics.filter(m => m.formula)
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const datesInRange = () => { if (!from || !to) return []; const out = [], d = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00'); while (d <= end) { out.push(toISO(d)); d.setDate(d.getDate() + 1) } return out }
  const computeValue = (m, uid) => {
    if (m.formula) { const den = Number(values[uid]?.[m.formula.den]) || 0, num = Number(values[uid]?.[m.formula.num]) || 0; return den > 0 ? Math.round((num / den) * (m.formula.mult || 100) * 10) / 10 : null }
    const v = values[uid]?.['m' + m.id]; return v === '' || v == null ? null : Number(v)
  }
  const filledCount = employees.filter(emp => cols.some(c => { const v = values[emp.user_id]?.[c.key]; return v !== undefined && v !== '' })).length

  const save = async () => {
    const dates = fillMode === 'day' ? (date ? [date] : []) : datesInRange()
    if (!dates.length) { showError(fillMode === 'day' ? 'Выберите дату' : 'Выберите период «с/до»'); return }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const entries = []
    employees.forEach(emp => metrics.forEach(m => { const raw = computeValue(m, emp.user_id); if (raw == null) return; const perDay = dates.length > 1 ? Math.round((raw / dates.length) * 10) / 10 : raw; dates.forEach(d => entries.push({ metricId: m.id, userId: emp.user_id, value: perDay, date: d })) }))
    if (!entries.length) { showError('Нет заполненных значений'); setSaving(false); return }
    try {
      const res = await fetch('/api/company-admin/kpi/entries-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ entries }) })
      if (res.ok) { showSuccess(`Сохранено: ${entries.length} записей`); setValues({}); onClose(); if (onSaved) onSaved() }
      else showError('Ошибка сохранения')
    } catch (e) { showError('Сетевая ошибка — проверьте соединение') }
    setSaving(false)
  }
  const applyRows = rows => { if (!rows?.length) return 'Пустые данные'; const header = rows[0].map(h => (h || '').trim()); const emailIdx = header.findIndex(h => /email|почта/i.test(h)); if (emailIdx < 0) return 'Не найдена колонка «Email»'; const ltk = {}; cols.forEach(c => ltk[c.label.toLowerCase()] = c.key); const colMap = header.map((h, i) => ({ i, key: ltk[h.toLowerCase()] })).filter(x => x.key); let applied = 0; const next = { ...values }; rows.slice(1).forEach(r => { const email = (r[emailIdx] || '').trim().toLowerCase(); const emp = employees.find(e => (e.email || '').toLowerCase() === email); if (!emp) return; next[emp.user_id] = { ...(next[emp.user_id] || {}) }; colMap.forEach(({ i, key }) => { const v = parseFloat(String(r[i]).replace(',', '.')); if (!isNaN(v)) { next[emp.user_id][key] = v; applied++ } }) }); setValues(next); return `Применено значений: ${applied}` }
  const parseText = t => { const d = t.includes('\t') ? '\t' : (t.split(';').length > t.split(',').length ? ';' : ','); return t.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(d)) }
  const fetchGoogle = async () => { const id = (gUrl.match(/\/d\/([\w-]+)/) || [])[1]; if (!id) { showError('Неверная ссылка'); return } try { const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`); const msg = applyRows(parseText(await r.text())); if (msg.startsWith('Применено')) { showSuccess(msg); setTab('table') } else showError(msg) } catch (e) { showError('Не удалось скачать') } }
  const copyTemplate = async () => { const header = ['Email', ...cols.map(c => c.label)]; const ex = ['ivanov@company.ru', ...cols.map(() => '0')]; try { await navigator.clipboard.writeText([header.join('\t'), ex.join('\t')].join('\n')); showSuccess('Шаблон скопирован — вставьте Ctrl+V') } catch (e) { showError('Не удалось') } }

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(1240px, 96vw)', maxHeight: '90vh', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 3 }}><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>

        <div style={{ marginBottom: 4 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Заполнить показатели вручную</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 640 }}>
            Впишите значения в таблицу ниже (или вставьте данные из своей таблицы через «Импорт») и нажмите «Сохранить» —
            значения запишутся за выбранную дату или равномерно распределятся по всем дням выбранного периода.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', margin: '16px 0', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-page)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Способ</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTab('table')} style={tiny(tab === 'table')}>Таблица</button>
              <button onClick={() => setTab('import')} style={tiny(tab === 'import')}>Импорт</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Период</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setFillMode('day')} style={tiny(fillMode === 'day')}>За день</button>
              <button onClick={() => setFillMode('period')} style={tiny(fillMode === 'period')}>За диапазон</button>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {fillMode === 'day' ? 'Дата записи' : 'Диапазон дат'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {fillMode === 'day'
                ? <div style={{ width: 170 }}><DatePicker value={date} onChange={setDate} placeholder="Дата" /></div>
                : <><div style={{ width: 150 }}><DatePicker value={from} onChange={setFrom} placeholder="С" /></div><span style={{ color: 'var(--text-muted)' }}>—</span><div style={{ width: 150 }}><DatePicker value={to} onChange={setTo} placeholder="По" /></div></>}
            </div>
          </div>
        </div>

        {fillMode === 'period' && from && to && (
          <div style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(184,134,11,0.06)', border: '1px solid var(--border-gold)', color: '#8a6208', fontSize: 12, marginBottom: 14 }}>
            Введённое число разделится поровну на каждый день периода {from} — {to}.
          </div>
        )}

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Загружаем показатели и сотрудников…</div>
        ) : tab === 'table' ? (
          <>
            <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', marginRight: 5, verticalAlign: -1 }} />вводится вручную</span>
              <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: 'rgba(184,134,11,0.15)', border: '1px solid var(--border-gold)', marginRight: 5, verticalAlign: -1 }} />считается автоматически по формуле</span>
              <span style={{ marginLeft: 'auto' }}>Заполнено строк: {filledCount} из {employees.length}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-page)', zIndex: 2 }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500, minWidth: 190, position: 'sticky', left: 0, background: 'var(--bg-page)', zIndex: 3 }}>Сотрудник</th>
                    {cols.map(c => (
                      <th key={c.key} style={{ padding: '10px 8px', minWidth: 110, background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>{c.inverse ? 'меньше = лучше' : (c.unit || '—')}</div>
                      </th>
                    ))}
                    {formulaMetrics.map(m => (
                      <th key={m.id} style={{ padding: '10px 8px', minWidth: 110, background: 'rgba(184,134,11,0.06)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a6208', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                        <div style={{ fontSize: 9, color: '#8a6208', fontWeight: 400 }}>авто</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => (
                    <tr key={emp.user_id} style={{ background: i % 2 ? 'var(--bg-page)' : 'transparent' }}>
                      <td style={{ padding: '6px 12px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: i % 2 ? 'var(--bg-page)' : 'var(--bg-card)' }}>{empName(emp)}</td>
                      {cols.map(c => (
                        <td key={c.key} style={{ padding: '4px 6px' }}>
                          <input type="number" step="0.1" value={values[emp.user_id]?.[c.key] ?? ''} onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))} className="input-field" style={{ width: '100%', textAlign: 'center', padding: '7px 4px' }} />
                        </td>
                      ))}
                      {formulaMetrics.map(m => { const v = computeValue(m, emp.user_id); return (
                        <td key={m.id} style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600, color: v != null ? '#8a6208' : 'var(--text-muted)' }}>{v != null ? v + (m.unit || '') : '—'}</td>
                      )})}
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>Нет сотрудников</p>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={onClose} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={save} disabled={saving} style={{ ...ghostBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                {saving && <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(138,98,8,0.25)', borderTopColor: '#8a6208', animation: 'frmSpin 0.7s linear infinite' }} />}
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, maxWidth: 560 }}>
              Скопируйте шаблон, заполните его в своей таблице (первая колонка — email сотрудника) и вставьте обратно сюда,
              либо укажите ссылку на опубликованную Google Таблицу — данные подставятся в форму на вкладке «Таблица».
            </p>
            <button onClick={copyTemplate} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12, marginBottom: 16 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Скопировать шаблон таблицы</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <button onClick={() => setImportTab('paste')} style={tiny(importTab === 'paste')}>Вставить данные</button>
              <button onClick={() => setImportTab('google')} style={tiny(importTab === 'google')}>Ссылка на Google Таблицу</button>
            </div>
            {importTab === 'paste' ? (
              <>
                <textarea className="input-field" style={{ width: '100%' }} rows={8} placeholder={'Email\tКол-во звонков\nivanov@co.ru\t120'} value={pasteText} onChange={e => setPasteText(e.target.value)} />
                <button onClick={() => { const msg = applyRows(parseText(pasteText)); if (msg.startsWith('Применено')) { showSuccess(msg); setTab('table') } else showError(msg) }} style={{ ...ghostBtn, marginTop: 10 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Применить к таблице</button>
              </>
            ) : (
              <>
                <input className="input-field" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…" value={gUrl} onChange={e => setGUrl(e.target.value)} />
                <button onClick={fetchGoogle} style={{ ...ghostBtn, marginTop: 10 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Забрать данные в таблицу</button>
              </>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes frmSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
