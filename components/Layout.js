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
      {/* Прозрачная шапка без видимых границ */}
      <header className="flex justify-between items-center px-6 py-4 relative z-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <nav className="flex gap-3 text-sm font-medium">
            <Link href="/path-to-perfection" className="action-btn !flex-row !py-2 !px-4 !text-sm">Путь к совершенству</Link>
            <Link href="/healthcare" className="action-btn !flex-row !py-2 !px-4 !text-sm">Забота о здоровье</Link>
            <Link href="/supd" className="action-btn !flex-row !py-2 !px-4 !text-sm">Кармическая CRM</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          {user && <span className="text-white font-semibold">Артур</span>}
          {user && (
            <button onClick={handleLogout} className="action-btn !flex-row !py-2 !px-4 !text-sm">
              Выйти
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow relative z-10">
        {children}
      </main>

      <footer className="text-center py-4 text-xs text-gray-500 relative z-10">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
