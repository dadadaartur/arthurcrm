import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

export default function Layout({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [crmUrl, setCrmUrl] = useState('#')
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase
          .from('profiles')
          .select('display_name, role_id, company_id, avatar_url, first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            setProfile(data)
            setLoadingProfile(false)
            if (data?.company_id) {
              supabase.from('companies').select('name').eq('id', data.company_id).single()
                .then(({ data: comp }) => {
                  if (comp) setCompanyName(comp.name)
                })
            }
          })

        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token && session?.refresh_token) {
            setCrmUrl(`https://summercrm-git-main-dadadaarturs-projects.vercel.app/?access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`)
          }
        })
      } else {
        setLoadingProfile(false)
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!user || loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
        <StarsBackground />
        <main className="flex-grow relative z-10">{children}</main>
      </div>
    )
  }

  const isSuperAdmin = profile?.role_id === 1
  const isCompanyAdmin = profile?.role_id === 2 || isSuperAdmin

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
