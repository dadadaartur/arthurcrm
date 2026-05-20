import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Фоновый слой (отдельно, сзади) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        zIndex: -1,
        background: `
          linear-gradient(180deg, #FFFFFF 0%, #FCFCFB 45%, #FAFAF8 100%)
        `
      }}>
        {/* очень мягкое центральное свечение */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(212,180,84,.045), transparent 42%)`
        }} />

        {/* сакральная геометрия */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.9,
          background: `
            radial-gradient(circle at 50% 50%, transparent 0, transparent 540px, rgba(212,180,84,.10) 541px, transparent 542px),
            radial-gradient(circle at 50% 50%, transparent 0, transparent 320px, rgba(212,180,84,.16) 321px, transparent 322px),
            radial-gradient(circle at 50% 50%, transparent 0, transparent 210px, rgba(212,180,84,.12) 211px, transparent 212px),
            radial-gradient(circle at 50% 50%, transparent 0, transparent 95px, rgba(212,180,84,.10) 96px, transparent 97px),
            radial-gradient(circle at 18% 50%, transparent 0, transparent 360px, rgba(212,180,84,.06) 361px, transparent 362px),
            radial-gradient(circle at 82% 50%, transparent 0, transparent 360px, rgba(212,180,84,.06) 361px, transparent 362px),
            linear-gradient(90deg, transparent, rgba(212,180,84,.10), transparent),
            linear-gradient(180deg, transparent, rgba(212,180,84,.08), transparent)
          `
        }} />

        {/* световые точки */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 50% 50%, rgba(212,180,84,1) 0 4px, transparent 5px),
            radial-gradient(circle at 50% 15%, rgba(212,180,84,.7) 0 2px, transparent 3px),
            radial-gradient(circle at 50% 85%, rgba(212,180,84,.7) 0 2px, transparent 3px),
            radial-gradient(circle at 28% 50%, rgba(212,180,84,.7) 0 2px, transparent 3px),
            radial-gradient(circle at 72% 50%, rgba(212,180,84,.7) 0 2px, transparent 3px)
          `
        }} />

        {/* золотая пыль */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.28,
          background: `
            radial-gradient(circle at 9% 22%, rgba(212,180,84,.45) 0 1px, transparent 2px),
            radial-gradient(circle at 16% 78%, rgba(212,180,84,.25) 0 1px, transparent 2px),
            radial-gradient(circle at 88% 30%, rgba(212,180,84,.35) 0 1px, transparent 2px),
            radial-gradient(circle at 78% 82%, rgba(212,180,84,.25) 0 1px, transparent 2px),
            radial-gradient(circle at 70% 12%, rgba(212,180,84,.45) 0 1px, transparent 2px),
            radial-gradient(circle at 25% 92%, rgba(212,180,84,.4) 0 1px, transparent 2px)
          `
        }} />

        {/* дорогая микротекстура */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.012,
          backgroundImage: 'radial-gradient(#000 .5px, transparent .5px)',
          backgroundSize: '8px 8px'
        }} />
      </div>

      {/* Контент поверх фона */}
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
