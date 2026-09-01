import { useEffect, useState } from 'react'

// Основная платформа рассчитана на большой экран (много данных, широкие
// таблицы, панели администратора) — на телефоне ей физически некуда
// поместиться без потери удобства. Вместо того чтобы пытаться втиснуть
// весь интерфейс в маленький экран, для смартфонов есть отдельное лёгкое
// PWA-приложение (/app) с урезанным, но удобным набором функций.
//
// Порог 820px — примерная граница между телефоном (в т.ч. крупным, в
// альбомной ориентации) и планшетом; при сомнении лучше пропустить на
// десктопную версию, чем ошибочно заблокировать полноценный планшет.
const BREAKPOINT = 820

export default function MobileBlock() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#0a0e1c', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 22, overflow: 'hidden' }}>
        <img src="/app-icons/mobkarma.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, maxWidth: 320 }}>
        Платформа работает только на больших экранах
      </h1>
      <p style={{ fontSize: 14, color: '#aaa', maxWidth: 320, lineHeight: 1.5, marginBottom: 26 }}>
        Откройте Кармический банк с планшета, компьютера или ноутбука. Для доступа со смартфона скачайте лёгкое мобильное приложение.
      </p>
      <a href="/app" style={{
        display: 'inline-block', padding: '14px 32px', borderRadius: 14,
        background: 'linear-gradient(135deg, #FFD700, #f0b900)', color: '#0a0e1c',
        fontWeight: 700, fontSize: 15, textDecoration: 'none'
      }}>
        Открыть мобильное приложение
      </a>
    </div>
  )
}
