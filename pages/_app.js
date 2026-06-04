import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { createServerSupabaseClient } from '../lib/supabaseClient'

export default function App({ Component, pageProps, initialProfile, initialUser }) {
  return (
    <>
      <Background />
      <Layout profile={initialProfile} user={initialUser}>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}

App.getInitialProps = async (appContext) => {
  // Вызываем getInitialProps для вложенной страницы (если есть)
  let pageProps = {}
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(appContext.ctx)
  }

  // Получаем куки из запроса
  const cookie = appContext.ctx.req?.headers?.cookie || ''
  const supabaseServer = createServerSupabaseClient(cookie)

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
    initialProfile: profile,
    initialUser: user,
  }
}
