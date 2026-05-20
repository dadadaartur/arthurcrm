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
              fontSize: '1.8rem',
              fontWeight: '700',
              letterSpacing: '-0.5px',
              lineHeight: '1.2',
              padding: '6px 18px',
              // Белая полоса, как мазок кистью
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(4px)',
              borderRadius: '16px', // мягкие края, имитация кисти
              color: '#B8860B', // тёмное золото для текста
              textShadow: '0 2px 8px rgba(184,134,11,0.3), 0 0 20px rgba(255,215,0,0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)',
              display: 'inline-block'
            }}>
              Кармический банк
            </Link>
            <nav className="flex gap-3 text-sm font-medium">
              <Link href="/path-to-perfection" className="nav-btn">Путь к совершенству</Link>
              <Link href="/healthcare" className="nav-btn">Забота о здоровье</Link>
              <Link href="/supd" className="nav-btn">СУПД</Link>
            </nav>
          </div>

          {/* Правая часть: имя + выход */}
          <div className="flex items-center gap-4 text-sm font-medium">
            {user && <span className="text-gray-700">Артур</span>}
            {user && (
              <button onClick={handleLogout} className="nav-btn">
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
