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
      // С телефона — сразу в мобильное приложение, а не на десктопную
      // главную (которую всё равно тут же перехватит блокировка
      // маленьких экранов).
      window.location.href = window.innerWidth < 820 ? '/app' : '/'
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
    <div className="theme-light max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Вход в Кармический банк</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" className="input-field" required />
          {error && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>}
          <button type="submit" className="btn-gold" style={{ minWidth: 160 }} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <button onClick={handleForgotPassword} className="mt-4 text-xs underline" style={{ color: 'var(--text-secondary)' }}>
          Забыли пароль?
        </button>

        <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Нет аккаунта?{' '}
          <a href="/create-company" className="hover:underline" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
            Создать компанию
          </a>
        </div>
      </div>
    </div>
  )
}

// Флаг для _app.js
Login.bypassLayout = true
