import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Layout({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-transparent relative z-10">
        <div className="flex justify-between items-center px-6 py-5">
          {/* Левая часть: логотип + навигация */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold tracking-tight select-none"
              style={{
                color: 'transparent',
                WebkitTextStroke: '1px #000000',
                textShadow: '0 0 8px rgba(0,0,0,0.1)',
              }}>
              Кармический банк
            </Link>
            <nav className="flex gap-3 text-sm font-medium">
              <Link href="/path-to-perfection" className="ghost-nav-btn">Путь к совершенству</Link>
              <Link href="/healthcare" className="ghost-nav-btn">Забота о здоровье</Link>
              <Link href="/supd" className="ghost-nav-btn">СУПД</Link>
            </nav>
          </div>

          {/* Правая часть: имя + выход */}
          <div className="flex items-center gap-4 text-sm font-medium">
            {user && <span className="text-gray-700">Артур</span>}
            {user && (
              <button onClick={handleLogout} className="ghost-nav-btn">
                Выйти
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow relative z-10">
        {children}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 relative z-10">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
