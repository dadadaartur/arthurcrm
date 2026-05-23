import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Welcome() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Проверяем, есть ли профиль
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, company_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.company_id) {
        // Уже привязан к компании — на главную
        router.push('/')
        return
      }

      // Профиля нет — ищем активное приглашение для этого email
      const { data: invite } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'pending')
        .maybeSingle()

      if (invite) {
        // Создаём профиль на основе приглашения
        await supabase.from('profiles').insert({
          user_id: user.id,
          company_id: invite.company_id,
          department_id: null,
          role_id: invite.role_id,
          display_name: user.email,
          email: user.email,
          manager_id: invite.created_by,
        })
        // Помечаем приглашение как принятое
        await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id)
        router.push('/')
      } else {
        // Приглашения нет — остаёмся на странице с предложением обратиться к администратору
        setLoading(false)
      }
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Проверка данных...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-center">
      <div className="premium-card">
        <h1 className="text-3xl font-bold text-deep-blue mb-4">Добро пожаловать в экосистему</h1>
        <p className="text-gray-400 mb-6">
          Ваш аккаунт ещё не привязан к компании. Обратитесь к администратору для получения приглашения.
        </p>
        <p className="text-sm text-gray-500">
          Если вы уже получили приглашение, перейдите по ссылке из письма ещё раз.
        </p>
      </div>
    </div>
  )
}
