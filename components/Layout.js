import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Layout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-deep-blue text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gold">
            Karmabank
          </Link>
          <nav className="flex gap-6 items-center text-sm font-medium">
            {user ? (
              <>
                <Link href="/" className="hover:text-gold transition">Главная</Link>
                <Link href="/events" className="hover:text-gold transition">События</Link>
                <Link href="/confirm" className="hover:text-gold transition">Подтверждения</Link>
                <button onClick={handleLogout} className="btn-outline text-xs border-gold text-gold hover:bg-gold/10">
                  Выйти
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-gold text-xs px-4 py-2">
                Войти
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-deep-blue text-gray-400 text-center py-4 text-sm">
        © {new Date().getFullYear()} Кармический банк. Все права защищены.
      </footer>
    </div>
  )
}
