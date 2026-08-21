import { createContext, useContext, useEffect, useState } from 'react'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('ru')
  const [translations, setTranslations] = useState({})

  useEffect(() => {
    // Загружаем переводы при смене языка
    const loadTranslations = async () => {
      try {
        const res = await fetch(`/locales/${lang}.json`)
        const data = await res.json()
        setTranslations(data)
      } catch (e) {
        console.error('Ошибка загрузки переводов:', e)
      }
    }
    loadTranslations()

    // Сохраняем выбор языка в localStorage
    localStorage.setItem('lang', lang)
  }, [lang])

  const t = (key) => translations[key] || key

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
