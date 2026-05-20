import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Фоновый контейнер (все слои) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: `
          linear-gradient(180deg, #FAF8F3 0%, #F7F4EE 45%, #F4F0E8 100%)
        `
      }}>
        {/* текстура бумаги */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.025,
          backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)',
          backgroundSize: '7px 7px'
        }} />

        {/* сакральная геометрия */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 50% 50%, transparent 0, transparent 26px, rgba(212,180,84,.8) 27px, transparent 28px),
            radial-gradient(circle at 50% 50%, transparent 0, transparent 170px, rgba(212,180,84,.35) 171px, transparent 172px),
            radial-gradient(circle at 50% 50%, transparent 0, transparent 280px, rgba(212,180,84,.28) 281px, transparent 282px),
            radial-gradient(circle at 50% 50%, transparent 0, transparent 470px, rgba(212,180,84,.18) 471px, transparent 472px),
            radial-gradient(circle at 20% 50%, transparent 0, transparent 330px, rgba(212,180,84,.12) 331px, transparent 332px),
            radial-gradient(circle at 80% 50%, transparent 0, transparent 330px, rgba(212,180,84,.12) 331px, transparent 332px),
            radial-gradient(circle at 50% 95%, transparent 0, transparent 180px, rgba(212,180,84,.08) 181px, transparent 182px),
            linear-gradient(90deg, transparent, rgba(212,180,84,.24) 50%, transparent),
            linear-gradient(180deg, transparent, rgba(212,180,84,.24) 50%, transparent)
          `
        }} />

        {/* светящиеся точки */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 50% 50%, rgba(212,180,84,1) 0 4px, transparent 5px),
            radial-gradient(circle at 50% 15%, rgba(212,180,84,.8) 0 2px, transparent 3px),
            radial-gradient(circle at 50% 30%, rgba(212,180,84,.7) 0 2px, transparent 3px),
            radial-gradient(circle at 50% 70%, rgba(212,180,84,.7) 0 2px, transparent 3px),
            radial-gradient(circle at 50% 85%, rgba(212,180,84,.8) 0 2px, transparent 3px),
            radial-gradient(circle at 25% 50%, rgba(212,180,84,.8) 0 3px, transparent 4px),
            radial-gradient(circle at 75% 50%, rgba(212,180,84,.8) 0 3px, transparent 4px)
          `
        }} />

        {/* золотая пыль */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.55,
          background: `
            radial-gradient(circle at 5% 40%, rgba(212,180,84,.3) 0 1px, transparent 2px),
            radial-gradient(circle at 10% 65%, rgba(212,180,84,.3) 0 1px, transparent 2px),
            radial-gradient(circle at 90% 30%, rgba(212,180,84,.3) 0 1px, transparent 2px),
            radial-gradient(circle at 85% 75%, rgba(212,180,84,.3) 0 1px, transparent 2px),
            radial-gradient(circle at 70% 15%, rgba(212,180,84,.8) 0 1px, transparent 3px),
            radial-gradient(circle at 20% 80%, rgba(212,180,84,.6) 0 1px, transparent 3px),
            radial-gradient(circle at 60% 90%, rgba(212,180,84,.6) 0 1px, transparent 3px)
          `
        }} />
      </div>

      {/* Шапка */}
      <header className="bg-transparent relative z-10">
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

      <main className="flex-grow relative z-10">{children}</main>

      <footer className="bg-transparent text-center py-4 text-xs text-gray-400 relative z-10">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
