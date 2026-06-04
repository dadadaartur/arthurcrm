import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function App({ Component, pageProps }) {
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('display_name, role_id, company_id, avatar_url, first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            setProfile(data)
            setLoadingProfile(false)
          })
      } else {
        setLoadingProfile(false)
      }
    })
  }, [])

  return (
    <>
      <Background />
      <Layout profile={profile} loadingProfile={loadingProfile}>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
