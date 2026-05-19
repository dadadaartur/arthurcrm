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
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#C5A04E] select-none">
            Karmabank
          </Link>
          {user ? (
            <nav className="flex gap-4 items-center text-sm font-medium text-gray-600">
              <Link href="/transfer" className="hover:text-[#C5A04E] transition">Перевод</Link>
              <Link href="/history" className="hover:text-[#C5A04E] transition">История</Link>
              <Link href="/shop" className="hover:text-[#C5A04E] transition">Магазин</Link>
              <Link href="/tasks" className="hover:text-[#C5A04E] transition">Задания</Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 transition">
                Выйти
              </button>
            </nav>
          ) : (
            <Link href="/login" className="btn-gold text-sm px-5 py-2">Войти</Link>
          )}
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-white border-t border-gray-100 text-center py-4 text-xs text-gray-400">
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
