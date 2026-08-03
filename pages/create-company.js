import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

export default function CreateCompany() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [signUpPending, setSignUpPending] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Пользователь уже авторизован
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
        if (profile?.company_id) {
          // У него уже есть компания – идём на главную
          router.push('/')
          return
        }
        // Нет компании – пусть создаёт
        setUser(user)
      }
      setLoading(false)
    }
    init()
  }, [router])

  const uploadLogo = async (file) => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, file, { upsert: true })
    if (error) return null
    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
    return publicUrl.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')

    let userId = user?.id
    let userEmail = user?.email || email
    let hasSession = !!user

    // Если пользователь не авторизован, регистрируем его прямо здесь
    if (!userId) {
      if (!email || !password) {
        setError('Введите email и пароль для регистрации')
        setSaving(false)
        return
      }
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password
      })
      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          setError('Этот email уже зарегистрирован. Войдите в аккаунт и создайте компанию из личного кабинета. Если вы не помните пароль — воспользуйтесь восстановлением доступа.')
        } else {
          setError('Ошибка регистрации: ' + signUpError.message)
        }
        setSaving(false)
        return
      }
      userId = signUpData?.user?.id || signUpData?.session?.user?.id
      if (!userId) {
        setError('Не удалось создать аккаунт. Проверьте настройки подтверждения email.')
        setSaving(false)
        return
      }
      userEmail = email.trim().toLowerCase()
      // Если в проекте включено подтверждение email, signUp не выдаёт
      // сессию — supabase.auth.getSession() вернёт null, пока пользователь
      // не подтвердит почту. Создание компании ниже идёт через серверный
      // API с service-role ключом, поэтому от наличия сессии не зависит —
      // но она нужна нам, чтобы понять, можно ли сразу пускать на /company-admin
      // или показать "проверьте почту".
      const { data: sessionData } = await supabase.auth.getSession()
      hasSession = !!sessionData?.session
    }

    // Загружаем логотип, если есть
    let logoUrl = null
    if (logoFile) logoUrl = await uploadLogo(logoFile)

    // Компанию, роль администратора и профиль создаём одним серверным
    // вызовом через service-role ключ — так это работает независимо от
    // того, есть ли у пользователя активная сессия (см. lib/auth.js и
    // pages/api/create-company.js).
    let apiResult
    try {
      const headers = { 'Content-Type': 'application/json' }
      const sessionData = await supabase.auth.getSession()
      if (sessionData?.data?.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.data.session.access_token}`
      }

      const res = await fetch('/api/create-company', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          name: name.trim(),
          description: description.trim(),
          logoUrl,
          email: userEmail
        })
      })
      apiResult = await res.json()
      if (!res.ok) {
        setError(apiResult.error || 'Ошибка создания компании')
        setSaving(false)
        return
      }
    } catch (err) {
      setError('Внутренняя ошибка сервера')
      setSaving(false)
      return
    }

    if (hasSession) {
      // Пользователь уже авторизован (или email confirmation отключён,
      // и signUp сразу выдал сессию) — можно сразу вести в кабинет.
      window.location.href = '/company-admin'
    } else {
      // Аккаунт и компания созданы, но подтверждение почты ещё не
      // пройдено — сессии нет. Просим подтвердить email и войти.
      setSaving(false)
      setSignUpPending(true)
    }
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  if (signUpPending) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }}>
          <h1 className="text-2xl font-bold text-white mb-4">Почти готово</h1>
          <p className="text-gray-400 text-sm mb-4">
            Аккаунт и компания «{name.trim()}» созданы. Мы отправили письмо с подтверждением на {email.trim().toLowerCase()}.
            Подтвердите почту по ссылке из письма, а затем войдите — компания уже будет вас ждать.
          </p>
          <a href="/login" className="btn-gold w-full inline-block text-center">Перейти ко входу</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }}>
        <h1 className="text-2xl font-bold text-white mb-6">Создание компании</h1>
        <p className="text-gray-400 text-sm mb-6">
          Добро пожаловать! Для начала работы создайте компанию.
          {!user && ' Вам необходимо будет указать email и пароль для входа.'}
        </p>

        {error && (
          <div className="bg-red-900 text-red-300 p-3 rounded-lg mb-4">
            <div>{error}</div>
            {!user && (
              <a href="/login" className="btn-outline inline-block mt-3">
                Войти в аккаунт
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Название компании *</label>
            <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-gray-400">Описание</label>
            <textarea className="input-field" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {!user && (
            <>
              <div>
                <label className="text-sm text-gray-400">Email для входа *</label>
                <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm text-gray-400">Пароль *</label>
                <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                <p className="text-xs text-gray-500 mt-1">Минимум 6 символов</p>
              </div>
            </>
          )}

          <div>
            <label className="text-sm text-gray-400">Логотип</label>
            <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="mt-2 text-sm text-gray-400" />
          </div>
          <button type="submit" disabled={saving} className="btn-gold w-full">
            {saving ? 'Создание...' : 'Создать компанию'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Этот флаг заставляет _app.js не оборачивать страницу в Layout,
// чтобы неавторизованные пользователи могли создавать компанию
CreateCompany.bypassLayout = true
