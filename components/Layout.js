import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-50">
        <div className="max-w-6xl ml-0 mr-auto px-6 py-5 flex justify-start">
          <Link href="/" className="text-2xl font-bold tracking-tight select-none"
            style={{
              color: '#A78BFA',
              textShadow: '0 0 10px rgba(167, 139, 250, 0.5), 0 0 20px rgba(167, 139, 250, 0.2)',
            }}
          >
            Кармический банк
          </Link>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-white border-t border-gray-50 text-center py-4 text-xs text-gray-300">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
