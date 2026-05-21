import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Onboarding() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Проверим, не появился ли уже профиль (вдруг мы обновились)
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profile) {
        router.push('/')
        return
      }

      // Попытка восстановить инвайт из localStorage
      const savedInviteId = localStorage.getItem(`pending_invite_${user.id}`)
      if (savedInviteId) {
        setMessage('Найдено сохранённое приглашение. Привязываем...')
        await tryAutoBind(user, savedInviteId)
      }
    }
    init()
  }, [])

  async function tryAutoBind(user, inviteId) {
    // Получаем инвайт по id
    const { data: invite } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', inviteId)
      .eq('status', 'pending')
      .single()

    if (!invite) {
      setError('Сохранённое приглашение уже недействительно')
      localStorage.removeItem(`pending_invite_${user.id}`)
      return
    }

    await createProfile(user, invite)
  }

  async function createProfile(user, invite) {
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: user.id,
      company_id: invite.company_id,
      department_id: null,
      role_id: invite.role_id,
      display_name: user.email,
      manager_id: invite.created_by,
    })

    if (profileError) {
      setError('Ошибка при создании профиля: ' + profileError.message)
      return
    }

    await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id)
    localStorage.removeItem(`pending_invite_${user.id}`)
    router.push('/')
  }

  async function handleTokenSubmit(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')

    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token.trim())
      .eq('status', 'pending')
      .single()

    if (inviteError || !invite) {
      setError('Приглашение не найдено или уже использовано')
      setLoading(false)
      return
    }

    await createProfile(user, invite)
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">Привязка к компании</h1>
        <p className="text-sm text-gray-400 mb-6">
          Ваш аккаунт ещё не привязан к компании. Введите код приглашения, полученный от администратора.
        </p>

        {message && <p className="text-green-400 text-sm mb-4">{message}</p>}

        <form onSubmit={handleTokenSubmit} className="space-y-4">
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Введите код приглашения"
            className="input-field"
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={loading}>
            {loading ? 'Привязка...' : 'Привязаться к компании'}
          </button>
        </form>
      </div>
    </div>
  )
}
