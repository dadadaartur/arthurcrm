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
        setUser(user)

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select(`
              display_name, role_id, company_id, avatar_url, first_name, last_name,
              is_company_admin, can_create_tasks, can_review_tasks,
              can_manage_employees, can_delete_employees,
              companies(status, status_reason, name)
            `)
            .eq('user_id', user.id)
            .maybeSingle()

          setProfile(data)
        }
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
