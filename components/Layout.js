import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/70 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
              AI Marketplace
            </span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/" className="text-gray-700 hover:text-green-500 transition">
              Каталог
            </Link>
            <Link href="/match" className="text-gray-700 hover:text-green-500 transition">
              Подобрать
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-white/70 backdrop-blur-md border-t py-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} AI Marketplace — ваш навигатор в мире ИИ
      </footer>
    </div>
  )
}
