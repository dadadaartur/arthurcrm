import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Раньше здесь была ветка с "временным паролем" (invitations.temp_password),
// которая читала таблицу invitations напрямую с клиента, в открытом виде,
// без RLS-защиты. Такие записи в проекте нигде и не создавались (см.
// pages/company-admin/employees.js — раньше сотрудников просто вставляли
// в profiles без приглашения), так что этот код был мёртвым и одновременно
// дырой в безопасности.
//
// Новый флоу приглашения сотрудника — через Supabase Auth magic link:
// pages/api/company-admin/invite-employee.js отправляет письмо,
// пользователь переходит по ссылке на /invite-callback, где уже задаёт
// пароль и активирует аккаунт. Обычный /login теперь — просто вход по
// email+паролю для тех, у кого аккаунт уже активирован.

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (!signInError) {
      window.location.href = '/'
      return
    }

    setError('Неверный email или пароль. Если вы получили приглашение по почте — перейдите по ссылке из письма, а не сюда.')
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Введите email, чтобы восстановить пароль')
      return
    }
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/invite-callback`
    })
    if (resetError) {
      setError('Не удалось отправить письмо: ' + resetError.message)
    } else {
      setError('Письмо для восстановления пароля отправлено, если такой аккаунт существует.')
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">Вход в Кармический банк</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" className="input-field" required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <button onClick={handleForgotPassword} className="mt-4 text-xs text-gray-400 hover:text-gold underline">
          Забыли пароль?
        </button>

        <div className="mt-6 text-center text-sm text-gray-400">
          Нет аккаунта?{' '}
          <a href="/create-company" className="text-gold hover:underline">
            Создать компанию
          </a>
        </div>
      </div>
    </div>
  )
}

// Флаг для _app.js
Login.bypassLayout = true
