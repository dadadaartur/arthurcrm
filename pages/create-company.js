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
        setError('Ошибка регистрации: ' + signUpError.message)
        setSaving(false)
        return
      }
      userId = signUpData?.user?.id
      if (!userId) {
        setError('Не удалось создать аккаунт. Проверьте настройки подтверждения email.')
        setSaving(false)
        return
      }
    }

    // Загружаем логотип, если есть
    let logoUrl = null
    if (logoFile) logoUrl = await uploadLogo(logoFile)

    // Создаём компанию
    const { data: company, error: compError } = await supabase.from('companies').insert({
      name: name.trim(),
      description: description.trim(),
      logo_url: logoUrl
    }).select().single()

    if (compError) {
      setError('Ошибка создания компании: ' + compError.message)
      setSaving(false)
      return
    }

    // Привязываем пользователя к компании как администратора (роль 2)
    const { error: updateError } = await supabase.from('profiles').upsert({
      user_id: userId,
      company_id: company.id,
      role_id: 2,
      email: user?.email || email,
      display_name: user?.email || email
    }, { onConflict: 'user_id' })

    if (updateError) {
      setError('Ошибка привязки: ' + updateError.message)
      setSaving(false)
      return
    }

    // Всё готово – насильно перезагружаем страницу, чтобы контекст обновился
    window.location.href = '/company-admin'
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }}>
        <h1 className="text-2xl font-bold text-white mb-6">Создание компании</h1>
        <p className="text-gray-400 text-sm mb-6">
          Добро пожаловать! Для начала работы создайте компанию.
          {!user && ' Вам необходимо будет указать email и пароль для входа.'}
        </p>

        {error && <div className="bg-red-900 text-red-300 p-3 rounded-lg mb-4">{error}</div>}

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
