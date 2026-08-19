import { createContext, useContext, useState, useCallback } from 'react'

const ActionFeedbackContext = createContext(null)

export function ActionFeedbackProvider({ children }) {
  const [state, setState] = useState({ visible: false, type: 'success', message: '' })
  const [queue, setQueue] = useState([])

  const play = useCallback((type, message) => {
    if (state.visible) {
      setQueue(q => [...q, { type, message }])
      return
    }
    setState({ visible: true, type, message })
    setTimeout(() => {
      setState({ visible: false, type: '', message: '' })
      setTimeout(() => {
        setQueue(q => {
          if (q.length === 0) return q
          const [next, ...rest] = q
          setState({ visible: true, type: next.type, message: next.message })
          setTimeout(() => {
            setState({ visible: false, type: '', message: '' })
          }, 2800)
          return rest
        })
      }, 400)
    }, 2800)
  }, [state.visible])

  const showSuccess = useCallback((message = 'Успешно') => play('success', message), [play])
  const showError = useCallback((message = 'Ошибка') => play('error', message), [play])

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
