import { createContext, useContext, useCallback } from 'react'

const ActionFeedbackContext = createContext(null)

window.__showSuccess = (message = 'Успешно') => {
  window.dispatchEvent(new CustomEvent('af:show', { detail: { visible: true, type: 'success', message } }))
}
window.__showError = (message = 'Ошибка') => {
  window.dispatchEvent(new CustomEvent('af:show', { detail: { visible: true, type: 'error', message } }))
}

export function ActionFeedbackProvider({ children }) {
  const showSuccess = useCallback((msg) => window.__showSuccess(msg), [])
  const showError = useCallback((msg) => window.__showError(msg), [])
  return (
    <ActionFeedbackContext.Provider value={{ showSuccess, showError }}>
      {children}
    </ActionFeedbackContext.Provider>
  )
}

export const useFeedback = () => {
  const ctx = useContext(ActionFeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used within ActionFeedbackProvider')
  return ctx
}
