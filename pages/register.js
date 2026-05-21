import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Register() {
  const router = useRouter()
  const { token } = router.query

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [invite, setInvite] = useState(null)   // данные приглашения
  const [loading, setLoading] = useState(!!token) // если есть токен, сразу грузим инвайт

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
      setEmail(data.email || '') // предзаполняем email
    } else {
      setError('Приглашение не найдено или уже использовано')
    }
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    const user = signUpData?.user
    if (!user) {
      setError('Не удалось создать аккаунт')
      return
    }

    // Если регистрировались по инвайту – создаём профиль и помечаем приглашение
    if (invite) {
      // Создаём профиль
      await supabase.from('profiles').insert({
        user_id: user.id,
        company_id: invite.company_id,
        department_id: null, // можно позже уточнить
        role_id: invite.role_id,
        display_name: email,
        manager_id: invite.created_by, // тот, кто пригласил
      })

      // Помечаем инвайт использованным
      await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id)
    }

    // Редирект на главную
    router.push('/')
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Проверка приглашения...</div>
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-4">
          {invite ? 'Регистрация по приглашению' : 'Регистрация'}
        </h1>

        {invite && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-300">
            <p>Компания: <span className="text-white font-semibold">{invite.companies?.name}</span></p>
            <p>Роль: <span className="text-white font-semibold">{invite.roles?.name}</span></p>
            <p className="text-xs text-gray-500 mt-1">Приглашение действительно</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              required
              readOnly={!!invite?.email}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full">Зарегистрироваться</button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-gold hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  )
}
