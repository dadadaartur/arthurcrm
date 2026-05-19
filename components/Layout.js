import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-start">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight select-none"
            style={{
              // Прозрачная заливка + золотая обводка
              color: 'transparent',
              WebkitTextStroke: '1px #C5A04E',
              // Голографическое свечение
              textShadow:
                '0 0 15px rgba(197,160,78,0.8), 0 0 30px rgba(197,160,78,0.5)',
              background: 'transparent',
            }}
          >
            Кармический банк
          </Link>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-transparent text-center py-4 text-xs text-gray-400">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
