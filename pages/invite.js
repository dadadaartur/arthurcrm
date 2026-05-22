import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Invite() {
  const router = useRouter()
  const { token } = router.query
  const [tempPassword, setTempPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invite, setInvite] = useState(null)
  const [initialCheck, setInitialCheck] = useState(true)

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchInvite(token)
  }, [token])

  async function fetchInvite(t) {
    setInitialCheck(true)
    setError('')
    const { data, error: fetchError } = await supabase
      .from('invitations')
      .select('*, companies(name), roles(name)')
      .eq('token', t)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError) {
      setError('Ошибка при проверке приглашения: ' + fetchError.message)
    } else if (!data) {
      setError('Приглашение не найдено или уже использовано')
    } else {
      setInvite(data)
    }
    setInitialCheck(false)
  }

  // Обработка ввода временного пароля
  async function handleTempPassSubmit(e) {
    e.preventDefault()
    if (!tempPassword) return
    setLoading(true)
    setError('')

    if (tempPassword !== invite.temp_password) {
      setError('Неверный временный пароль')
      setLoading(false)
      return
    }

    // Временный пароль верен – переходим к установке постоянного
    setInvite({ ...invite, tempPassConfirmed: true })
    setLoading(false)
  }

  // Установка постоянного пароля и завершение активации
  async function handleSetNewPass(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setLoading(true)
    setError('')

    try {
      // 1. Создаём пользователя в Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: newPassword,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      const user = signUpData?.user
      if (!user) {
        setError('Не удалось создать аккаунт')
        setLoading(false)
        return
      }

      // 2. Создаём профиль (если ещё нет)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          user_id: user.id,
          company_id: invite.company_id,
          department_id: null,
          role_id: invite.role_id,
          display_name: invite.email,
          email: invite.email,
          manager_id: invite.created_by,
        })
      }

      // 3. Помечаем приглашение как использованное
      await supabase.from('invitations')
        .update({ status: 'accepted', temp_password: null })
        .eq('id', invite.id)

      // 4. Принудительно перелогиниваемся, чтобы сессия была чистой
      await supabase.auth.signOut()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password: newPassword,
      })

      if (signInError) {
        setError('Не удалось войти после активации')
        setLoading(false)
        return
      }

      router.push('/')
    } catch (err) {
      setError('Непредвиденная ошибка')
      setLoading(false)
    }
  }

  // Показываем загрузку, пока идёт проверка
  if (initialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Проверка приглашения...</div>
      </div>
    )
  }

  // Приглашение не найдено
  if (!invite && !initialCheck) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="premium-card text-center">
          <h1 className="text-2xl font-bold text-deep-blue mb-4">Ошибка</h1>
          <p className="text-gray-600">{error || 'Приглашение не найдено'}</p>
          <button onClick={() => router.push('/login')} className="btn-gold mt-6">На страницу входа</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">Активация аккаунта</h1>
        <p className="text-sm text-gray-400 mb-6">
          Для {invite.email}. Роль: {invite.roles?.name}, компания: {invite.companies?.name}
        </p>

        {/* Шаг 1: временный пароль */}
        {!invite.tempPassConfirmed && (
          <form onSubmit={handleTempPassSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">Введите временный пароль, полученный от руководителя.</p>
            <input
              type="text"
              value={tempPassword}
              onChange={e => setTempPassword(e.target.value)}
              placeholder="Временный пароль"
              className="input-field"
              required
              autoComplete="off"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Проверка...' : 'Далее'}
            </button>
          </form>
        )}

        {/* Шаг 2: постоянный пароль */}
        {invite.tempPassConfirmed && (
          <form onSubmit={handleSetNewPass} className="space-y-4">
            <p className="text-sm text-gray-500">Придумайте новый пароль для входа.</p>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Новый пароль (мин. 6 символов)"
              className="input-field"
              required
              autoComplete="new-password"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Активация...' : 'Активировать аккаунт'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
