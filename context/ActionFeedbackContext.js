import { createContext, useContext, useCallback } from 'react'

const ActionFeedbackContext = createContext(null)

export function ActionFeedbackProvider({ children }) {
  const showSuccess = useCallback((msg = 'Успешно') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af:show', { detail: { visible: true, type: 'success', message: msg } }))
    }
  }, [])

  const showError = useCallback((msg = 'Ошибка') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af:show', { detail: { visible: true, type: 'error', message: msg } }))
    }
  }, [])

  return (
    <ActionFeedbackContext.Provider value={{ showSuccess, showError }}>
      {children}
    </ActionFeedbackContext.Provider>
  )
}

export const useFeedback = () => {
  const ctx = useContext(ActionFeedbackContext)
  if (!ctx) {
    return { showSuccess: () => {}, showError: () => {} }
  }
  return ctx
}
