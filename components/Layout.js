import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/70 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent">
              AI Marketplace
            </span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/" className="text-gray-700 hover:text-purple-500 transition">
              Главная
            </Link>
            <Link href="/catalog" className="text-gray-700 hover:text-purple-500 transition">
              Каталог
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
