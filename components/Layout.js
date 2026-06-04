import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function StarsBackground() { /* без изменений */ }

export default function Layout({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase
          .from('profiles')
          .select('display_name, role_id, roles(name, is_system), company_id, avatar_url, first_name, last_name, can_create_tasks, can_review_tasks, can_manage_employees, can_delete_employees')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            setProfile(data)
            if (data?.company_id) {
              supabase.from('companies').select('name').eq('id', data.company_id).single().then(({ data: comp }) => {
                if (comp) setCompanyName(comp.name)
              })
            } else setCompanyName('')
          })
      } else {
        setProfile(null)
        setCompanyName('')
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        supabase
          .from('profiles')
          .select('display_name, role_id, roles(name, is_system), company_id, avatar_url, first_name, last_name, can_create_tasks, can_review_tasks, can_manage_employees, can_delete_employees')
          .eq('user_id', currentUser.id)
          .maybeSingle()
          .then(({ data }) => {
            setProfile(data)
            if (data?.company_id) {
              supabase.from('companies').select('name').eq('id', data.company_id).single().then(({ data: comp }) => {
                if (comp) setCompanyName(comp.name)
              })
            } else setCompanyName('')
          })
      } else {
        setProfile(null)
        setCompanyName('')
      }
    })

    return () => authListener?.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isGuest = user && !profile?.company_id && !profile?.roles?.is_system
  const isSuperAdmin = profile?.roles?.is_system === true
  const isCompanyAdmin = profile?.role_id === 2 ||
    (profile?.role_id === 4 && (profile.can_create_tasks || profile.can_review_tasks || profile.can_manage_employees || profile.can_delete_employees))

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return (profile.first_name[0] + profile.last_name[0]).toUpperCase()
    }
    if (profile?.display_name) return profile.display_name.substring(0, 2).toUpperCase()
    return user?.email?.substring(0, 2).toUpperCase() || '?'
  }

  if (isGuest) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
        <StarsBackground />
        <main className="flex-grow relative z-10">{children}</main>
        <footer className="text-center py-4 text-xs text-gray-500 relative z-10">
          © {new Date().getFullYear()} Кармический банк
        </footer>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
        <StarsBackground />
        <main className="flex-grow relative z-10">{children}</main>
      </div>
    )
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
            {/* ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ: новый адрес CRM */}
            <a href="https://summercrm-git-main-dadadaarturs-projects.vercel.app/" target="_blank" rel="noopener noreferrer" className="action-btn !py-1.5 !px-4 !text-xs">
              Кармическая CRM
            </a>
            {isSuperAdmin && <Link href="/admin" className="action-btn !py-1.5 !px-4 !text-xs">Админ</Link>}
            {(isSuperAdmin || isCompanyAdmin) && (
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
