import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Этапы: email -> (существующий? 'login' : (приглашение? 'tempPass' : 'noAccess'))
  const [step, setStep] = useState('email')
  const [invite, setInvite] = useState(null)

  // Проверка email: сначала ищем профиль, потом инвайт
  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    // 1. Ищем профиль (значит, пользователь уже активирован)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .or(`display_name.eq.${email},user_id.eq.${email}`)
      .maybeSingle()

    if (existingProfile) {
      setStep('login')
      setLoading(false)
      return
    }

    // 2. Если профиля нет — ищем активный инвайт
    const { data: inviteData, error: fetchError } = await supabase
      .from('invitations')
      .select('*, companies(name), roles(name)')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError || !inviteData) {
      setError('Доступ к платформе выдаёт руководитель')
      setLoading(false)
      return
    }

    setInvite(inviteData)
    setStep('tempPass')
    setLoading(false)
  }

  // Стандартный вход
  async function handleLogin(e) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    router.push('/')
  }

  // Проверка временного пароля
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

    setStep('setNewPass')
    setLoading(false)
  }

  // Активация аккаунта
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
        setError('Не удалось создать аккаунт')
        setLoading(false)
        return
      }

      // Создаём профиль
      await supabase.from('profiles').insert({
        user_id: user.id,
        company_id: invite.company_id,
        department_id: null,
        role_id: invite.role_id,
        display_name: email,
        manager_id: invite.created_by,
      })

      // Помечаем инвайт использованным
      await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)

      router.push('/')
    } catch (err) {
      setError('Непредвиденная ошибка')
      setLoading(false)
    }
  }

  const isModalOpen = error === 'Доступ к платформе выдаёт руководитель'

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">Вход в Кармический банк</h1>

        {/* Шаг 1: ввод email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Ваш email"
              className="input-field"
              required
            />
            {error && !isModalOpen && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Проверка...' : 'Продолжить'}
            </button>
          </form>
        )}

        {/* Шаг 2: стандартный вход */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-sm text-gray-400">Введите пароль для {email}</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Пароль"
              className="input-field"
              required
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        )}

        {/* Шаг 3: временный пароль */}
        {step === 'tempPass' && (
          <form onSubmit={handleTempPassSubmit} className="space-y-4">
            <p className="text-sm text-gray-400">На ваш email отправлен временный пароль. Введите его ниже.</p>
            <input
              type="text"
              value={tempPassword}
              onChange={e => setTempPassword(e.target.value)}
              placeholder="Временный пароль"
              className="input-field"
              required
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Проверка...' : 'Далее'}
            </button>
          </form>
        )}

        {/* Шаг 4: установка постоянного пароля */}
        {step === 'setNewPass' && (
          <form onSubmit={handleSetNewPass} className="space-y-4">
            <p className="text-sm text-gray-400">Придумайте новый пароль для входа в систему.</p>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              className="input-field"
              required
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full" disabled={loading}>
              {loading ? 'Активация...' : 'Активировать аккаунт'}
            </button>
          </form>
        )}

        {/* Модальное окно "Доступ выдаёт руководитель" */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setError('')}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">Доступ к платформе</h3>
              <p className="text-gray-600">Доступ к платформе выдаёт руководитель. Пожалуйста, обратитесь к администратору компании.</p>
              <button onClick={() => setError('')} className="btn-gold mt-6">Понятно</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
