import '../styles/globals.css'
import Layout from '../components/Layout'
import Background from '../components/Background'
import { ProfileProvider, useProfile } from '../context/ProfileContext'
import { ActionFeedbackProvider, useFeedback } from '../context/ActionFeedbackContext'
import ActionFeedback from '../components/ActionFeedback'
import { useState } from 'react'

function FeedbackRenderer() {
  // Хук для глобального доступа из DevTools/отладки (не используется напрямую,
  // но инициализирует контекст и делает showSuccess/showError доступными)
  useFeedback()
  return null
}

function FeedbackOverlay() {
  // Рендерим оверлей анимации на верхнем уровне, чтобы он был над всем
  const [state, setState] = useState({ visible: false, type: 'success', message: '' })
  return null // Реальный рендер идёт через FeedbackBridge ниже
}

// Мост между контекстом и визуальным рендером:
function FeedbackBridge({ children }) {
  return children
}

export default function App({ Component, pageProps }) {
  return (
    <ProfileProvider>
      <ActionFeedbackProvider>
        <Background />
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <FeedbackRenderer />
        <FeedbackVisual />
      </ActionFeedbackProvider>
    </ProfileProvider>
  )
}

// Компонент, который реально читает стейт и рисует анимацию
function FeedbackVisual() {
  return <ActionFeedbackRenderer />
}

function ActionFeedbackRenderer() {
  // Локальный стейт, управляемый через глобальное событие window
  const [state, setState] = useState({ visible: false, type: 'success', message: '' })

  useState(() => {
    const handler = (e) => setState(e.detail)
    window.addEventListener('af:show', handler)
    return () => window.removeEventListener('af:show', handler)
  })

  return <ActionFeedback visible={state.visible} type={state.type} message={state.message} />
}
