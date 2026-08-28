import '../styles/globals.css'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
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
  // /landing — публичная маркетинговая страница, должна нормально
  // открываться и с телефона. /login — тоже: иначе кнопка «Войти» с
  // лендинга вела в тупик (блокировка ловила саму страницу входа).
  // После успешного входа login.js сам решает, куда вести дальше —
  // в /app на маленьком экране, на десктоп на большом.
  const skipMobileBlock = isMobileApp || router.pathname === '/landing' || router.pathname === '/login'
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
        {!skipMobileBlock && <MobileBlock />}
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <FeedbackOverlay />
      </ActionFeedbackProvider>
    </ProfileProvider>
  )
}
