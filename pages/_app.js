import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Background />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
