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
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })
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
