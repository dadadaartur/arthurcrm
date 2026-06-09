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
  
  // ВАЖНО: Начинаем со значения false, чтобы форма НЕ БЫЛА заблокирована по умолчанию
  const [isCheckingToken, setIsCheckingToken] = useState(false)

  useEffect(() => {
    // Если роутер еще не готов, мы просто ждем, но форма входа уже доступна для обычных пользователей!
    if (!router.isReady) return 

    if (token) {
      fetchInvite(token)
    }
  }, [token, router.isReady])

  async function fetchInvite(t) {
    setIsCheckingToken(true)
    setError('')
    
    // СТРАХОВКА: Если Supabase зависнет намертво, через 4 секунды мы принудительно отключим загрузку
    const timer = setTimeout(() => {
      setIsCheckingToken(false)
      setError('Превышено время ожидания ответа от сервера (тайм-аут)')
    }, 4000)

    try {
      if (!supabase) throw new Error("Клиент Supabase отсутствует")

      const { data, error: supabaseError } = await supabase
        .from('invitations')
        .select('*, companies(name), roles(name)')
        .eq('token', t)
        .eq('status', 'pending')
        .maybeSingle()

      if (supabaseError) throw supabaseError

      if (data) {
        setInvite(data)
        setEmail(data.email || '')
        setStep('tempPass')
      } else {
        setError('Приглашение не найдено, устарело или уже использовано')
      }
    } catch (err) {
      console.error('Ошибка при запросе инвайта:', err)
      setError(`Ошибка проверки токена: ${err.message || 'нет связи с БД'}`)
    } finally {
      clearTimeout(timer) // Всё прошло штатно, отменяем экстренный тайм-аут
      setIsCheckingToken(false)
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
        const { data: inviteData } = await supabase
          .from('invitations')
          .select('*, companies(name), roles(name)')
          .eq('email', normalizedEmail)
          .eq('status', 'pending')
          .maybeSingle()

        if (inviteData) {
          setInvite(inviteData)
          setEmail(inviteData.email)
          setStep('tempPass')
          setLoading(false)
          return
        }
      }

      setError('Неверный email или пароль')
    } catch (err) {
      setError('Не удалось связаться с сервером авторизации')
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
        setError('Ошибка создания аккаунта. Возможно, включено подтверждение по Email.')
        setLoading(false)
        return
      }

      // Создаем профиль
      await supabase.from('profiles').insert({
        user_id: user.id,
        company_id: invite.company_id,
        department_id: null,
        role_id: invite.role_id,
        display_name: invite.email,
        email: invite.email,
        manager_id: invite.created_by,
      })

      // Закрываем инвайт
      await supabase
        .from('invitations')
        .update({ status: 'accepted', temp_password: null })
        .eq('id', invite.id)

      window.location.href = '/'
    } catch (err) {
      setError('Критическая ошибка при сохранении пароля')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">
          {step === 'tempPass' || step === 'setNewPass' ? 'Активация аккаунта' : 'Вход в Кармический банк'}
        </h1>

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}

        {/* Если идет проверка токена из URL, покажем аккуратную плашку вместо блокировки всего экрана */}
        {isCheckingToken ? (
          <div className="text-center py-6 text-gray-400 animate-pulse">
            Проверка вашего приглашения...
          </div>
        ) : (
          <>
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
                  Для {invite.email} требуется активация. Введите временный пароль.
                </p>
                <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Временный пароль" className="input-field" required />
                <button type="submit" className="btn-gold w-full" disabled={loading}>
                  {loading ? 'Проверка...' : 'Далее'}
                </button>
              </form>
            )}

            {step === 'setNewPass' && (
              <form onSubmit={handleSetNewPass} className="space-y-4">
                <p className="text-sm text-gray-400">Придумайте новый пароль (минимум 6 символов).</p>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль" className="input-field" required />
                <button type="submit" className="btn-gold w-full" disabled={loading}>
                  {loading ? 'Активация...' : 'Активировать аккаунт'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
