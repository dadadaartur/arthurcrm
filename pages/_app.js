import '../styles/globals.css'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Background from '../components/Background'
import MobileBlock from '../components/MobileBlock'
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
  const router = useRouter()
  // Раздел /app — отдельное PWA-приложение для смартфонов (см. п.2-5
  // фидбека от 28 августа 2026) со своим собственным каркасом
  // (components/AppShell.js) — десктопный Layout/шапка/фон ему не нужны
  // и не подходят по формату для маленького экрана.
  const isMobileApp = router.pathname.startsWith('/app')
  // /landing — публичная маркетинговая страница, её должны нормально
  // видеть и с телефона (это первая точка контакта для потенциального
  // клиента, а не рабочий инструмент) — блокировка касается только
  // рабочей платформы после входа.
  const skipMobileBlock = isMobileApp || router.pathname === '/landing'
  if (isMobileApp) {
    return (
      <ProfileProvider>
        <ActionFeedbackProvider>
          <Component {...pageProps} />
          <FeedbackOverlay />
        </ActionFeedbackProvider>
      </ProfileProvider>
    )
  }
  return (
    <ProfileProvider>
      <ActionFeedbackProvider>
        <Background />
        {!skipMobileBlock && <MobileBlock />}
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <FeedbackOverlay />
      </ActionFeedbackProvider>
    </ProfileProvider>
  )
}
