import { createContext, useContext, useEffect, useState } from 'react'

const ProfileContext = createContext({
  user: null,
  profile: null,
  loading: true,
})

export function ProfileProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) {
          if (res.status === 401) {
            // Пользователь не авторизован – это нормально для неавторизованных страниц
            setUser(null)
            setProfile(null)
          }
          setLoading(false)
          return
        }
        const profileData = await res.json()
        // Получаем пользователя из Supabase (можно и из отдельного эндпоинта, но для простоты оставим стандартный метод)
        const { supabase } = await import('../lib/supabaseClient')
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
        setProfile(profileData)
      } catch (err) {
        console.error('Profile loading error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <ProfileContext.Provider value={{ user, profile, loading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
