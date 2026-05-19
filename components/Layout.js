import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Layout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-deep-blue text-white shadow-md border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-gold select-none">
            Karmabank
          </Link>
          {user ? (
            <nav className="flex gap-4 items-center text-sm font-medium">
              <Link href="/" className="hover:text-gold transition">Главная</Link>
              <Link href="/transfer" className="hover:text-gold transition">Перевод</Link>
              <Link href="/history" className="hover:text-gold transition">История</Link>
              <Link href="/tasks" className="hover:text-gold transition">Задания</Link>
              <Link href="/shop" className="hover:text-gold transition">Магазин</Link>
              <button onClick={handleLogout} className="btn-outline text-xs border-gold text-gold hover:bg-gold/10 px-3 py-1">
                Выйти
              </button>
            </nav>
          ) : (
            <Link href="/login" className="btn-gold text-xs px-4 py-2">Войти</Link>
          )}
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-deep-blue text-gray-500 text-center py-3 text-xs border-t border-white/10">
        © {new Date().getFullYear()} Кармический банк.
      </footer>
    </div>
  )
}
