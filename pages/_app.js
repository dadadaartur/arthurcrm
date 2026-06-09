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
        // Страница логина отрендерится здесь напрямую, минуя все проверки Layout!
        <Component {...pageProps} />
      ) : (
        // Все остальные страницы приложения будут защищены макетом как обычно
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </ProfileProvider>
  )
}
