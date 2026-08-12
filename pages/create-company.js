import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// ВАЖНО: раньше по этому пути (pages/create-company.js — сама СТРАНИЦА)
// лежал код серверного API-хендлера (дубликат pages/api/create-company.js).
// Next.js не может отрендерить экспортированную функцию handler(req, res)
// как React-компонент — сборка падала на "Export encountered errors on
// following paths: /create-company" (TypeError: t.status is not a function,
// react-dom пытался вызвать res.status(...) как часть рендера). Из-за
// падения сборки Vercel не выкатывал новый деплой вообще, и все остальные
// правки (deleted_at, permission-проверки и т.д.) до этого момента не
// попадали в прод. Восстанавливаю настоящую форму.
//
// Логика соответствует pages/api/create-company.js:
//  - signUp создаёт auth-пользователя (обычно БЕЗ сессии, пока не
//    подтверждён email — так настроен проект);
//  - сразу же (в течение 15 минут, см. API) отправляем запрос на создание
//    компании по userId, не дожидаясь подтверждения почты;
//  - компания создаётся со статусом 'pending' и ждёт модерации
//    супер-админом в /platform-admin — это отдельный экран в Layout.js.
export default function CreateCompany() {
  const [step, setStep] = useState('form') // 'form' | 'success'
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    description: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const email = form.email.trim().toLowerCase()
    const name = form.name.trim()

    if (!email || !form.password || !name) {
      setError('Заполните email, пароль и название компании')
      return
    }
    if (form.password.length < 6) {
      setError('Пароль должен быть не короче 6 символов')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password
      })

      if (signUpError) {
        setError(signUpError.message === 'User already registered'
          ? 'Такой email уже зарегистрирован. Если это ваш аккаунт — войдите и создайте компанию из личного кабинета.'
          : 'Не удалось зарегистрироваться: ' + signUpError.message)
        setLoading(false)
        return
      }

      const newUser = signUpData?.user
      if (!newUser) {
        setError('Не удалось создать аккаунт, попробуйте ещё раз')
        setLoading(false)
        return
      }

      const hasSession = !!signUpData.session

      const res = await fetch('/api/create-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hasSession ? { Authorization: `Bearer ${signUpData.session.access_token}` } : {})
        },
        body: JSON.stringify({
          userId: newUser.id,
          email,
          name,
          description: form.description.trim()
        })
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Не удалось создать компанию')
        setLoading(false)
        return
      }

      if (hasSession) {
        // Подтверждение email не требуется — пользователь уже вошёл.
        // ВАЖНО: обычный router.push('/') тут не годится — это клиентская
        // навигация без перезагрузки, а ProfileContext ещё не успевает
        // подхватить только что созданную сессию (гонка состояний), из-за
        // чего на секунду мелькает публичный лендинг вместо личного
        // кабинета. window.location.href делает полную перезагрузку,
        // ProfileContext инициализируется заново уже с готовой сессией.
        window.location.href = '/'
        return
      }

      setStep('success')
      setLoading(false)
    } catch (err) {
      setError('Ошибка сети: ' + err.message)
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="premium-card text-center">
          <h1 className="text-2xl font-bold text-deep-blue mb-4">Почти готово</h1>
          <p className="text-[var(--lumen-ink-soft)] mb-2">
            Мы отправили письмо для подтверждения на <b>{form.email.trim().toLowerCase()}</b>.
          </p>
          <p className="text-[var(--lumen-ink-soft)]">
            Подтвердите email, затем войдите — компания «{form.name.trim()}» уже создана
            и отправлена на модерацию администратору Кармического банка.
          </p>
          <a href="/login" className="text-gold hover:underline mt-6 inline-block">Перейти ко входу</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-2">Регистрация компании</h1>
        <p className="text-sm text-[var(--lumen-ink-soft)] mb-4">
          Эта форма — для руководителя, который заводит компанию с нуля.
          Если вас пригласили как сотрудника — используйте ссылку из письма-приглашения, а не эту форму.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Название компании"
            className="input-field"
            required
          />
          <textarea
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="Краткое описание (необязательно)"
            className="input-field"
            rows={2}
          />
          <input
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="Ваш email (будете входить под ним как админ компании)"
            className="input-field"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={e => update('password', e.target.value)}
            placeholder="Пароль"
            className="input-field"
            required
          />
          <input
            type="password"
            value={form.passwordConfirm}
            onChange={e => update('passwordConfirm', e.target.value)}
            placeholder="Повторите пароль"
            className="input-field"
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-lumen w-full" disabled={loading}>
            {loading ? 'Создаём...' : 'Создать компанию'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--lumen-ink-soft)]">
          Уже есть аккаунт?{' '}
          <a href="/login" className="text-gold hover:underline">Войти</a>
        </div>
      </div>
    </div>
  )
}
