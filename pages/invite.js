import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Invite() {
  const router = useRouter()
  const { token } = router.query
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invite, setInvite] = useState(null)
  const [initialCheck, setInitialCheck] = useState(true)

  useEffect(() => {
    // Полная очистка всех данных браузера
    localStorage.clear()
    sessionStorage.clear()
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })

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

    if (fetchError || !data) {
      setError('Приглашение не найдено или уже использовано')
    } else {
      setInvite(data)
    }
    setInitialCheck(false)
  }

  async function handleSetPassword(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setLoading(true)
    setError('')

    // Пытаемся войти с временным паролем (он уже установлен администратором)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password: invite.temp_password,  // временный пароль = текущий пароль
    })

    if (signInError) {
      // Если временный пароль не подошёл – возможно, аккаунт ещё не создан.
      // Создаём аккаунт с временным паролем
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: invite.temp_password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Если создали – теперь пробуем сменить пароль
      await supabase.auth.signInWithPassword({
        email: invite.email,
        password: invite.temp_password,
      })
    }

    // Теперь мы авторизованы с временным паролем.
    // Меняем пароль на постоянный
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError('Не удалось установить новый пароль: ' + updateError.message)
      setLoading(false)
      return
    }

    // Создаём профиль, если его нет
    const user = (await supabase.auth.getUser()).data.user
    if (user) {
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
    }

    // Помечаем инвайт использованным
    await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)

    router.push('/')
  }

  if (initialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Проверка приглашения...</div>
      </div>
    )
  }

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
        <p className="text-sm text-gray-500 mb-4">Придумайте пароль для входа в систему.</p>
        <form onSubmit={handleSetPassword} className="space-y-4">
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
      </div>
    </div>
  )
}
