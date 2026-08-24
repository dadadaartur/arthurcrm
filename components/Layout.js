import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isSuperAdmin as checkIsSuperAdmin, isCompanyAdmin as checkIsCompanyAdmin } from '../lib/permissions'

function StarsBackground() {
  useEffect(() => {
    const container = document.getElementById('real-stars')
    if (!container || container.children.length > 0) return
    const colors = ['#ff4d4d', '#4d79ff', '#ffff66', '#e0f0ff', '#ffb366']
    for (let i = 0; i < 40; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 4 + 1.5
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      star.style.borderRadius = '50%'
      star.style.background = colors[Math.floor(Math.random() * colors.length)]
      star.style.position = 'absolute'
      star.style.left = Math.random() * 100 + '%'
      star.style.top = Math.random() * 100 + '%'
      star.style.boxShadow = `0 0 ${size * 2}px ${star.style.background}`
      star.style.animation = `realTwinkle ${Math.random() * 3 + 3}s infinite alternate`
      star.style.animationDelay = Math.random() * 5 + 's'
      star.style.opacity = '0'
      container.appendChild(star)
    }
  }, [])
  return <div id="real-stars" className="stars-bg" />
}

function NotificationBell() {
  const { user } = useProfile()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [pos, setPos] = useState({ top: 50, right: 20 })
  const btnRef = useRef(null)
  const boxRef = useRef(null)
  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setItems(data || [])
    setUnread((data || []).filter(n => !n.is_read).length)
  }
  useEffect(() => {
    if (!user) return
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [user])
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (boxRef.current && boxRef.current.contains(e.target)) return
      if (btnRef.current && btnRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const markAll = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setUnread(0)
    setItems(p => p.map(n => ({ ...n, is_read: true })))
  }
  const clickItem = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setUnread(u => Math.max(0, u - 1))
      setItems(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }
  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 10, right: Math.max(10, window.innerWidth - rect.right) })
    }
    setOpen(o => !o)
  }
  return (
    <>
      <button ref={btnRef} onClick={toggle} title="Уведомления"
        style={{ position: 'relative', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: open ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', transition: 'all 0.3s ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.45)' }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.7))' }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9999, background: 'linear-gradient(135deg, #FFD700, #c084fc)', color: '#0a1628', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(255,215,0,.7)' }}>{unread}</span>
        )}
      </button>
      {open && createPortal(
        <div ref={boxRef} style={{ position: 'fixed', top: pos.top, right: pos.right, width: 330, maxHeight: 420, overflowY: 'auto', zIndex: 99999, padding: 14, background: 'rgba(12,17,32, 0.97)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 14, boxShadow: '0 16px 50px rgba(0,0,0,0.6), 0 0 24px rgba(255,215,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FFD700', letterSpacing: 1 }}>УВЕДОМЛЕНИЯ</span>
            {items.length > 0 && (
              <button onClick={markAll} style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Прочитать все</button>
            )}
          </div>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#777', textAlign: 'center', padding: '18px 0' }}>Пока нет уведомлений</p>
          ) : (
            items.map(n => (
              <div key={n.id} onClick={() => clickItem(n)}
                style={{ padding: 10, borderRadius: 10, cursor: 'pointer', marginBottom: 6, background: n.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(255,215,0,0.08)', borderLeft: n.is_read ? '2px solid transparent' : '2px solid #FFD700', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.16)'}
                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(255,215,0,0.08)'}>
                <p style={{ fontSize: 13, color: '#eee', margin: 0 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: '#777', margin: '4px 0 0' }}>{new Date(n.created_at).toLocaleString('ru')}</p>
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </>
  )
}

export default function Layout({ children }) {
  const { user, profile, loading } = useProfile()
  const [companyName, setCompanyName] = useState('')
  const [isPlatformStaff, setIsPlatformStaff] = useState(false)
  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return
        fetch('/api/platform-admin/me', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json())
          .then(d => setIsPlatformStaff(!!d.isPlatformStaff))
          .catch(() => {})
      })
    }
    if (profile?.company_id && !companyName) {
      supabase.from('companies').select('name').eq('id', profile.company_id).single()
        .then(({ data: comp }) => { if (comp) setCompanyName(comp.name) })
    }
  }, [user, profile])
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
        <StarsBackground />
        <header className="flex justify-between items-center px-6 py-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-6 w-32 bg-gray-700 rounded-full animate-pulse"> </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-700 rounded-full animate-pulse"> </div>
              <div className="h-6 w-16 bg-gray-700 rounded-full animate-pulse"> </div>
              <div className="h-6 w-14 bg-gray-700 rounded-full animate-pulse"> </div>
              <div className="h-6 w-14 bg-gray-700 rounded-full animate-pulse"> </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-6 w-20 bg-gray-700 rounded-full animate-pulse"> </div>
            <div className="h-6 w-6 bg-gray-700 rounded-full animate-pulse"> </div>
            <div className="h-6 w-12 bg-gray-700 rounded-full animate-pulse"> </div>
          </div>
        </header>
        <main className="flex-grow relative z-10">{children}</main>
      </div>
    )
  }
  const isSuperAdmin = checkIsSuperAdmin(profile)
  const isCompanyAdmin = checkIsCompanyAdmin(profile) || isSuperAdmin
  const companyStatus = profile?.companies?.status
  const isBlockedByModeration = !isSuperAdmin && !isPlatformStaff
    && companyStatus && ['suspended', 'rejected'].includes(companyStatus)
  const isPendingModeration = !isSuperAdmin && !isPlatformStaff && companyStatus === 'pending'
  if (isBlockedByModeration) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'transparent' }}>
        <div className="premium-card max-w-md text-center">
          <h1 className="text-xl font-bold text-red-400 mb-3">
            {companyStatus === 'suspended' ? 'Компания заблокирована' : 'Заявка компании отклонена'}
          </h1>
          <p className="text-gray-400 mb-4">
            {profile.companies.status_reason || 'Обратитесь в поддержку Кармического банка для уточнения деталей.'}
          </p>
          <button onClick={handleLogout} className="btn-outline text-sm px-4 py-2">Выйти</button>
        </div>
      </div>
    )
  }
  if (isPendingModeration) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'transparent' }}>
        <div className="premium-card max-w-md text-center">
          <h1 className="text-xl font-bold text-yellow-400 mb-3">Заявка на модерации</h1>
          <p className="text-gray-400 mb-4">
            Компания «{profile.companies.name}» создана и ожидает проверки администратором Кармического банка.
            Обычно это занимает немного времени — как только заявку одобрят, здесь появится полный доступ.
          </p>
          <button onClick={handleLogout} className="btn-outline text-sm px-4 py-2">Выйти</button>
        </div>
      </div>
    )
  }
  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return (profile.first_name[0] + profile.last_name[0]).toUpperCase()
    }
    if (profile?.display_name) return profile.display_name.substring(0, 2).toUpperCase()
    return user?.email?.substring(0, 2).toUpperCase() || '?'
  }
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      <StarsBackground />
      <header className="flex justify-between items-center px-6 py-2 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="brand-title text-base font-bold">
            Кармический банк
          </Link>
          <nav className="flex gap-2 text-xs font-medium">
            <Link href="/goals" className="action-btn !py-1.5 !px-4 !text-xs">Мои цели</Link>
            {isSuperAdmin && <Link href="/admin" className="action-btn !py-1.5 !px-4 !text-xs">Админ</Link>}
            {isPlatformStaff && (
              <Link href="/platform-admin" className="action-btn !py-1.5 !px-4 !text-xs">Модерация площадки</Link>
            )}
            {isCompanyAdmin && (
              <Link href="/company-admin" className="action-btn !py-1.5 !px-4 !text-xs">Управление</Link>
            )}
            {isCompanyAdmin && (
              <Link href="/company-admin/results" className="action-btn !py-1.5 !px-4 !text-xs">Результаты</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          {companyName && <span className="text-gray-400 text-xs">{companyName}</span>}
          <NotificationBell />
          <Link href="/profile" className="flex items-center gap-2 text-white hover:text-gold transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold">
                {getInitials()}
              </div>
            )}
            <span>{profile?.display_name || user.email}</span>
          </Link>
          <button onClick={handleLogout} className="action-btn !py-1.5 !px-4 !text-xs">Выйти</button>
        </div>
      </header>
      <main className="flex-grow relative z-10">{children}</main>
      <footer className="text-center py-4 text-xs text-gray-500 relative z-10">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
