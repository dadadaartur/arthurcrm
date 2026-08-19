import { createContext, useContext, useCallback } from 'react'

const Ctx = createContext(null)

export function ActionFeedbackProvider({ children }) {
  const show = useCallback((type, message) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af:show', {
        detail: { type, message, nonce: Date.now() + Math.random() }
      }))
    }
  }, [])
  const showSuccess = useCallback((m = 'Успешно') => show('success', m), [show])
  const showError = useCallback((m = 'Ошибка') => show('error', m), [show])
  return <Ctx.Provider value={{ showSuccess, showError }}>{children}</Ctx.Provider>
}

export const useFeedback = () =>
  useContext(Ctx) || { showSuccess: () => {}, showError: () => {} }
