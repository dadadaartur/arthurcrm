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
  const [inviteLoading, setInviteLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Недействительная ссылка')
      setInviteLoading(false)
      return
    }
    fetchInvite(token)
  }, [token])

  async function fetchInvite(t) {
    setInviteLoading(true)
    const { data, error: fetchError } = await supabase
      .from('invitations')
      .select('*, companies(name), roles(name)')
      .eq('token', t)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError || !data) {
      setError('Приглашение не найдено или уже использовано')
      setInvite(null)
    } else {
      setInvite(data)
      setEmail(data.email || '')
      setError('')
    }
    setInviteLoading(false)
  }

  async function handleActivate(e) {
    e.preventDefault()
    if (!tempPassword || !newPassword) return
    setLoading(true)
    setError('')

    if (tempPassword !== invite.temp_password) {
      setError('Неверный временный пароль')
      setLoading(false)
      return
    }

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

      await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)
      router.push('/')
    } catch (err) {
      setError('Непредвиденная ошибка')
      setLoading(false)
    }
  }

  if (!token) return <div className="p-8 text-center text-gray-400">Недействительная ссылка</div>
  if (inviteLoading) return <div className="p-8 text-center text-gray-400">Загрузка приглашения...</div>

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
        {invite && (
          <form onSubmit={handleActivate} className="space-y-4">
            <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Временный пароль из письма" className="input-field" required />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Придумайте новый пароль" className="input-field" required />
            <button type="submit" className="btn-gold w-full" disabled={loading}>{loading ? 'Активация...' : 'Активировать аккаунт'}</button>
          </form>
        )}
        {!invite && !inviteLoading && (
          <p className="text-gray-400">Приглашение не найдено. Проверьте ссылку или обратитесь к администратору.</p>
        )}
      </div>
    </div>
  )
}
