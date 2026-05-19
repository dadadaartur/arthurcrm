import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-transparent">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/" className="select-none">
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
              Ai Come To Me
            </span>
          </Link>

          <nav className="flex gap-6 items-center">
            <Link
              href="/"
              className="font-semibold text-lg bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent hover:scale-105 transition-transform select-none"
            >
              Выбери свой Ai
            </Link>
            <Link
              href="/catalog"
              className="font-medium text-gray-700 hover:text-purple-600 transition select-none"
            >
              Реестр Ai
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow">{children}</main>

      <footer className="bg-transparent py-6 text-center text-gray-500 text-sm">
        <span className="select-none">
          © {new Date().getFullYear()} Ai Come To Me — ваш навигатор в мире ИИ
        </span>
      </footer>
    </div>
  )
}
