import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { ProfileProvider } from '../context/ProfileContext'
import { ActionFeedbackProvider } from '../context/ActionFeedbackContext'
import ActionFeedback from '../components/ActionFeedback'
import { useState, useEffect } from 'react'

function FeedbackOverlay() {
  const [state, setState] = useState({ open: false, type: 'success', message: '', nonce: 0 })
  useEffect(() => {
    const h = (e) => setState({ open: true, ...e.detail })
    window.addEventListener('af:show', h)
    return () => window.removeEventListener('af:show', h)
  }, [])
  const close = () => setState(s => ({ ...s, open: false }))
  return <ActionFeedback state={state} onClose={close} />
}

export default function App({ Component, pageProps }) {
  return (
    <ProfileProvider>
      <ActionFeedbackProvider>
        <Background />
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <FeedbackOverlay />
      </ActionFeedbackProvider>
    </ProfileProvider>
  )
}
