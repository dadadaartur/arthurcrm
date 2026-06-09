import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { ProfileProvider } from '../context/ProfileContext'

export default function App({ Component, pageProps }) {
  // Проверяем, есть ли у страницы флаг обхода макета
  const bypassLayout = Component.bypassLayout || false

  return (
    <ProfileProvider>
      <Background />
      {bypassLayout ? (
        // Страница логина рендерится напрямую, без макета
        <Component {...pageProps} />
      ) : (
        // Остальные страницы защищены макетом
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </ProfileProvider>
  )
}
