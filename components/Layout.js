import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-end">
          <Link href="/" className="text-2xl font-bold tracking-tight select-none"
            style={{
              background: 'linear-gradient(135deg, #A78BFA, #FACC15)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
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
