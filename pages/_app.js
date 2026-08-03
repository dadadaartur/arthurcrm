import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { ProfileProvider } from '../context/ProfileContext'

export default function App({ Component, pageProps }) {
  return (
    <ProfileProvider>
      <Background />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ProfileProvider>
  )
}
