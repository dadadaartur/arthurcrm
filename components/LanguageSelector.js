import { useLanguage } from '../context/LanguageContext'

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage()

  const toggleLang = () => {
    setLang(lang === 'ru' ? 'am' : 'ru')
  }

  return (
    <button
      onClick={toggleLang}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,215,0,0.3)',
        borderRadius: 20,
        padding: '4px 12px',
        color: '#fff',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#FFD700'
        e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {lang === 'ru' ? '🇦🇲 Հայերեն' : '🇷🇺 Русский'}
    </button>
  )
}
