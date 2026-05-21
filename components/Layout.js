import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Звёздный фон
function StarsBackground() {
  useEffect(() => {
    const container = document.getElementById('stars-container')
    if (!container) return
    const colors = ['#ffffff', '#e0f0ff', '#fbbf24', '#c084fc', '#38bdf8']
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div')
      star.className = 'star-dot'
      const size = Math.random() * 2.5 + 0.8
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      star.style.left = Math.random() * 100 + '%'
      star.style.top = Math.random() * 100 + '%'
      star.style.background = colors[Math.floor(Math.random() * colors.length)]
      star.style.animationDelay = Math.random() * 2 + 's'
      star.style.animationDuration = (Math.random() * 2 + 1.8) + 's'
      container.appendChild(star)
    }
  }, [])

  return <div id="stars-container" className="stars-bg" />
}

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
    <div className="min-h-screen flex flex-col relative">
      <StarsBackground />

      {/* Прозрачная шапка без видимых границ */}
      <header className="flex justify-between items-center px-8 py-4 relative z-10">
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
