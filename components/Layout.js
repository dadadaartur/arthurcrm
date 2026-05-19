import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Солнце */}
      <div className="sun" />

      <header className="bg-transparent relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          {/* Логотип на облаке */}
          <Link href="/" className="cloud px-6 py-3 select-none">
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent">
              Ai Come To Me
            </span>
          </Link>

          {/* Облака-меню */}
          <nav className="flex gap-3">
            <Link
              href="/"
              className="cloud px-6 py-2 font-semibold bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent hover:scale-105 transition-transform select-none"
            >
              Выбери свой Ai
            </Link>
            <Link
              href="/catalog"
              className="cloud px-6 py-2 text-gray-800 hover:text-purple-600 transition select-none font-medium"
            >
              Реестр Ai
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow relative z-10">{children}</main>

      <footer className="bg-transparent py-6 text-center text-gray-500 text-sm relative z-10">
        <span className="cloud px-4 py-2 inline-block select-none">
          © {new Date().getFullYear()} Ai Come To Me — ваш навигатор в мире ИИ
        </span>
      </footer>
    </div>
  )
}
