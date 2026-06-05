import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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
        const { data: { user } } = await supabase.auth.getUser()
        console.log('[DEBUG] ProfileContext - user:', user)
        setUser(user)

        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('display_name, role_id, company_id, avatar_url, first_name, last_name')
            .eq('user_id', user.id)
            .maybeSingle()

          console.log('[DEBUG] ProfileContext - profile:', data, 'error:', error)
          if (error) {
            console.error('Ошибка загрузки профиля:', error)
          }
          setProfile(data)
        }
      } catch (err) {
        console.error('Критическая ошибка в ProfileProvider:', err)
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
