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

  async function handleActivation(e) {
    e.preventDefault()
    if (!tempPassword || !newPassword || newPassword.length < 6) {
      setError('Проверьте правильность заполнения полей')
      return
    }
    setLoading(true)
    setError('')

    // 1. Сверяем временный пароль
    if (tempPassword !== invite.temp_password) {
      setError('Неверный временный пароль')
      setLoading(false)
      return
    }

    // 2. Пытаемся зарегистрировать пользователя
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password: newPassword,
    })

    // Если ошибка "User already registered" – значит, пользователь уже существует.
    if (signUpError && signUpError.message.includes('already registered')) {
      // Логинимся с новым паролем
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password: newPassword,
      })
      if (signInError) {
        setError('Не удалось войти. Возможно, пароль не подходит.')
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
      await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)
      router.push('/')
      return
    }

    // Если другая ошибка
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 3. Успешная регистрация – создаём профиль
    const user = signUpData?.user
    if (!user) {
      setError('Не удалось создать аккаунт')
      setLoading(false)
      return
    }

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

    // 4. Помечаем инвайт использованным
    await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)

    // 5. Перелогиниваемся для чистой сессии
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
        <form onSubmit={handleActivation} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Временный пароль (от руководителя)</label>
            <input
              type="text"
              value={tempPassword}
              onChange={e => setTempPassword(e.target.value)}
              placeholder="Временный пароль"
              className="input-field"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Придумайте новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Новый пароль (мин. 6 символов)"
              className="input-field"
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={loading}>
            {loading ? 'Активация...' : 'Активировать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  )
}
