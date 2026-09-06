import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'

// Каркас мобильного PWA-приложения — по присланному вами референсу:
// герой-шапка с аватаром, FAB-кнопка снизу справа открывает выезжающую
// панель разделов (а не постоянная нижняя навигация, как было раньше),
// внизу — узкая утилитарная полоска с «Выйти» (как в референсе). Каждый
// раздел при выборе в панели ведёт на свою страницу с содержимым —
// контента у нас на разделы существенно больше, чем в референсе, чтобы
// уместить всё в одну карточку-ответ, поэтому берётся сама структура
// взаимодействия (шапка + FAB + панель), а не буквально «весь ответ на
// одной карточке текстом».
const SECTIONS = [
  { group: 'Разделы', items: [
    { key: 'index', label: 'Главная', href: '/app', icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
    { key: 'tasks', label: 'Задания', href: '/app/tasks', icon: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></> },
    { key: 'goals', label: 'Мои цели', href: '/app/goals', icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></> },
    { key: 'shop', label: 'Магазин', href: '/app/shop', icon: <><path d="M6 2l1.5 5h9L18 2" /><path d="M3.5 7h17l-1.5 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /></> },
  ]},
  { group: 'Операции', items: [
    { key: 'transfer', label: 'Перевести коллеге', href: '/app/transfer', icon: <><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" /></> },
    { key: 'history', label: 'История операций', href: '/app/history', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></> },
  ]},
]

function Icon({ children, color = '#fff', size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}

export default function AppShell({ title, active, children }) {
  const router = useRouter()
  const { user, profile, loading } = useProfile()
  const [panelOpen, setPanelOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/app/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) router.replace('/app/login')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    loadNotifications()
    supabase.from('karma_balance').select('balance').eq('user_id', user.id).maybeSingle().then(({ data }) => setBalance(data?.balance ?? 0))
    // Лёгкий поллинг раз в 30с — сотрудник может вернуться в приложение
    // из фона (например, после смены) и должен сразу увидеть свежие
    // начисления в колокольчике, не открывая заново страницу.
    const t = setInterval(loadNotifications, 30000)
    return () => clearInterval(t)
  }, [user])

  const loadNotifications = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.is_read).length)
  }

  const openNotifications = async () => {
    setNotifOpen(o => !o)
    if (!notifOpen && unreadCount > 0) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/app/login'
  }

  const initials = (profile?.first_name?.[0] || profile?.display_name?.[0] || user?.email?.[0] || '?').toUpperCase()

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,215,0,0.2)', borderTopColor: '#FFD700', animation: 'spin 0.8s linear infinite' }} />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1c', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Head>
        <title>{title ? `${title} · Кармический банк` : 'Кармический банк'}</title>
        <link rel="manifest" href="/app-manifest.json" />
        <link rel="apple-touch-icon" href="/app-icons/mobkarma.png" />
        <meta name="theme-color" content="#0a0e1c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>

      {/* Герой-шапка — компактнее, чем в референсе (там она пустая под
          текст), у нас сразу баланс, раз это самое частое, что хотят
          увидеть с телефона */}
      <div style={{ padding: '18px 18px 14px', background: 'linear-gradient(180deg, rgba(255,215,0,0.08) 0%, rgba(10,14,28,0) 100%)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#FFD700' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.display_name || user.email}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>{balance !== null ? `${balance} кармиков` : '···'}</div>
          </div>
          <button onClick={openNotifications} style={{ position: 'relative', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', flexShrink: 0 }}>
            <Icon><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Icon>
            {unreadCount > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: '50%', background: '#FFD700', boxShadow: '0 0 6px rgba(255,215,0,0.8)', animation: 'pulseGlow 2s ease-in-out infinite' }} />}
          </button>
        </div>
      </div>

      {notifOpen && (
        <>
          <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 29 }} />
          <div style={{ position: 'fixed', top: 76, right: 12, left: 12, maxHeight: '60vh', overflowY: 'auto', background: '#151a2e', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.5)', zIndex: 30 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#777', fontSize: 13 }}>Пока пусто</div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#eee', lineHeight: 1.4 }}>
                {n.message}
                <div style={{ fontSize: 10, color: '#777', marginTop: 4 }}>{new Date(n.created_at).toLocaleString('ru')}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <main style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        {title && <h1 style={{ fontSize: 15, fontWeight: 600, color: '#aaa', margin: '0 0 12px' }}>{title}</h1>}
        {children}
      </main>

      {/* FAB + выезжающая панель разделов — паттерн из референса, вместо
          постоянной нижней навигации */}
      {panelOpen && <div onClick={() => setPanelOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 39 }} />}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, background: 'rgba(16,20,36,0.98)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px 20px 0 0', padding: '10px 16px 16px',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.4)', zIndex: 40, maxHeight: '72vh', overflowY: 'auto',
        transform: panelOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)'
      }}>
        {SECTIONS.map(sec => (
          <div key={sec.group}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#666', margin: '10px 4px 6px' }}>{sec.group}</div>
            {sec.items.map(it => (
              <button key={it.key} onClick={() => { setPanelOpen(false); router.push(it.href) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 14, marginBottom: 6, background: active === it.key ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active === it.key ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.08)'}`, color: '#fff', textAlign: 'left' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon color={active === it.key ? '#FFD700' : '#ccc'} size={18}>{it.icon}</Icon>
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{it.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <button onClick={() => setPanelOpen(o => !o)} style={{
        position: 'fixed', bottom: 74, right: 18, width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #FFD700, #f0b900)', color: '#0a0e1c', border: 'none',
        boxShadow: '0 8px 22px rgba(255,215,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 41, transition: 'transform 0.2s', transform: panelOpen ? 'rotate(45deg)' : 'none'
      }}>
        <Icon color="#0a0e1c" size={26}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>
      </button>

      {/* Узкая утилитарная полоска снизу — как в референсе */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,14,28,0.9)', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.push('/app')} style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
          <Icon color="#888" size={16}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>
          Главная
        </button>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
          <Icon color="#888" size={16}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>
          Выйти
        </button>
      </div>

      <style jsx global>{`
        @keyframes pulseGlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        html, body { overscroll-behavior-y: contain; }
      `}</style>
    </div>
  )
}
