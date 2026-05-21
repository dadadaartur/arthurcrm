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
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
      {/* Прозрачная шапка без видимых границ */}
      <header className="flex justify-between items-center px-6 py-2 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <nav className="flex gap-1.5 text-xs font-medium">
            <Link href="/path-to-perfection" className="action-btn !py-1 !px-3 !text-xs">Путь к совершенству</Link>
            <Link href="/healthcare" className="action-btn !py-1 !px-3 !text-xs">Забота о здоровье</Link>
            <Link href="/supd" className="action-btn !py-1 !px-3 !text-xs">Кармическая CRM</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          {user && <span className="text-white font-semibold">Артур</span>}
          {user && (
            <button onClick={handleLogout} className="action-btn !py-1 !px-3 !text-xs">
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
