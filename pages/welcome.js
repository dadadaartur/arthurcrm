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
        .select('user_id, company_id, role_id, deleted_at')
        .eq('user_id', user.id)
        .maybeSingle()

      // Супер-админ платформы (role_id=1 AND company_id=null) — это не
      // "нет компании", а осознанный инвариант, см. lib/auth.js. Не гоняем
      // его через проверку приглашений, сразу на главную.
      if (profile && !profile.deleted_at && profile.role_id === 1 && profile.company_id == null) {
        router.push('/')
        return
      }

      if (profile?.company_id && !profile.deleted_at) {
        // Уже привязан к компании и активен — на главную
        router.push('/')
        return
      }

      if (profile?.deleted_at) {
        // Профиль мягко удалён (сотрудник уволен/деактивирован) — доступа
        // в личный кабинет больше нет. НЕ пытаемся принять старые
        // приглашения повторно, просто показываем сообщение.
        setLoading(false)
        return
      }

      // Профиля нет — просим сервер проверить, есть ли для этого email
      // ожидающее приглашение, и сразу принять его. Таблица invitations
      // больше не читается напрямую с клиента (см. миграцию безопасности) —
      // там раньше лежал temp_password в открытом виде и не было RLS,
      // теперь это только через service_role на сервере.
      const { data: { session } } = await supabase.auth.getSession()
      try {
        const res = await fetch('/api/invitations/check-and-accept', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        const result = await res.json()
        if (result.status === 'joined' || result.status === 'already_member') {
          router.push('/')
          return
        }
      } catch (e) {
        // сеть недоступна — просто покажем страницу "обратитесь к администратору"
      }
      // Приглашения нет — остаёмся на странице с предложением обратиться к администратору
      setLoading(false)
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
