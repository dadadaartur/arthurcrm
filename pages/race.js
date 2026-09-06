// pages/race.js — Гонка сотрудников (марафон ИИ-аналитика, часть 2,
// 6 сентября 2026). Живой анимированный рейтинг за календарный месяц,
// не статичный список — позиции плавно едут при каждом обновлении
// данных, ширина трека пропорциональна кармикам относительно лидера.
import { useEffect, useState } from 'react'
import BackArrow from '../components/BackArrow'
import LoadingScreen from '../components/LoadingScreen'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'

const PLACE_STYLE = {
  1: { color: '#8a6208', bg: 'linear-gradient(135deg, #fff3d6, #ffe29a)', label: '1 место' },
  2: { color: '#5f6b80', bg: 'linear-gradient(135deg, #f1f3f6, #dfe3e8)', label: '2 место' },
  3: { color: '#a15c2e', bg: 'linear-gradient(135deg, #fbe4d3, #f0c9a8)', label: '3 место' },
}

export default function Race() {
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
    const t = setInterval(load, 30000) // обновление каждые 30с — позиции сами плавно переезжают
    return () => clearInterval(t)
  }, [])

  // Небольшая задержка перед первым проездом дорожек — чтобы анимация
  // выезда была видна при загрузке страницы, не мгновенным появлением.
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t) }, [])

  if (loading) return <LoadingScreen />
  const standings = data?.standings || []
  const maxKarma = Math.max(1, ...standings.map(s => s.karmaEarned))

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <BackArrow href="/" title="Гонка месяца" extra={
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
            До конца цикла: <b style={{ color: 'var(--accent-gold)' }}>{data?.daysLeft ?? '—'} дн.</b>
          </div>
        } />

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 600 }}>
          Позиции — по кармикам, заработанным в этом календарном месяце. 1 числа гонка обнуляется, топ-3 получают приз и право создать до 2 шуточных заданий коллегам.
        </p>

        {data?.myAdvice && (
          <div style={{ padding: '14px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(184,134,11,0.04))', border: '1px solid rgba(124,58,237,0.25)', marginBottom: 24, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: 6 }}>Совет ИИ-аналитика</span>
            {data.myAdvice}
          </div>
        )}

        {data?.myPrivilege && (
          <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(184,134,11,0.06)', border: '1px solid var(--border-gold)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 4,
                      background: s.place <= 3 ? ps.bg.replace('linear-gradient(135deg,', 'linear-gradient(90deg,') : 'linear-gradient(90deg, #0e7490, #7c3aed)',
                      transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)',
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
          {standings.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Пока нет данных за этот месяц</p>}
        </div>
      </div>
    </div>
  )
}
