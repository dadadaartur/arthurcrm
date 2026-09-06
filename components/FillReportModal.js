import { useEffect, useState, useRef } from 'react'
import DatePicker from './DatePicker'
import { supabase } from '../lib/supabaseClient'
import { useFeedback } from '../context/ActionFeedbackContext'

// Ручное заполнение показателей — переработано 2 сентября 2026 по
// прямому запросу: раньше это была одна большая форма с кнопкой
// «Сохранить», которая закрывала окно целиком — заполнить несколько
// дней подряд означало открывать модалку заново после каждого. Плюс
// режим «за период» с делением введённого числа поровну по дням
// оказался путающим («непонятна фраза из скрипта») и не нужен, если
// сохранение теперь происходит сразу.
//
// Новая механика — как в гугл-таблице: одна ячейка = один день одного
// показателя одного сотрудника. Вписал число → само сохранилось при
// уходе из поля (без отдельной кнопки), в углу ячейки на секунду
// появляется галочка. Чтобы поправить — просто стираешь и вписываешь
// другое. Переключение дня — просто смена даты сверху, окно не
// закрывается никогда само, только по вашему явному действию.
const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const today = toISO(new Date())

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '10px 22px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, transition: 'all .25s', whiteSpace: 'nowrap' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 12px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }

export default function FillReportModal({ open, onClose, onSaved }) {
  const { showError } = useFeedback()
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [tab, setTab] = useState('table')
  const [date, setDate] = useState(today)
  const [values, setValues] = useState({})
  const [cellState, setCellState] = useState({}) // 'saving' | 'saved' | undefined, ключ `${uid}:${key}`
  const [importTab, setImportTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [gUrl, setGUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const savedTimers = useRef({})

  useEffect(() => { if (open) load() }, [open, date])
  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const h = { Authorization: `Bearer ${session.access_token}` }
    const r = await fetch('/api/company-admin/kpi/metrics', { headers: h })
    const metricsList = r.ok ? (await r.json()) || [] : []
    setMetrics(metricsList)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    const { data: emps } = await supabase.from('profiles').select('user_id, first_name, last_name, display_name, email').eq('company_id', prof.company_id).is('deleted_at', null).eq('is_company_admin', false)
    setEmployees(emps || [])

    // Подгружаем уже внесённые за эту дату значения — ячейки приходят
    // предзаполненными, а не пустыми, если день уже частично заполнен.
    const directMetricIds = metricsList.filter(m => !m.formula).map(m => m.id)
    const inputKeys = {}
    metricsList.forEach(x => (x.inputs || []).forEach(i => { inputKeys[i.key] = true }))
    if (directMetricIds.length) {
      const { data: existing } = await supabase.from('kpi_entries').select('user_id, metric_id, value').in('metric_id', directMetricIds).eq('entry_date', date)
      const next = {}
      ;(existing || []).forEach(e => { next[e.user_id] = { ...(next[e.user_id] || {}) }; next[e.user_id]['m' + e.metric_id] = String(e.value) })
      setValues(next)
    } else {
      setValues({})
    }
    setLoading(false)
  }

  const pool = (() => { const p = {}; metrics.forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i })); return Object.values(p) })()
  const directCols = metrics.filter(m => !m.formula).map(m => ({ id: m.id, key: 'm' + m.id, label: m.name, unit: m.unit, inverse: m.kpi_type === 'inverse' }))
  const cols = [...pool.map(c => ({ ...c, inverse: false })), ...directCols]
  const formulaMetrics = metrics.filter(m => m.formula)
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const computeValue = (m, uid) => {
    if (m.formula) { const den = Number(values[uid]?.[m.formula.den]) || 0, num = Number(values[uid]?.[m.formula.num]) || 0; return den > 0 ? Math.round((num / den) * (m.formula.mult || 100) * 10) / 10 : null }
    const v = values[uid]?.['m' + m.id]; return v === '' || v == null ? null : Number(v)
  }
  const filledCount = employees.filter(emp => cols.some(c => { const v = values[emp.user_id]?.[c.key]; return v !== undefined && v !== '' })).length

  // Автосохранение одной ячейки — вызывается при уходе из поля
  // (onBlur), не на каждое нажатие клавиши, чтобы не слать запрос на
  // каждую введённую цифру. col.id — реальный id прямого показателя;
  // для колонок-инпутов формулы (pool) своего id показателя нет, они
  // не сохраняются напрямую, только участвуют в расчёте формульных.
  const saveCell = async (uid, col) => {
    if (!col.id) return // это инпут формулы (pool), не отдельный показатель — сохранять нечего
    const raw = values[uid]?.[col.key]
    if (raw === undefined || raw === '') return
    const cellKey = `${uid}:${col.key}`
    setCellState(s => ({ ...s, [cellKey]: 'saving' }))
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/company-admin/kpi/entries-bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ entries: [{ metricId: col.id, userId: uid, value: Number(raw), date }] })
      })
      if (!res.ok) throw new Error()
      setCellState(s => ({ ...s, [cellKey]: 'saved' }))
      clearTimeout(savedTimers.current[cellKey])
      savedTimers.current[cellKey] = setTimeout(() => setCellState(s => ({ ...s, [cellKey]: undefined })), 1600)
      if (onSaved) onSaved()
    } catch (e) {
      setCellState(s => ({ ...s, [cellKey]: undefined }))
      showError('Не сохранилось — проверьте соединение и попробуйте снова')
    }
  }

  const applyRows = rows => { if (!rows?.length) return 'Пустые данные'; const header = rows[0].map(h => (h || '').trim()); const emailIdx = header.findIndex(h => /email|почта/i.test(h)); if (emailIdx < 0) return 'Не найдена колонка «Email»'; const ltk = {}; cols.forEach(c => ltk[c.label.toLowerCase()] = c.key); const colMap = header.map((h, i) => ({ i, key: ltk[h.toLowerCase()] })).filter(x => x.key); let applied = 0; const next = { ...values }; const toSave = []; rows.slice(1).forEach(r => { const email = (r[emailIdx] || '').trim().toLowerCase(); const emp = employees.find(e => (e.email || '').toLowerCase() === email); if (!emp) return; next[emp.user_id] = { ...(next[emp.user_id] || {}) }; colMap.forEach(({ i, key }) => { const v = parseFloat(String(r[i]).replace(',', '.')); if (!isNaN(v)) { next[emp.user_id][key] = String(v); applied++; const col = cols.find(c => c.key === key); if (col?.id) toSave.push({ uid: emp.user_id, col, v }) } }) }); setValues(next); toSave.forEach(({ uid, col }) => setTimeout(() => saveCell(uid, col), 0)); return `Применено значений: ${applied}` }
  const parseText = t => { const d = t.includes('\t') ? '\t' : (t.split(';').length > t.split(',').length ? ';' : ','); return t.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(d)) }
  const fetchGoogle = async () => { const id = (gUrl.match(/\/d\/([\w-]+)/) || [])[1]; if (!id) { showError('Неверная ссылка'); return } try { const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`); const msg = applyRows(parseText(await r.text())); if (msg.startsWith('Применено')) { setTab('table') } else showError(msg) } catch (e) { showError('Не удалось скачать') } }
  const copyTemplate = async () => { const header = ['Email', ...cols.map(c => c.label)]; const ex = ['ivanov@company.ru', ...cols.map(() => '0')]; try { await navigator.clipboard.writeText([header.join('\t'), ex.join('\t')].join('\n')) } catch (e) { showError('Не удалось скопировать') } }

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(1240px, 96vw)', maxHeight: '90vh', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 3 }}><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>

        <div style={{ marginBottom: 4 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Заполнить показатели вручную</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 640 }}>
            Впишите значение и уйдите из поля (клик в сторону или Tab) — сохранится само, без отдельной кнопки. Чтобы поправить — сотрите и впишите другое число, как в обычной таблице.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', margin: '16px 0', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-page)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Способ</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTab('table')} style={{ padding: '7px 15px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: tab === 'table' ? 600 : 400, background: tab === 'table' ? 'rgba(184,134,11,0.1)' : 'var(--bg-card)', border: `1px solid ${tab === 'table' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, color: tab === 'table' ? '#8a6208' : 'var(--text-secondary)' }}>Таблица</button>
              <button onClick={() => setTab('import')} style={{ padding: '7px 15px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: tab === 'import' ? 600 : 400, background: tab === 'import' ? 'rgba(184,134,11,0.1)' : 'var(--bg-card)', border: `1px solid ${tab === 'import' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, color: tab === 'import' ? '#8a6208' : 'var(--text-secondary)' }}>Импорт</button>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Дата записи</div>
            <div style={{ width: 180 }}><DatePicker value={date} onChange={setDate} placeholder="Дата" /></div>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Загружаем показатели и сотрудников…</div>
        ) : tab === 'table' ? (
          <>
            <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', marginRight: 5, verticalAlign: -1 }} />вводите сами — число за этот день</span>
              <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: 'rgba(184,134,11,0.15)', border: '1px solid var(--border-gold)', marginRight: 5, verticalAlign: -1 }} />считает сама система — это формула из соседних колонок, вводить не нужно</span>
              <span style={{ marginLeft: 'auto' }}>Заполнено строк: {filledCount} из {employees.length}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-page)', zIndex: 2 }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500, minWidth: 190, position: 'sticky', left: 0, background: 'var(--bg-page)', zIndex: 3 }}>Сотрудник</th>
                    {cols.map(c => (
                      <th key={c.key} style={{ padding: '10px 8px', minWidth: 110, background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>{c.inverse ? 'меньше = лучше' : (c.unit || '—')}</div>
                      </th>
                    ))}
                    {formulaMetrics.map(m => (
                      <th key={m.id} style={{ padding: '10px 8px', minWidth: 110, background: 'rgba(184,134,11,0.06)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a6208', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name}</div>
                        <div style={{ fontSize: 9, color: '#8a6208', fontWeight: 400 }}>считает система</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => (
                    <tr key={emp.user_id} style={{ background: i % 2 ? 'var(--bg-page)' : 'transparent' }}>
                      <td style={{ padding: '6px 12px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: i % 2 ? 'var(--bg-page)' : 'var(--bg-card)' }}>{empName(emp)}</td>
                      {cols.map(c => {
                        const cellKey = `${emp.user_id}:${c.key}`
                        const st = cellState[cellKey]
                        return (
                          <td key={c.key} style={{ padding: '4px 6px', position: 'relative' }}>
                            <input
                              type="number" step="0.1"
                              value={values[emp.user_id]?.[c.key] ?? ''}
                              onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))}
                              onBlur={() => saveCell(emp.user_id, c)}
                              onKeyDown={ev => { if (ev.key === 'Enter') ev.target.blur() }}
                              className="input-field"
                              style={{ width: '100%', textAlign: 'center', padding: '7px 20px 7px 4px', borderColor: st === 'saved' ? 'rgba(19,122,57,0.4)' : undefined }}
                            />
                            {st === 'saving' && (
                              <span style={{ position: 'absolute', right: 10, top: '50%', marginTop: -6, width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(138,98,8,0.25)', borderTopColor: '#8a6208', animation: 'frmSpin 0.7s linear infinite' }} />
                            )}
                            {st === 'saved' && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', right: 8, top: '50%', marginTop: -6, animation: 'frmPop .3s ease-out' }}>
                                <path d="M5 12.5l4.5 4.5L19 7" stroke="#137a39" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </td>
                        )
                      })}
                      {formulaMetrics.map(m => { const v = computeValue(m, emp.user_id); return (
                        <td key={m.id} style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600, color: v != null ? '#8a6208' : 'var(--text-muted)' }}>{v != null ? v + (m.unit || '') : '—'}</td>
                      )})}
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>Нет сотрудников</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={onClose} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Готово</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, maxWidth: 560 }}>
              Скопируйте шаблон, заполните его в своей таблице (первая колонка — email сотрудника) и вставьте обратно сюда на выбранную выше дату, либо укажите ссылку на опубликованную Google Таблицу.
            </p>
            <button onClick={copyTemplate} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12, marginBottom: 16 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Скопировать шаблон таблицы</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <button onClick={() => setImportTab('paste')} style={{ padding: '7px 15px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: importTab === 'paste' ? 600 : 400, background: importTab === 'paste' ? 'rgba(184,134,11,0.1)' : 'var(--bg-card)', border: `1px solid ${importTab === 'paste' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, color: importTab === 'paste' ? '#8a6208' : 'var(--text-secondary)' }}>Вставить данные</button>
              <button onClick={() => setImportTab('google')} style={{ padding: '7px 15px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: importTab === 'google' ? 600 : 400, background: importTab === 'google' ? 'rgba(184,134,11,0.1)' : 'var(--bg-card)', border: `1px solid ${importTab === 'google' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, color: importTab === 'google' ? '#8a6208' : 'var(--text-secondary)' }}>Ссылка на Google Таблицу</button>
            </div>
            {importTab === 'paste' ? (
              <>
                <textarea className="input-field" style={{ width: '100%' }} rows={8} placeholder={'Email\tКол-во звонков\nivanov@co.ru\t120'} value={pasteText} onChange={e => setPasteText(e.target.value)} />
                <button onClick={() => { const msg = applyRows(parseText(pasteText)); if (msg.startsWith('Применено')) setTab('table'); else showError(msg) }} style={{ ...ghostBtn, marginTop: 10 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Применить к таблице</button>
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
        @keyframes frmPop { 0% { opacity: 0; transform: scale(.4); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
