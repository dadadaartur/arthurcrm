import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'

const TABS = [
  { key: 'index', label: 'Главная', href: '/app', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { key: 'tasks', label: 'Задания', href: '/app/tasks', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> },
  { key: 'shop', label: 'Магазин', href: '/app/shop', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2l1.5 5h9L18 2" /><path d="M3.5 7h17l-1.5 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /></svg> },
  { key: 'goals', label: 'Цели', href: '/app/goals', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg> },
]

// Общий каркас мобильного PWA-приложения (п.2-5 фидбека от 28 августа
// 2026) — отдельный от десктопной платформы, установлен на скрытом
// scope /app (см. public/app-manifest.json, public/app/sw.js). Каждая
// страница /app/* оборачивается этим компонентом вместо десктопного
// Layout (см. pages/_app.js — раздел /app исключён из общего каркаса).
export default function AppShell({ title, active, children }) {
  const router = useRouter()
  const { user, profile, loading } = useProfile()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

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
    <div style={{ minHeight: '100vh', background: '#0a0e1c', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Head>
        <title>{title ? `${title} · Кармический банк` : 'Кармический банк'}</title>
        <link rel="manifest" href="/app-manifest.json" />
        <link rel="apple-touch-icon" href="/app-icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0a0e1c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, position: 'sticky', top: 0, background: 'rgba(10,14,28,0.92)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#FFD700' }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.display_name || user.email}
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>{title}</div>
        </div>
        <button onClick={openNotifications} style={{ position: 'relative', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: '50%', background: '#FFD700', boxShadow: '0 0 6px rgba(255,215,0,0.8)', animation: 'pulseGlow 2s ease-in-out infinite' }} />
          )}
        </button>
      </header>

      {notifOpen && (
        <>
          <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 19 }} />
          <div style={{ position: 'fixed', top: 66, right: 12, left: 12, maxHeight: '60vh', overflowY: 'auto', background: '#151a2e', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.5)', zIndex: 20 }}>
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

      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 90px' }}>
        {children}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: 'rgba(10,14,28,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 10 }}>
        {TABS.map(t => {
          const isActive = active === t.key
          const color = isActive ? '#FFD700' : '#777'
          return (
            <Link key={t.key} href={t.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 0 8px', color, textDecoration: 'none' }}>
              {t.icon(color)}
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
            </Link>
          )
        })}
      </nav>

      <style jsx global>{`
        @keyframes pulseGlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        html, body { overscroll-behavior-y: contain; }
      `}</style>
    </div>
  )
}
