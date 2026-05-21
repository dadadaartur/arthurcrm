import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Register() {
  const router = useRouter()
  const { token } = router.query

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(!!token)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchInvite(token)
  }, [token])

  async function fetchInvite(t) {
    const { data } = await supabase
      .from('invitations')
      .select('*, companies(name), roles(name)')
      .eq('token', t)
      .eq('status', 'pending')
      .single()

    if (data) {
      setInvite(data)
      setEmail(data.email || '')
    } else {
      setError('Приглашение не найдено или уже использовано')
    }
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    // 1. Регистрируем пользователя
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsSubmitting(false)
      return
    }

    const user = signUpData?.user

    // 2. Если пользователь сразу авторизован (подтверждение email выключено)
    if (user && signUpData?.session) {
      await createProfile(user)
      setIsSubmitting(false)
      return
    }

    // 3. Если требуется подтверждение email — показываем сообщение
    if (user && !signUpData?.session) {
      if (invite) {
        // Сохраняем связку user_id + приглашение для последующей обработки
        localStorage.setItem(`pending_invite_${user.id}`, invite.id.toString())
      }
      setSuccess('Аккаунт создан! Проверьте почту для подтверждения email. После подтверждения вы будете автоматически привязаны к компании.')
      setIsSubmitting(false)
      return
    }

    // 4. Непредвиденная ситуация
    setError('Не удалось завершить регистрацию. Попробуйте другой email.')
    setIsSubmitting(false)
  }

  async function createProfile(user) {
    if (!invite) {
      router.push('/')
      return
    }

    // Создаём профиль
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: user.id,
      company_id: invite.company_id,
      department_id: null,
      role_id: invite.role_id,
      display_name: email,
      manager_id: invite.created_by,
    })

    if (profileError) {
      setError('Ошибка при создании профиля: ' + profileError.message)
      return
    }

    // Помечаем инвайт использованным
    await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id)

    // Редирект на главную
    router.push('/')
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Проверка приглашения...</div>
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">
          {invite ? 'Регистрация по приглашению' : 'Регистрация'}
        </h1>

        {invite && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-300">
            <p>Компания: <span className="text-white font-semibold">{invite.companies?.name}</span></p>
            <p>Роль: <span className="text-white font-semibold">{invite.roles?.name}</span></p>
            <p className="text-xs text-gray-500 mt-1">Приглашение действительно</p>
          </div>
        )}

        {success ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">{success}</p>
            <button onClick={() => router.push('/login')} className="btn-gold">Перейти ко входу</button>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                required
                readOnly={!!invite?.email}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                required
                disabled={isSubmitting}
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>
        )}

        {!success && (
          <p className="mt-4 text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-gold hover:underline">Войти</Link>
          </p>
        )}
      </div>
    </div>
  )
}
