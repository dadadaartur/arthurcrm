import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Фоновые слои (не перекрывают контент благодаря z-index) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#FFFFFF' }} />

      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        opacity: 0.8,
        background: `
          radial-gradient(circle at 50% 50%, transparent 0, transparent 540px, rgba(212,180,84,.08) 541px, transparent 542px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 320px, rgba(212,180,84,.12) 321px, transparent 322px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 210px, rgba(212,180,84,.08) 211px, transparent 212px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 95px, rgba(212,180,84,.06) 96px, transparent 97px),
          radial-gradient(circle at 18% 50%, transparent 0, transparent 360px, rgba(212,180,84,.04) 361px, transparent 362px),
          radial-gradient(circle at 82% 50%, transparent 0, transparent 360px, rgba(212,180,84,.04) 361px, transparent 362px),
          linear-gradient(90deg, transparent, rgba(212,180,84,.06), transparent),
          linear-gradient(180deg, transparent, rgba(212,180,84,.04), transparent)
        `
      }} />

      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        opacity: 0.4,
        filter: 'blur(0.3px)',
        background: `
          radial-gradient(circle at 50% 50%, rgba(212,180,84,0.9) 0 3px, transparent 4px),
          radial-gradient(circle at 50% 15%, rgba(212,180,84,0.5) 0 1px, transparent 2px),
          radial-gradient(circle at 50% 85%, rgba(212,180,84,0.5) 0 1px, transparent 2px),
          radial-gradient(circle at 28% 50%, rgba(212,180,84,0.5) 0 1px, transparent 2px),
          radial-gradient(circle at 72% 50%, rgba(212,180,84,0.5) 0 1px, transparent 2px),
          radial-gradient(circle at 9% 22%, rgba(212,180,84,0.35) 0 1px, transparent 2px),
          radial-gradient(circle at 16% 78%, rgba(212,180,84,0.2) 0 1px, transparent 2px),
          radial-gradient(circle at 88% 30%, rgba(212,180,84,0.25) 0 1px, transparent 2px),
          radial-gradient(circle at 78% 82%, rgba(212,180,84,0.2) 0 1px, transparent 2px),
          radial-gradient(circle at 70% 12%, rgba(212,180,84,0.35) 0 1px, transparent 2px),
          radial-gradient(circle at 25% 92%, rgba(212,180,84,0.3) 0 1px, transparent 2px),
          radial-gradient(#000 0.5px, transparent 0.5px)
        `,
        backgroundSize: 'auto, auto, auto, auto, auto, auto, auto, auto, auto, auto, 8px 8px'
      }} />

      {/* Контент поверх всего */}
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
