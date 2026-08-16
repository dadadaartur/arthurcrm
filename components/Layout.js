import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isSuperAdmin as checkIsSuperAdmin, isCompanyAdmin as checkIsCompanyAdmin } from '../lib/permissions'

function StarsBackground() {
  const stars = useMemo(() => {
    const arr = []
    const count = 300
    for (let i = 0; i < count; i++) {
      const roll = Math.random()
      let size
      if (roll < 0.70) size = Math.random() * 0.7 + 0.5
      else if (roll < 0.92) size = Math.random() * 0.8 + 1.2
      else size = Math.random() * 0.8 + 2.0
      const c = Math.random()
      let color
      if (c < 0.52) color = '#ffffff'
      else if (c < 0.74) color = '#e3eeff'
      else if (c < 0.89) color = '#fff7e6'
      else if (c < 0.97) color = '#ffeccd'
      else color = '#ffd9a3'
      arr.push({
        id: i, left: Math.random() * 100, top: Math.random() * 100,
        size, color,
        opacity: roll >= 0.92 ? Math.random() * 0.4 + 0.6 : Math.random() * 0.45 + 0.3,
        dur: Math.random() * 7 + 5, delay: Math.random() * 7,
      })
    }
    return arr
  }, [])

  return (
    <div id="real-stars" className="stars-bg">
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute', left: s.left + '%', top: s.top + '%',
          width: s.size + 'px', height: s.size + 'px', borderRadius: '50%',
          background: s.color,
          boxShadow: s.size >= 2 ? `0 0 ${Math.round(s.size * 2)}px 0 ${s.color}` : 'none',
          opacity: s.opacity,
          animation: `realTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
        }} />
      ))}
    </div>
  )
}

export default function Layout({ children }) {
  const { user, profile, loading } = useProfile()
  const [companyName, setCompanyName] = useState('')
  const [crmUrl, setCrmUrl] = useState('#')
  const [isPlatformStaff, setIsPlatformStaff] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return
        fetch('/api/platform-admin/me', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json()).then(d => setIsPlatformStaff(!!d.isPlatformStaff)).catch(() => {})
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

      loadNotifications()
    }

    if (profile?.company_id && !companyName) {
      supabase.from('companies').select('name').eq('id', profile.company_id).single()
        .then(({ data: comp }) => { if (comp) setCompanyName(comp.name) })
    }
  }, [user, profile])

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (e) {}
  }

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    })
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

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
  const isFounder = user?.email === 'arturgalkin.ru@mail.ru'

  if (isBlockedByModeration) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a1628' }}>
        <StarsBackground />
        <div className="premium-card max-w-md text-center relative z-10">
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
        <StarsBackground />
        <div className="premium-card max-w-md text-center relative z-10">
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
            <a href={crmUrl} target="_blank" rel="noopener noreferrer" className="action-btn !py-1.5 !px-4 !text-xs">
              CRM Лето
            </a>
            {isSuperAdmin && <Link href="/admin" className="action-btn !py-1.5 !px-4 !text-xs">Админ</Link>}
            {isFounder && (
              <Link href="/central-bank" className="action-btn !py-1.5 !px-4 !text-xs" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(212,175,55,0.15))', border: '1px solid rgba(255,215,0,0.4)' }}>
                Центробанк
              </Link>
            )}
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
          
          {/* Колокольчик уведомлений */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unreadCount > 0) markAllRead() }}
              className="action-btn !py-1.5 !px-3 relative"
              title="Уведомления"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 rounded-full text-xs font-bold bg-red-500 text-white px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* Выпадающий список уведомлений */}
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto premium-card z-50" style={{ minWidth: 320 }}>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-white">Уведомления</h3>
                  {notifications.length > 0 && (
                    <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-white">
                      Прочитать все
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Нет уведомлений</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { if (n.link) window.location.href = n.link; setShowNotifs(false) }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          n.read ? 'bg-gray-800/50' : 'bg-gray-800 border-l-2 border-gold'
                        } hover:bg-gray-700/50`}
                      >
                        <p className="text-sm text-white mb-1">{n.message}</p>
                        <p className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString('ru')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
