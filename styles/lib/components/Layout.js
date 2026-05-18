import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            🤖 AI Marketplace
          </Link>
          <nav>
            <Link href="/" className="text-gray-600 hover:text-indigo-600">
              Каталог
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-white border-t py-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} AI Marketplace — ваш навигатор в мире ИИ
      </footer>
    </div>
  )
}
