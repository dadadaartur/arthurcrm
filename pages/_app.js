import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { createServerClient } from '../lib/supabaseClient'

export default function App({ Component, pageProps, initialUser, initialProfile }) {
  return (
    <>
      <Background />
      <Layout user={initialUser} profile={initialProfile}>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}

App.getInitialProps = async (appContext) => {
  // getInitialProps для страницы, если есть
  let pageProps = {}
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(appContext.ctx)
  }

  const supabaseServer = createServerClient()
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
    pageProps,
    initialUser: user,
    initialProfile: profile,
  }
}
