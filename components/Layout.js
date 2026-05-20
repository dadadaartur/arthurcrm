import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* 1. Чисто белый фон */}
      <div style={{ position: 'fixed', inset: 0, background: '#FFFFFF', zIndex: 0 }} />

      {/* 2. Сакральная геометрия (только золотые линии и круги) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        opacity: 1,
        background: `
          /* большой внешний круг */
          radial-gradient(circle at 50% 50%, transparent 0, transparent 540px, rgba(212,180,84,.18) 541px, transparent 542px),
          /* центральная сфера */
          radial-gradient(circle at 50% 50%, transparent 0, transparent 320px, rgba(212,180,84,.22) 321px, transparent 322px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 210px, rgba(212,180,84,.16) 211px, transparent 212px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 95px, rgba(212,180,84,.12) 96px, transparent 97px),
          /* боковые орбиты */
          radial-gradient(circle at 18% 50%, transparent 0, transparent 360px, rgba(212,180,84,.10) 361px, transparent 362px),
          radial-gradient(circle at 82% 50%, transparent 0, transparent 360px, rgba(212,180,84,.10) 361px, transparent 362px),
          /* горизонтальная и вертикальная оси */
          linear-gradient(90deg, transparent, rgba(212,180,84,.14), transparent),
          linear-gradient(180deg, transparent, rgba(212,180,84,.10), transparent)
        `
      }} />

      {/* Контент поверх всего (z-index: 10) */}
      <header style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-start">
          <Link href="/" className="text-2xl font-bold tracking-tight select-none"
            style={{
              color: 'transparent',
              WebkitTextStroke: '1px #C5A04E',
              textShadow: '0 0 15px rgba(197,160,78,0.8), 0 0 30px rgba(197,160,78,0.5)',
            }}>
            Кармический банк
          </Link>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 10, flexGrow: 1 }}>
        {children}
      </main>

      <footer style={{ position: 'relative', zIndex: 10 }} className="text-center py-4 text-xs text-gray-400">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
