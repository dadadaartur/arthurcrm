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
        <div className="flex justify-between items-center px-12 py-6">
          {/* Левая часть: логотип + навигация */}
          <div className="flex items-center gap-8">
            <Link href="/" className="select-none" style={{
              fontSize: '1.5rem',          // уменьшен
              fontWeight: '400',           // тонкий, изящный
              letterSpacing: '-0.3px',
              lineHeight: '1.2',
              padding: '4px 14px',        // компактнее
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(4px)',
              borderRadius: '12px',
              color: '#F9A825',            // тёплый жёлтый
              textShadow: '0 1px 4px rgba(249,168,37,0.2)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03), 0 0 0 1px rgba(255,255,255,0.7)',
              display: 'inline-block'
            }}>
              Кармический банк
            </Link>
            <nav className="flex gap-3 text-sm font-medium">
              <Link href="/path-to-perfection" className="btn-hologram" style={{ padding: '8px 20px' }}>Путь к совершенству</Link>
              <Link href="/healthcare" className="btn-hologram" style={{ padding: '8px 20px' }}>Забота о здоровье</Link>
              <Link href="/supd" className="btn-hologram" style={{ padding: '8px 20px' }}>СУПД</Link>
            </nav>
          </div>

          {/* Правая часть: имя + выход */}
          <div className="flex items-center gap-4 text-sm font-medium">
            {user && <span className="text-gray-700">Артур</span>}
            {user && (
              <button onClick={handleLogout} className="btn-hologram" style={{ padding: '8px 20px' }}>
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
