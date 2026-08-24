import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

// Сюда редиректит Supabase после перехода по ссылке из письма-приглашения
// (см. redirectTo в pages/api/company-admin/invite-employee.js). Supabase
// JS-клиент по умолчанию сам разбирает токены сессии из URL-хэша
// (detectSessionInUrl) — нам не нужно ничего парсить руками, что и
// исключает повторение прошлой ошибки с токенами в query-string.

export default function InviteCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('checking') // checking | need_password | joined | error
  const [error, setError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Дадим supabase-js время разобрать токены из URL-хэша
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Ссылка недействительна или устарела. Попросите администратора отправить новое приглашение.')
        setStatus('error')
        return
      }
      setStatus('need_password')
    }
    init()
  }, [])

  const finishSetup = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setSaving(true)
    setError('')

    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
    if (pwError) {
      setError('Не удалось задать пароль: ' + pwError.message)
      setSaving(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      })
      const result = await res.json()
      if (!res.ok || result.status === 'no_invite') {
        setError('Приглашение не найдено. Обратитесь к администратору компании.')
        setSaving(false)
        return
      }
      setStatus('joined')
      setTimeout(() => { window.location.href = '/' }, 1200)
    } catch (err) {
      setError('Внутренняя ошибка сервера')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-white mb-4">Активация приглашения</h1>

        {status === 'checking' && <p className="text-gray-400">Проверяем ссылку...</p>}

        {status === 'error' && (
          <>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <a href="/login" className="btn-gold w-full inline-block text-center">На страницу входа</a>
          </>
        )}

        {status === 'need_password' && (
          <form onSubmit={finishSetup} className="space-y-4">
            <p className="text-sm text-gray-400">Придумайте пароль для входа в систему.</p>
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
            <button type="submit" className="btn-gold w-full" disabled={saving}>
              {saving ? 'Активация...' : 'Войти в систему'}
            </button>
          </form>
        )}

        {status === 'joined' && <p className="text-green-500">Готово! Переходим в личный кабинет...</p>}
      </div>
    </div>
  )
}

InviteCallback.bypassLayout = true
