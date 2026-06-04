import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { createServerClient } from '../lib/supabaseClient'

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || ''
  const supabaseServer = createServerClient(cookie)

  const { data: { user } } = await supabaseServer.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabaseServer
      .from('profiles')
      .select('display_name, role_id, company_id, avatar_url, first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle()
    profile = data
  }

  return {
    props: {
      user,
      profile,
    },
  }
}

export default function App({ Component, pageProps }) {
  const { user, profile, ...restPageProps } = pageProps

  return (
    <>
      <Background />
      <Layout user={user} profile={profile}>
        <Component {...restPageProps} />
      </Layout>
    </>
  )
}
