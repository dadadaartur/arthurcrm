import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { ProfileProvider } from '../context/ProfileContext'
import { ActionFeedbackProvider } from '../context/ActionFeedbackContext'
import ActionFeedback from '../components/ActionFeedback'
import { useState, useEffect } from 'react'

function FeedbackOverlay() {
  const [state, setState] = useState({ visible: false, type: 'success', message: '' })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e) => setState(e.detail)
    window.addEventListener('af:show', handler)
    return () => window.removeEventListener('af:show', handler)
  }, [])
  return <ActionFeedback visible={state.visible} type={state.type} message={state.message} />
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
