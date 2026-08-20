import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'
import { bandFor, BAND_RANK, BAND_LABELS, BAND_COLORS } from '../../lib/kpi'

const PALETTE = ['#FFD700', '#a0e9ff', '#c084fc', '#4ade80', '#fda4af', '#f87171', '#e2e8f0', '#86efac', '#60a5fa', '#f97316']
const toISO = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 18px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

function AnalyticsAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [employees, setEmployees] = useState([])
  const [entries, setEntries] = useState([])
  const [range, setRange] = useState(() => { const t = new Date(), f = new Date(); f.setDate(f.getDate() - 29); return { from: toISO(f), to: toISO(t) } })
  const [selId, setSelId] = useState(null)
  const [fillOpen, setFillOpen] = useState(false)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    setLoading(true)
    const h = await auth()
    const p = new URLSearchParams(); if (range.from) p.set('from', range.from); if (range.to) p.set('to', range.to)
    const r = await fetch(`/api/kpi/analytics?${p}`, { headers: h })
    if (r.ok) { const d = await r.json(); setMetrics(d.metrics); setEmployees(d.employees); setEntries(d.entries); if (!selId && d.metrics[0]) setSelId(d.metrics[0].id) }
    setLoading(false)
  }
  useEffect(() => { load() }, [range])

  const empName = id => { const e = employees.find(x => x.user_id === id); return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—' }
  const m = metrics.find(x => x.id === selId) || metrics[0]

  if (loading || !m) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  const mEntries = entries.filter(e => e.metric_id === m.id)
  const dates = [...new Set(mEntries.map(e => e.entry_date))].sort()
  const maxVal = Math.max(Number(m.thr_ultra) || 0, ...mEntries.map(e => Number(e.value) || 0)) * 1.15 || 1

  // Сводка по порогам (последнее значение каждого сотрудника)
  const perEmp = employees.map((emp, i) => {
    const list = mEntries.filter(e => e.user_id === emp.user_id)
    const last = list[list.length - 1]
    const band = last ? bandFor(last.value, m) : null
    const avg = list.length ? list.reduce((s, e) => s + Number(e.value), 0) / list.length : 0
    return { emp, color: PALETTE[i % PALETTE.length], last, band, avg, list }
  })
  const below = perEmp.filter(p => p.last && p.band === 'none')
  const topPlus = perEmp.filter(p => p.band === 'top' || p.band === 'ultra')

  // График: линия на сотрудника + линии порогов
  const W = 760, H = 240, PL = 44, PB = 26
  const y = v => H - PB - (Number(v) / maxVal) * (H - PB - 12)
  const x = i => PL + (i / Math.max(1, dates.length - 1)) * (W - PL - 10)

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Аналитика показателей" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 260 }}><DateRangePicker from={range.from} to={range.to} onChange={setRange} /></div>
            <button onClick={() => setFillOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Заполнить показатели</button>
          </div>
        } />

        {/* Выбор показателя */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {metrics.map(mm => (
            <button key={mm.id} onClick={() => setSelId(mm.id)} style={{
              padding: '10px 18px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              background: mm.id === m.id ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${mm.id === m.id ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.1)'}`,
              color: mm.id === m.id ? '#FFD700' : '#ccc', transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{mm.name}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>ультра ≥ {mm.thr_ultra}{mm.unit}</div>
            </button>
          ))}
        </div>

        {/* Сводка */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: '1px solid rgba(74,222,128,0.25)' }}>
            <div style={{ fontSize: 11, color: '#888' }}>На «топ» и «ультра»</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#4ade80' }}>{topPlus.length}</div>
          </div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: `1px solid ${below.length ? 'rgba(244,67,54,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
            <div style={{ fontSize: 11, color: '#888' }}>Ниже порога — тревога</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: below.length ? '#f87171' : '#4ade80' }}>{below.length}</div>
            {below.length > 0 && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{below.map(b => empName(b.emp.user_id)).slice(0, 3).join(', ')}</div>}
          </div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: '1px solid rgba(160,233,255,0.2)' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Среднее за период</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#a0e9ff' }}>{(mEntries.length ? mEntries.reduce((s, e) => s + Number(e.value), 0) / mEntries.length : 0).toFixed(1)}{m.unit}</div>
          </div>
          <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,215,0,0.2)' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Пороги</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {['min', 'mid', 'top', 'ultra'].map(b => <span key={b} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${BAND_COLORS[b]}12`, color: BAND_COLORS[b], border: `1px solid ${BAND_COLORS[b]}33` }}>{BAND_LABELS[b]} {m['thr_' + b]}</span>)}
            </div>
          </div>
        </div>

        {/* График динамики */}
        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Динамика «{m.name}» по сотрудникам</h4>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
            {['min', 'mid', 'top', 'ultra'].map(b => (
              <g key={b}>
                <line x1={PL} x2={W - 10} y1={y(m['thr_' + b])} y2={y(m['thr_' + b])} stroke={BAND_COLORS[b]} strokeOpacity="0.35" strokeDasharray="4 4" />
                <text x={W - 12} y={y(m['thr_' + b]) - 3} fill={BAND_COLORS[b]} fontSize="9" textAnchor="end">{BAND_LABELS[b]} {m['thr_' + b]}</text>
              </g>
            ))}
            {dates.map((d, i) => (i % Math.ceil(dates.length / 6) === 0) && (
              <text key={d} x={x(i)} y={H - 8} fill="#666" fontSize="9" textAnchor="middle">{d.slice(8)}.{d.slice(5, 7)}</text>
            ))}
            {perEmp.filter(p => p.list.length > 0).map(p => (
              <polyline key={p.emp.user_id} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round"
                points={p.list.map(e => `${x(dates.indexOf(e.entry_date))},${y(e.value)}`).join(' ')} />
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
            {perEmp.map(p => (
              <span key={p.emp.user_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#aaa' }}>
                <span style={{ width: 10, height: 3, background: p.color, borderRadius: 2 }} />{empName(p.emp.user_id)}
              </span>
            ))}
          </div>
        </div>

        {/* Таблица по сотрудникам */}
        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Сотрудник</th>
              <th style={{ padding: 8 }}>Последнее значение</th>
              <th style={{ padding: 8 }}>Уровень</th>
              <th style={{ padding: 8 }}>Среднее за период</th>
              <th style={{ padding: 8 }}>Записей</th>
            </tr></thead>
            <tbody>
              {perEmp.map(p => (
                <tr key={p.emp.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: p.band === 'none' && p.last ? 'rgba(244,67,54,0.06)' : 'transparent' }}>
                  <td style={{ padding: 8, color: '#fff' }}>{empName(p.emp.user_id)}</td>
                  <td style={{ padding: 8, textAlign: 'center', color: '#fff', fontWeight: 600 }}>{p.last ? `${p.last.value}${m.unit}` : '—'}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    {p.band ? <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${BAND_COLORS[p.band]}18`, color: BAND_COLORS[p.band], border: `1px solid ${BAND_COLORS[p.band]}44` }}>{BAND_LABELS[p.band]}</span> : <span style={{ color: '#555' }}>нет данных</span>}
                    {p.band === 'none' && <span style={{ marginLeft: 6, color: '#f87171', fontWeight: 700 }}>!</span>}
                  </td>
                  <td style={{ padding: 8, textAlign: 'center', color: '#a0e9ff' }}>{p.avg.toFixed(1)}{m.unit}</td>
                  <td style={{ padding: 8, textAlign: 'center', color: '#888' }}>{p.list.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FillModal open={fillOpen} onClose={() => setFillOpen(false)} metrics={metrics} employees={employees} onSaved={() => { load() }} />
    </div>
  )
}

// ===== Аккуратная таблица заполнения + импорт с явной датой =====
function FillModal({ open, onClose, metrics, employees, onSaved }) {
  const { showSuccess, showError } = useFeedback()
  const [fillMode, setFillMode] = useState('day')
  const [date, setDate] = useState(toISO(new Date()))
  const [range, setRange] = useState({ from: '', to: '' })
  const [values, setValues] = useState({})
  const [importOpen, setImportOpen] = useState(false)
  const [importTab, setImportTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [gUrl, setGUrl] = useState('')
  if (!open) return null

  const pool = (() => { const p = {}; metrics.forEach(x => (x.inputs || []).forEach(i => { p[i.key] = i })); return Object.values(p) })()
  const directCols = metrics.filter(mm => !mm.formula).map(mm => ({ key: 'm' + mm.id, label: mm.name, unit: mm.unit, inverse: mm.kpi_type === 'inverse' }))
  const cols = [...pool.map(c => ({ ...c, inverse: false })), ...directCols]
  const formulaMetrics = metrics.filter(mm => mm.formula)
  const gridTemplate = `180px repeat(${cols.length}, 96px) repeat(${formulaMetrics.length}, 100px)`
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const datesInRange = () => { if (!range.from || !range.to) return []; const out = [], d = new Date(range.from + 'T00:00:00'), end = new Date(range.to + 'T00:00:00'); while (d <= end) { out.push(toISO(d)); d.setDate(d.getDate() + 1) } return out }
  const computeValue = (mm, uid) => {
    if (mm.formula) { const den = Number(values[uid]?.[mm.formula.den]) || 0, num = Number(values[uid]?.[mm.formula.num]) || 0; return den > 0 ? Math.round((num / den) * (mm.formula.mult || 100) * 10) / 10 : null }
    const v = values[uid]?.['m' + mm.id]; return v === '' || v == null ? null : Number(v)
  }
  const save = async () => {
    const dates = fillMode === 'day' ? (date ? [date] : []) : datesInRange()
    if (!dates.length) { showError(fillMode === 'day' ? 'Выберите дату' : 'Выберите период'); return }
    const { data: { session } } = await supabase.auth.getSession()
    const entries = []
    employees.forEach(emp => metrics.forEach(mm => { const raw = computeValue(mm, emp.user_id); if (raw == null) return; const perDay = dates.length > 1 ? Math.round((raw / dates.length) * 10) / 10 : raw; dates.forEach(d => entries.push({ metricId: mm.id, userId: emp.user_id, value: perDay, date: d })) }))
    if (!entries.length) { showError('Нет заполненных значений'); return }
    const res = await fetch('/api/company-admin/kpi/entries-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ entries }) })
    if (res.ok) { showSuccess(`Сохранено: ${entries.length} записей`); onClose(); onSaved() } else showError('Ошибка сохранения')
  }
  const applyRows = rows => { if (!rows?.length) return 'Пустые данные'; const header = rows[0].map(h => (h || '').trim()); const emailIdx = header.findIndex(h => /email|почта/i.test(h)); if (emailIdx < 0) return 'Не найдена колонка «Email»'; const ltk = {}; cols.forEach(c => ltk[c.label.toLowerCase()] = c.key); const colMap = header.map((h, i) => ({ i, key: ltk[h.toLowerCase()] })).filter(x => x.key); let applied = 0; const next = { ...values }; rows.slice(1).forEach(r => { const email = (r[emailIdx] || '').trim().toLowerCase(); const emp = employees.find(e => (e.email || '').toLowerCase() === email); if (!emp) return; next[emp.user_id] = { ...(next[emp.user_id] || {}) }; colMap.forEach(({ i, key }) => { const v = parseFloat(String(r[i]).replace(',', '.')); if (!isNaN(v)) { next[emp.user_id][key] = v; applied++ } }) }); setValues(next); return `Применено значений: ${applied}` }
  const parseText = t => { const d = t.includes('\t') ? '\t' : (t.split(';').length > t.split(',').length ? ';' : ','); return t.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(d)) }
  const fetchGoogle = async () => { const id = (gUrl.match(/\/d\/([\w-]+)/) || [])[1]; if (!id) { showError('Неверная ссылка'); return } try { const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`); const msg = applyRows(parseText(await r.text())); if (msg.startsWith('Применено')) showSuccess(msg); else showError(msg) } catch (e) { showError('Не удалось скачать') } }
  const copyTemplate = async () => { const header = ['Email', ...cols.map(c => c.label)]; const ex = ['ivanov@company.ru', ...cols.map(() => '0')]; try { await navigator.clipboard.writeText([header.join('\t'), ex.join('\t')].join('\n')); showSuccess('Шаблон скопирован — вставьте Ctrl+V') } catch (e) { showError('Не удалось') } }

  const dateBanner = fillMode === 'day'
    ? `Цифры будут записаны за дату: ${date || '—'}`
    : `Цифры будут распределены по дням периода: ${range.from || '—'} … ${range.to || '—'}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(1240px, 96vw)', height: '88vh', background: 'linear-gradient(150deg, rgba(24,30,54,0.98), rgba(10,14,28,0.99))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: '#fff' }}>Заполнить показатели</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <SegBtn active={fillMode === 'day'} onClick={() => setFillMode('day')}>За день</SegBtn>
            <SegBtn active={fillMode === 'period'} onClick={() => setFillMode('period')}>За период</SegBtn>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {fillMode === 'day' ? <div style={{ width: 170 }}><DatePicker value={date} onChange={setDate} placeholder="Дата" /></div> : <DateRangePicker from={range.from} to={range.to} onChange={setRange} />}
            <button onClick={() => setImportOpen(true)} style={{ ...ghostBtn, borderColor: 'rgba(160,233,255,0.4)', color: '#a0e9ff' }}>Импорт</button>
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', fontSize: 12, marginBottom: 12 }}>{dateBanner}</div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ width: 'fit-content', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 6, marginBottom: 6, position: 'sticky', top: 0, background: 'rgba(10,14,28,0.98)', padding: '6px 0', zIndex: 2 }}>
              <div style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>Сотрудник</div>
              {cols.map(c => (
                <div key={c.key} style={{ textAlign: 'center', padding: '4px 4px', borderRadius: 8, background: c.inverse ? 'rgba(160,233,255,0.06)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, color: '#a0e9ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</div>
                  <div style={{ fontSize: 9, color: '#666' }}>{c.inverse ? 'меньше=лучше' : (c.unit || '')}</div>
                </div>
              ))}
              {formulaMetrics.map(mm => (
                <div key={mm.id} style={{ textAlign: 'center', padding: '4px 4px', borderRadius: 8, background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>
                  <div style={{ fontSize: 10, color: '#FFD700', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mm.name}</div>
                  <div style={{ fontSize: 9, color: '#666' }}>авто</div>
                </div>
              ))}
            </div>
            {employees.map(emp => (
              <div key={emp.user_id} style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 170 }} title={empName(emp)}>{empName(emp)}</div>
                {cols.map(c => (
                  <input key={c.key} type="number" step="0.1" value={values[emp.user_id]?.[c.key] ?? ''}
                    onChange={ev => setValues(v => ({ ...v, [emp.user_id]: { ...v[emp.user_id], [c.key]: ev.target.value } }))}
                    className="input-field" style={{ width: '100%', textAlign: 'center', padding: '8px 2px' }} />
                ))}
                {formulaMetrics.map(mm => { const v = computeValue(mm, emp.user_id); return <div key={mm.id} style={{ fontSize: 12, color: v != null ? '#FFD700' : '#555', fontWeight: 600, textAlign: 'center' }}>{v != null ? v + mm.unit : '—'}</div> })}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={onClose} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
          <button onClick={save} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
        </div>

        {importOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
            <div style={{ width: 560, background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 16, padding: 22, position: 'relative' }}>
              <button onClick={() => setImportOpen(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
              <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 10px', color: '#fff' }}>Импорт из таблицы</h4>
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', fontSize: 11, marginBottom: 12 }}>{dateBanner}</div>
              <button onClick={copyTemplate} style={{ ...ghostBtn, padding: '7px 14px', fontSize: 11, marginBottom: 12 }}>Шаблон</button>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><SegBtn active={importTab === 'paste'} onClick={() => setImportTab('paste')}>Вставить</SegBtn><SegBtn active={importTab === 'google'} onClick={() => setImportTab('google')}>Ссылка</SegBtn></div>
              {importTab === 'paste' ? (<>
                <textarea className="input-field" style={{ width: '100%' }} rows={6} placeholder={'Email\tКол-во звонков\nivanov@co.ru\t120'} value={pasteText} onChange={e => setPasteText(e.target.value)} />
                <button onClick={() => { const msg = applyRows(parseText(pasteText)); if (msg.startsWith('Применено')) { showSuccess(msg); setImportOpen(false) } else showError(msg) }} style={{ ...ghostBtn, marginTop: 10 }}>Применить</button>
              </>) : (<>
                <input className="input-field" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…" value={gUrl} onChange={e => setGUrl(e.target.value)} />
                <button onClick={fetchGoogle} style={{ ...ghostBtn, marginTop: 10 }}>Забрать данные</button>
              </>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
const SegBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 11, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.1)'}`, color: active ? '#FFD700' : '#999' }}>{children}</button>
)
export default withAuth(AnalyticsAdmin, { permission: 'can_review_tasks' })
