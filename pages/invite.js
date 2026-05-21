import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Invite() {
  const router = useRouter()
  const { token } = router.query

  const [email, setEmail] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invite, setInvite] = useState(null)

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
  }

  async function handleActivate(e) {
    e.preventDefault()
    if (!tempPassword || !newPassword) return
    setLoading(true)
    setError('')

    // Проверяем временный пароль
    if (tempPassword !== invite.temp_password) {
      setError('Неверный временный пароль')
      setLoading(false)
      return
    }

    // Создаём аккаунт через Supabase Auth
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
      setLoading(false)
      return
    }

    // Помечаем инвайт использованным
    await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)

    // Редирект на главную
    router.push('/')
  }

  if (!token) return <div className="p-8 text-center text-gray-400">Недействительная ссылка</div>

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">Активация аккаунта</h1>
        {invite && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-300">
            <p>Компания: <span className="text-white font-semibold">{invite.companies?.name}</span></p>
            <p>Роль: <span className="text-white font-semibold">{invite.roles?.name}</span></p>
            <p className="text-xs text-gray-500 mt-1">Email: {invite.email}</p>
          </div>
        )}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {!invite && !error && <p className="text-gray-400">Загрузка...</p>}
        {invite && (
          <form onSubmit={handleActivate} className="space-y-4">
            <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Временный пароль из письма" className="input-field" required />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Придумайте новый пароль" className="input-field" required />
            <button type="submit" className="btn-gold w-full" disabled={loading}>{loading ? 'Активация...' : 'Активировать аккаунт'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
