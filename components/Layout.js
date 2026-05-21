import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Реалистичные звёзды (как снимки МКС)
function StarsBackground() {
  useEffect(() => {
    const container = document.getElementById('real-stars')
    if (!container || container.children.length > 0) return

    const colors = [
      '#ff4d4d', // красный
      '#4d79ff', // синий
      '#ffff66', // жёлтый
      '#e0f0ff', // бело-ледяной
      '#ffb366', // оранжевый
    ]

    for (let i = 0; i < 18; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 4 + 1.5 // от 1.5 до 5.5 пикселей
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      star.style.borderRadius = '50%'
      star.style.background = colors[Math.floor(Math.random() * colors.length)]
      star.style.position = 'absolute'
      star.style.left = Math.random() * 100 + '%'
      star.style.top = Math.random() * 100 + '%'
      star.style.boxShadow = `0 0 ${size * 2}px ${star.style.background}`
      star.style.animation = `realTwinkle ${Math.random() * 3 + 3}s infinite alternate`
      star.style.animationDelay = Math.random() * 5 + 's'
      star.style.opacity = '0'
      container.appendChild(star)
    }
  }, [])

  return <div id="real-stars" className="stars-bg" />
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
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
      <StarsBackground />
      <header className="flex justify-between items-center px-6 py-2 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <nav className="flex gap-2 text-xs font-medium">
            <Link href="/path-to-perfection" className="action-btn !py-1.5 !px-4 !text-xs">Путь к совершенству</Link>
            <Link href="/healthcare" className="action-btn !py-1.5 !px-4 !text-xs">Забота о здоровье</Link>
            <Link href="/supd" className="action-btn !py-1.5 !px-4 !text-xs">Кармическая CRM</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          {user && <span className="text-white font-semibold">Артур</span>}
          {user && (
            <button onClick={handleLogout} className="action-btn !py-1.5 !px-4 !text-xs">
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
