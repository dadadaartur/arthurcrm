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
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState(null)

  // Прямой вход
  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (signInError) {
      setError('Неверный email или пароль')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  // Шаг 1: проверка email для активации
  async function handleInviteCheck(e) {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return
    setLoading(true)
    setError('')

    const { data: inviteData, error: fetchError } = await supabase
      .from('invitations')
      .select('*, companies(name), roles(name)')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError || !inviteData) {
      setError('Код приглашения не найден для этого email')
      setLoading(false)
      return
    }

    setInvite(inviteData)
    setLoading(false)
  }

  // Активация: временный пароль
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

    setInvite({ ...invite, tempPassConfirmed: true })
    setLoading(false)
  }

  // Активация: установка постоянного пароля
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

      await supabase.from('profiles').insert({
        user_id: user.id,
        company_id: invite.company_id,
        department_id: null,
        role_id: invite.role_id,
        display_name: email,
        email: invite.email,
        manager_id: invite.created_by,
      })

      await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)

      router.push('/')
    } catch (err) {
      setError('Непредвиденная ошибка')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">Вход в Кармический банк</h1>

        {/* Основная форма входа */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" className="input-field" required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            У меня есть код приглашения
          </button>
        </div>

        {/* Блок активации */}
        {showInvite && (
          <div className="mt-6 border-t border-gray-700 pt-4">
            <form onSubmit={handleInviteCheck} className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email из приглашения" className="input-field" required />
              <button type="submit" className="btn-gold w-full" disabled={loading}>Проверить</button>
            </form>

            {invite && !invite.tempPassConfirmed && (
              <form onSubmit={handleTempPassSubmit} className="mt-4 space-y-4">
                <p className="text-sm text-gray-400">Временный пароль из письма</p>
                <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Временный пароль" className="input-field" required />
                <button type="submit" className="btn-gold w-full" disabled={loading}>Далее</button>
              </form>
            )}

            {invite && invite.tempPassConfirmed && (
              <form onSubmit={handleSetNewPass} className="mt-4 space-y-4">
                <p className="text-sm text-gray-400">Придумайте новый пароль</p>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль" className="input-field" required />
                <button type="submit" className="btn-gold w-full" disabled={loading}>Активировать</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
