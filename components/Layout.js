import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isSuperAdmin as checkIsSuperAdmin, isCompanyAdmin as checkIsCompanyAdmin } from '../lib/permissions'

// ЕДИНЫЙ КОСМИЧЕСКИЙ ФОН для всей платформы.
// Туманности (сильное размытие, как на реальных снимках) + плотное поле
// звёзд разного размера/цвета со свечением. Рисуется один раз (useMemo),
// чтобы звёзды не "прыгали" при каждом рендере.
function StarsBackground() {
  const stars = useMemo(() => {
    const colors = ['#ffffff', '#fdf6e3', '#ffe9c4', '#cfe0ff', '#aac6ff', '#ffd9a0', '#ffb3c6', '#e0f0ff']
    const arr = []
    for (let i = 0; i < 170; i++) {
      const size = Math.random() * 2.4 + 0.4
      arr.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.55 + 0.25,
        glow: size * (Math.random() * 4 + 3),
        dur: Math.random() * 9 + 7,
        delay: Math.random() * 9,
      })
    }
    return arr
  }, [])

  return (
    <div id="real-stars" className="stars-bg">
      {/* Туманности — размытые цветные облака */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '12%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(88,28,135,0.30) 0%, rgba(88,28,135,0.12) 40%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '5%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(30,58,138,0.32) 0%, rgba(30,58,138,0.13) 45%, transparent 70%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', top: '28%', right: '18%', width: '42%', height: '42%', background: 'radial-gradient(circle, rgba(192,132,252,0.17) 0%, transparent 65%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '18%', left: '-6%', width: '46%', height: '46%', background: 'radial-gradient(circle, rgba(249,115,22,0.11) 0%, transparent 60%)', filter: 'blur(55px)' }} />
      </div>
      {/* Звёзды */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: s.left + '%',
          top: s.top + '%',
          width: s.size + 'px',
          height: s.size + 'px',
          borderRadius: '50%',
          background: s.color,
          boxShadow: `0 0 ${s.glow}px ${s.glow / 2}px ${s.color}55, 0 0 ${s.glow / 2}px ${s.color}`,
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
        } catch (e) {
          // Тихо не показываем кнопку рабочей, если обмен не удался
        }
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
