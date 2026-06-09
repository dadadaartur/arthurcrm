import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()
  const { token } = router.query
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('login')
  const [invite, setInvite] = useState(null)
  const [initialCheck, setInitialCheck] = useState(true)

  useEffect(() => {
    if (!router.isReady) return // Ждём, пока Next.js загрузит query

    console.log("Next.js готов. Токен в URL:", token)

    if (token) {
      fetchInvite(token)
    } else {
      setInitialCheck(false) // Если токена нет, сразу показываем форму входа
    }
  }, [token, router.isReady])

  async function fetchInvite(t) {
    setInitialCheck(true)
    setError('')
    
    try {
      console.log("Запускаем запрос к Supabase для токена:", t)

      if (!supabase) {
        throw new Error("Клиент Supabase не инициализирован. Проверьте файл ../lib/supabaseClient")
      }

      const { data, error: supabaseError } = await supabase
        .from('invitations')
        .select('*, companies(name), roles(name)')
        .eq('token', t)
        .eq('status', 'pending')
        .maybeSingle()

      if (supabaseError) throw supabaseError

      if (data) {
        console.log("Инвайт успешно найден:", data)
        setInvite(data)
        setEmail(data.email || '')
        setStep('tempPass')
      } else {
        setError('Приглашение не найдено или уже использовано')
      }
    } catch (err) {
      console.error('Критическая ошибка при загрузке инвайта:', err)
      setError(`Не удалось проверить приглашение: ${err.message || 'Неизвестная ошибка'}`)
    } finally {
      // Этот блок выполнится в любом случае: при успехе или при жестком краше
      console.log("Выключаем бесконечный лоадер")
      setInitialCheck(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (!signInError) {
        window.location.href = '/'
        return
      }

      if (signInError.message.includes('Invalid login credentials')) {
        const { data: inviteData, error: inviteError } = await supabase
          .from('invitations')
          .select('*, companies(name), roles(name)')
          .eq('email', normalizedEmail)
          .eq('status', 'pending')
          .maybeSingle()

        if (inviteError) throw inviteError

        if (inviteData) {
          setInvite(inviteData)
          setEmail(inviteData.email)
          setStep('tempPass')
          setLoading(false)
          return
        }

        setError('Неверный email или пароль')
        setLoading(false)
        return
      }

      setError(signInError.message)
    } catch (err) {
      console.error('Ошибка при логине:', err)
      setError('Ошибка соединения с сервером авторизации')
    } finally {
      setLoading(false)
    }
  }

  async function handleTempPassSubmit(e) {
    e.preventDefault()
    if (!tempPassword) return
    setLoading(true)
    setError('')

    if (tempPassword !== invite?.temp_password) {
      setError('Неверный временный пароль')
      setLoading(false)
      return
    }

    setStep('setNewPass')
    setLoading(false)
  }

  async function handleSetNewPass(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setLoading(true)
    setError('')

    try {
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
        setError('Не удалось создать аккаунт. Возможно, требуется подтверждение Email в консоли Supabase.')
        setLoading(false)
        return
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: user.id,
        company_id: invite.company_id,
        department_id: null,
        role_id: invite.role_id,
        display_name: invite.email,
        email: invite.email,
        manager_id: invite.created_by,
      })

      if (profileError) console.error('Ошибка создания профиля (RLS?):', profileError)

      await supabase
        .from('invitations')
        .update({ status: 'accepted', temp_password: null })
        .eq('id', invite.id)

      window.location.href = '/'
    } catch (err) {
      console.error('Ошибка на шаге установки пароля:', err)
      setError('Непредвиденная ошибка при активации')
      setLoading(false)
    }
  }

  if (initialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Проверка приглашения...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">
          {step === 'tempPass' || step === 'setNewPass' ? 'Активация аккаунта' : 'Вход в Кармический банк'}
        </h1>

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" className="input-field" required />
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        )}

        {step === 'tempPass' && invite && (
          <form onSubmit={handleTempPassSubmit} className="space-y-4">
            <p className="text-sm text-gray-400">
              Для {invite.email} требуется активация. Введите временный пароль, полученный от администратора.
            </p>
            <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Временный пароль" className="input-field" required />
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Проверка...' : 'Далее'}
            </button>
          </form>
        )}

        {step === 'setNewPass' && (
          <form onSubmit={handleSetNewPass} className="space-y-4">
            <p className="text-sm text-gray-400">Придумайте новый пароль для входа в систему.</p>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль (минимум 6 символов)" className="input-field" required />
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Активация...' : 'Активировать аккаунт'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
