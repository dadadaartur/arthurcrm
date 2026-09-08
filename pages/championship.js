// pages/championship.js — «Чемпионат менеджеров» (по фидбеку от
// 6 сентября 2026) — единый раздел вместо отдельной кнопки «Гонка
// месяца», ломавшей раскладку блока энергии/баланса на главной.
// Вкладки: общий рейтинг, живая гонка месяца, лига и кубок (раздел 2).
import { useEffect, useState } from 'react'
import BackArrow from '../components/BackArrow'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'

const PLACE_STYLE = {
  1: { color: '#d97706', bg: 'linear-gradient(135deg, #fff3d6, #ffe29a)' },
  2: { color: '#5f6b80', bg: 'linear-gradient(135deg, #f1f3f6, #dfe3e8)' },
  3: { color: '#a15c2e', bg: 'linear-gradient(135deg, #fbe4d3, #f0c9a8)' },
}

function Seg({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12.5, fontWeight: 600, padding: '8px 18px', borderRadius: 50, cursor: 'pointer',
      border: `1px solid ${active ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
      background: active ? 'rgba(217,119,6,0.08)' : 'var(--bg-card)', color: active ? '#d97706' : 'var(--text-secondary)',
    }}>{children}</button>
  )
}

function RaceTab() {
  const { user } = useProfile()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/race-standings', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setData(await r.json())
      setLoading(false)
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t) }, [])
  if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Загружаем гонку…</p>
  const standings = data?.standings || []
  const maxKarma = Math.max(1, ...standings.map(s => s.karmaEarned))
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 620 }}>
        Позиции — по кармикам, заработанным в этом календарном месяце. 1 числа гонка обнуляется, топ-3 получают приз и право создать до 2 шуточных заданий коллегам. До конца цикла: <b style={{ color: 'var(--accent-gold)' }}>{data?.daysLeft ?? '—'} дн.</b>
      </p>
      {data?.myAdvice && (
        <div style={{ padding: '14px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(217,119,6,0.04))', border: '1px solid rgba(124,58,237,0.25)', marginBottom: 24, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: 6 }}>Совет ИИ-аналитика</span>
          {data.myAdvice}
        </div>
      )}
      {data?.myPrivilege && (
        <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(217,119,6,0.06)', border: '1px solid var(--border-gold)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            Вы заняли <b>{data.myPrivilege.rank}</b> место в прошлом цикле — доступно шуточных заданий: <b>{data.myPrivilege.jokeTasksLimit - data.myPrivilege.jokeTasksUsed}</b> из {data.myPrivilege.jokeTasksLimit}
          </span>
          {data.myPrivilege.jokeTasksUsed < data.myPrivilege.jokeTasksLimit && (
            <a href="/race/create-joke-task" style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 10, background: 'var(--accent-gold)', color: '#fff', textDecoration: 'none' }}>Создать шуточное задание</a>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {standings.map(s => {
          const isMe = s.userId === user?.id
          const pct = mounted ? Math.max(4, (s.karmaEarned / maxKarma) * 100) : 0
          const ps = PLACE_STYLE[s.place]
          return (
            <div key={s.userId} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 26, textAlign: 'center', fontSize: 13, fontWeight: 700, color: ps?.color || 'var(--text-muted)', flexShrink: 0 }}>{s.place}</div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: ps?.bg || 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isMe ? '2px solid #7c3aed' : '1px solid var(--border-subtle)' }}>
                {s.avatarUrl ? <img src={s.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: ps?.color || 'var(--text-secondary)' }}>{s.name.charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: isMe ? '#7c3aed' : 'var(--text-primary)', fontWeight: isMe ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}{isMe && ' (вы)'}</span>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 700, flexShrink: 0 }}>{s.karmaEarned}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-page)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: s.place <= 3 ? ps.bg.replace('linear-gradient(135deg,', 'linear-gradient(90deg,') : 'linear-gradient(90deg, #0e7490, #7c3aed)', transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
              </div>
            </div>
          )
        })}
        {standings.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Пока нет данных за этот месяц</p>}
      </div>
    </div>
  )
}

function LeagueTab() {
  const { user } = useProfile()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/league-standings', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setData(await r.json())
      setLoading(false)
    }
    load()
  }, [])
  if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Загружаем лигу…</p>
  const standings = data?.standings || []
  const QUARTER_ROMAN = { 3: 'I', 6: 'II', 9: 'III', 12: 'IV' }
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 620 }}>
        Регулярная таблица за весь {data?.season?.year} год — счёт не обнуляется в течение сезона. Промежуточные призы — по итогам каждого квартала, финальный итог — в конце года.
        {data?.daysToCheckpoint != null && <> До ближайшего подведения итогов: <b style={{ color: 'var(--accent-gold)' }}>{data.daysToCheckpoint} дн.</b></>}
      </p>
      {data?.checkpointAwards?.length > 0 && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 14, background: 'rgba(217,119,6,0.05)', border: '1px solid var(--border-gold)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 10 }}>История промежуточных призов</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.checkpointAwards.map(a => (
              <div key={a.id} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {QUARTER_ROMAN[a.checkpoint_month] || a.checkpoint_month} квартал — <b style={{ color: 'var(--text-primary)' }}>{a.rank} место: {a.userName}</b> ({a.karma_at_checkpoint} кармиков)
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {standings.map(s => {
          const isMe = s.userId === user?.id
          return (
            <div key={s.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: isMe ? 'rgba(124,58,237,0.06)' : 'var(--bg-card)', border: isMe ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--border-subtle)' }}>
              <div style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 700, color: s.place <= 3 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{s.place}</div>
              <span style={{ flex: 1, fontSize: 13, color: isMe ? '#7c3aed' : 'var(--text-primary)', fontWeight: isMe ? 700 : 500 }}>{s.name}{isMe && ' (вы)'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-gold)' }}>{s.karmaEarned}</span>
            </div>
          )
        })}
        {standings.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Пока нет данных за этот сезон</p>}
      </div>
    </div>
  )
}

function CupTab() {
  const { user, profile } = useProfile()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ title: 'Кубок месяца', bracketSize: 8, roundDurationDays: 7, selected: new Set() })
  const [saving, setSaving] = useState(false)
  const isAdmin = profile?.is_company_admin

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    const h = await auth()
    const r = await fetch('/api/cup-view', { headers: h })
    if (r.ok) setData(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!showCreate) return
    auth().then(h => fetch('/api/company-admin/cup/manage', { headers: h }).then(r => r.json()).then(d => setEmployees(d.employees || [])))
  }, [showCreate])

  const toggleEmp = (id) => setForm(f => { const n = new Set(f.selected); n.has(id) ? n.delete(id) : n.add(id); return { ...f, selected: n } })
  const create = async () => {
    setSaving(true)
    const h = await auth()
    const r = await fetch('/api/company-admin/cup/manage', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, bracketSize: form.bracketSize, roundDurationDays: form.roundDurationDays, participantIds: [...form.selected] }) })
    setSaving(false)
    const d = await r.json()
    if (r.ok) { setShowCreate(false); load() } else alert(d.error)
  }

  if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Загружаем кубок…</p>

  if (!data?.tournament) {
    return (
      <div>
        {!showCreate ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 50, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: isAdmin ? 16 : 0 }}>Сейчас нет активного турнира.</p>
            {isAdmin && <button onClick={() => setShowCreate(true)} className="btn-glass" style={{ padding: '10px 22px', fontSize: 13 }}>Создать кубок</button>}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Новый турнир</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Название</label>
                <input className="input-field" style={{ width: '100%' }} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Размер сетки</label>
                  <select className="input-field" value={form.bracketSize} onChange={e => setForm({ ...form, bracketSize: Number(e.target.value) })}>
                    {[4, 8, 16, 32].map(n => <option key={n} value={n}>{n} мест</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Раунд, дней</label>
                  <input type="number" min="1" className="input-field" style={{ width: 100 }} value={form.roundDurationDays} onChange={e => setForm({ ...form, roundDurationDays: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Участники ({form.selected.size} / {form.bracketSize})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto', padding: 10, borderRadius: 10, background: 'var(--bg-page)' }}>
                  {employees.map(e => {
                    const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
                    const checked = form.selected.has(e.user_id)
                    return (
                      <label key={e.user_id} onClick={() => toggleEmp(e.user_id)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', background: checked ? 'rgba(217,119,6,0.1)' : 'var(--bg-card)', border: `1px solid ${checked ? 'var(--border-gold)' : 'var(--border-subtle)'}`, color: checked ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{name}</label>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowCreate(false)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
                <button onClick={create} disabled={saving || form.selected.size < 2} className="btn-glass" style={{ flex: 1 }}>{saving ? 'Создаём…' : 'Запустить турнир'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const { tournament, matches, daysLeftInRound } = data
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  const roundLabel = (r, total) => { const left = total - r + 1; return left === 1 ? 'Финал' : left === 2 ? 'Полуфинал' : left === 3 ? 'Четвертьфинал' : `Раунд ${r}` }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{tournament.title}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {tournament.status === 'completed' ? 'Турнир завершён' : `Раунд ${tournament.current_round} · до итогов раунда: ${daysLeftInRound} дн.`}
          </p>
        </div>
        {isAdmin && tournament.status === 'active' && (
          <button onClick={async () => { if (!confirm('Отменить турнир?')) return; const h = await auth(); await fetch('/api/company-admin/cup/manage', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tournament.id }) }); load() }}
            className="btn-glass-outline" style={{ padding: '7px 16px', fontSize: 11.5 }}>Отменить турнир</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
        {rounds.map(r => (
          <div key={r} style={{ minWidth: 220, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 10, textAlign: 'center' }}>{roundLabel(r, rounds[rounds.length - 1])}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {matches.filter(m => m.round === r).map(m => (
                <div key={m.id} style={{ borderRadius: 12, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden', border: m.status === 'active' ? '1px solid var(--border-gold)' : '1px solid var(--border-subtle)' }}>
                  {[{ id: m.participant_a, name: m.nameA, score: m.score_a }, { id: m.participant_b, name: m.nameB, score: m.score_b }].map((p, pi) => (
                    <div key={pi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: m.winner_id && p.id === m.winner_id ? 'rgba(19,122,57,0.08)' : 'transparent', borderBottom: pi === 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span style={{ fontSize: 12, color: p.id === user?.id ? '#7c3aed' : 'var(--text-primary)', fontWeight: p.id === user?.id || (m.winner_id && p.id === m.winner_id) ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      {p.score != null && <span style={{ fontSize: 12, fontWeight: 700, color: m.winner_id && p.id === m.winner_id ? '#137a39' : 'var(--text-muted)' }}>{p.score}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OverallTab() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { setLoading(false); return }
      const res = await fetch('/api/leaderboard', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) setLeaders(await res.json())
      setLoading(false)
    }
    load()
  }, [])
  if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Загружаем рейтинг…</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Общий баланс кармиков за всё время — без обнуления по циклам.</p>
      {leaders.map((l, i) => (
        <div key={l.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 700, color: PLACE_STYLE[i + 1]?.color || 'var(--text-muted)' }}>{i + 1}</div>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{l.name || l.display_name}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-gold)' }}>{l.balance ?? l.karma ?? 0}</span>
        </div>
      ))}
      {leaders.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Пока нет данных</p>}
    </div>
  )
}

export default function Championship() {
  const [tab, setTab] = useState('race')
  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <BackArrow href="/" title="Чемпионат менеджеров" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <Seg active={tab === 'race'} onClick={() => setTab('race')}>Гонка месяца</Seg>
          <Seg active={tab === 'overall'} onClick={() => setTab('overall')}>Общий рейтинг</Seg>
          <Seg active={tab === 'league'} onClick={() => setTab('league')}>Лига</Seg>
          <Seg active={tab === 'cup'} onClick={() => setTab('cup')}>Кубок</Seg>
        </div>
        {tab === 'race' && <RaceTab />}
        {tab === 'overall' && <OverallTab />}
        {tab === 'league' && <LeagueTab />}
        {tab === 'cup' && <CupTab />}
      </div>
    </div>
  )
}
