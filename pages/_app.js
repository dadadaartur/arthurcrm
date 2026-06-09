import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { ProfileProvider } from '../context/ProfileContext'

export default function App({ Component, pageProps }) {
  const bypassLayout = Component.bypassLayout || false

  return (
    <ProfileProvider>
      <Background />
      {bypassLayout ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </ProfileProvider>
  )
}
