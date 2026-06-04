import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import NotificationsModal from './NotificationsModal'

function StarsBackground() { /* без изменений */ }

export default function Layout({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        // ... загрузка профиля и компании (как раньше)
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

        // Получаем количество непрочитанных уведомлений
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .then(({ count }) => setUnreadCount(count || 0))
      }
    })

    // ... onAuthStateChange такой же
  }, [])

  // ... handleLogout, getInitials, isGuest, isSuperAdmin, isCompanyAdmin – как в предыдущей версии

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
      <StarsBackground />
      <header className="flex justify-between items-center px-6 py-2 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <nav className="flex gap-2 text-xs font-medium">
            {/* ... ссылки ... */}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          {companyName && <span className="text-gray-400 text-xs">{companyName}</span>}

          {/* Иконка уведомлений – Земля */}
          <button
            onClick={() => {
              setShowNotifications(true)
              // Сбросим счётчик (можно оставить для красоты)
              setUnreadCount(0)
            }}
            className="relative text-gray-400 hover:text-white transition-colors p-1"
            title="Уведомления"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <ellipse cx="12" cy="12" rx="4" ry="10" />
              <path d="M2 12h20" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Профиль */}
          <Link href="/profile" className="flex items-center gap-2 text-white hover:text-gold transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold">
                {getInitials()}
              </div>
            )}
            <span>{profile?.display_name || user?.email}</span>
          </Link>
          <button onClick={handleLogout} className="action-btn !py-1.5 !px-4 !text-xs">Выйти</button>
        </div>
      </header>

      <main className="flex-grow relative z-10">{children}</main>

      <footer className="text-center py-4 text-xs text-gray-500 relative z-10">
        © {new Date().getFullYear()} Кармический банк
      </footer>

      {/* Модальное окно уведомлений */}
      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user?.id}
      />
    </div>
  )
}
