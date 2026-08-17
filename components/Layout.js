import Link from 'next/link'
import { useEffect, useState } from 'react'
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

// ============ КОЛОКОЛЬЧИК (встроен прямо в Layout) ============
function NotificationBell() {
  const { user } = useProfile()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const d = await res.json()
        setItems(d.notifications || [])
        setUnread(d.unreadCount || 0)
      }
    } catch (e) {}
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  const markAll = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      }
    })
    setUnread(0)
    setItems(p => p.map(n => ({ ...n, read: true })))
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next && unread > 0) markAll()
        }}
        className="action-btn !py-1.5 !px-3"
        style={{ position: 'relative', cursor: 'pointer', color: '#fff' }}
        title="Уведомления"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #FFD700, #f97316)',
            color: '#0a1628', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px rgba(255,215,0,.7)'
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div className="premium-card" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320, maxHeight: 380, overflowY: 'auto', zIndex: 60, padding: 14,
          background: 'rgba(15,20,35,0.98)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Уведомления</span>
            {items.length > 0 && (
              <button onClick={markAll} style={{
                fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer'
              }}>
                Прочитать все
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#777', textAlign: 'center', padding: '14px 0' }}>
              Нет уведомлений
            </p>
          ) : (
            items.map(n => (
              <div
                key={n.id}
                onClick={() => { if (n.link) router.push(n.link); setOpen(false) }}
                style={{
                  padding: 10, borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                  background: n.read ? 'rgba(255,255,255,0.03)' : 'rgba(255,215,0,0.08)',
                  borderLeft: n.read ? '2px solid transparent' : '2px solid #FFD700',
                }}
              >
                <p style={{ fontSize: 13, color: '#eee', margin: 0 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: '#777', margin: '4px 0 0' }}>
                  {new Date(n.created_at).toLocaleString('ru')}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }) {
  const { user, profile, loading } = useProfile()
  const [companyName, setCompanyName] = useState('')
  const [crmUrl, setCrmUrl] = useState('#')
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

      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.access_token || !session?.refresh_token) return
        try {
          const res = await fetch('/api/crm-handoff/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              accessToken: session.access_token,
              refreshToken: session.refresh_token
            })
          })
          if (!res.ok) return
          const { code } = await res.json()
          setCrmUrl(`https://summercrm-git-main-dadadaarturs-projects.vercel.app/?handoff=${encodeURIComponent(code)}`)
        } catch (e) {}
      })
    }

    if (profile?.company_id && !companyName) {
      supabase.from('companies').select('name').eq('id', profile.company_id).single()
        .then(({ data: comp }) => {
          if (comp) setCompanyName(comp.name)
        })
    }
  }, [user, profile])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
        <StarsBackground />
        <header className="flex justify-between items-center px-6 py-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-6 w-32 bg-gray-700 rounded-full animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-700 rounded-full animate-pulse"></div>
              <div className="h-6 w-16 bg-gray-700 rounded-full animate-pulse"></div>
              <div className="h-6 w-14 bg-gray-700 rounded-full animate-pulse"></div>
              <div className="h-6 w-14 bg-gray-700 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-6 w-20 bg-gray-700 rounded-full animate-pulse"></div>
            <div className="h-6 w-6 bg-gray-700 rounded-full animate-pulse"></div>
            <div className="h-6 w-12 bg-gray-700 rounded-full animate-pulse"></div>
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a1628' }}>
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a1628' }}>
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
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
      <StarsBackground />
      <header className="flex justify-between items-center px-6 py-2 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <nav className="flex gap-2 text-xs font-medium">
            <Link href="/path-to-perfection" className="action-btn !py-1.5 !px-4 !text-xs">Путь к совершенству</Link>
            <Link href="/healthcare" className="action-btn !py-1.5 !px-4 !text-xs">Забота о здоровье</Link>
            <Link href="/goals" className="action-btn !py-1.5 !px-4 !text-xs">Мои цели</Link>
            <a href={crmUrl} target="_blank" rel="noopener noreferrer" className="action-btn !py-1.5 !px-4 !text-xs">
              CRM Лето
            </a>
            {isSuperAdmin && <Link href="/admin" className="action-btn !py-1.5 !px-4 !text-xs">Админ</Link>}
            {isPlatformStaff && (
              <Link href="/platform-admin" className="action-btn !py-1.5 !px-4 !text-xs">Модерация площадки</Link>
            )}
            {isCompanyAdmin && (
              <Link href="/company-admin" className="action-btn !py-1.5 !px-4 !text-xs">Управление</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          {companyName && <span className="text-gray-400 text-xs">{companyName}</span>}
          {/* === ВОТ КОЛОКОЛЬЧИК === */}
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
