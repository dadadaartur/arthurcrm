import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import DatePicker from '../components/DatePicker'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    hire_date: '',
    birth_date: '',
    department_id: '',
    position_id: '',
    avatar_file: null,
    preview_url: ''
  })
  const fileInputRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (!profileData || profileData.deleted_at) { router.push('/welcome'); return }
      if (profileData) {
        setProfile(profileData)
        setForm({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          hire_date: profileData.hire_date || '',
          birth_date: profileData.birth_date || '',
          department_id: profileData.department_id || '',
          position_id: profileData.position_id || '',
          avatar_file: null,
          preview_url: profileData.avatar_url || ''
        })
      }
      if (profileData?.company_id) {
        const { data: deps } = await supabase.from('departments').select('*').eq('company_id', profileData.company_id)
        const { data: pos } = await supabase.from('positions').select('*').eq('company_id', profileData.company_id)
        setDepartments(deps || [])
        setPositions(pos || [])
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setForm({ ...form, avatar_file: file, preview_url: URL.createObjectURL(file) })
  }

  const handleRemoveAvatar = async () => {
    if (!profile) return
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', user.id)
    if (!error) {
      setProfile({ ...profile, avatar_url: null })
      setForm({ ...form, avatar_file: null, preview_url: '' })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const uploadAvatar = async (file) => {
    if (!file) return profile?.avatar_url || null
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, file, { upsert: true })
    if (error) {
      setMessage({ type: 'error', text: 'Ошибка загрузки аватара' })
      return profile?.avatar_url || null
    }
    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
    return publicUrl.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    let avatarUrl = profile?.avatar_url || null
    if (form.avatar_file) avatarUrl = await uploadAvatar(form.avatar_file)
    const updates = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      hire_date: form.hire_date || null,
      birth_date: form.birth_date || null,
      department_id: form.department_id ? parseInt(form.department_id) : null,
      position_id: form.position_id ? parseInt(form.position_id) : null,
      avatar_url: avatarUrl,
      display_name: `${form.first_name} ${form.last_name}`.trim() || profile?.email
    }
    const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id)
    if (error) setMessage({ type: 'error', text: 'Ошибка сохранения: ' + error.message })
    else {
      setMessage({ type: 'success', text: 'Профиль обновлён' })
      setProfile({ ...profile, ...updates })
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const initials = profile?.first_name && profile?.last_name
    ? (profile.first_name[0] + profile.last_name[0]).toUpperCase()
    : profile?.display_name
      ? profile.display_name.substring(0, 2).toUpperCase()
      : user?.email?.substring(0, 2).toUpperCase() || '?'

  // Должность меняет только админ компании (legacy-хардкод role_id 1/2 убран)
  const canEditPosition = profile?.is_company_admin === true

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10">
      {/* Шапка: стрелка на главную + заголовок */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-white">Мой профиль</h1>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-900/60 text-green-300 border border-green-700/40' : 'bg-red-900/60 text-red-300 border border-red-700/40'}`}>
          {message.text}
        </div>
      )}

      {/* Две колонки: карточка аватара слева, форма справа */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* === Карточка аватара === */}
        <div className="premium-card flex flex-col items-center" style={{ padding: '36px 24px' }}>
          <div
            className="relative group"
            style={{ cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Золотое кольцо вокруг аватара */}
            <div
              className="w-36 h-36 rounded-full overflow-hidden bg-gray-800"
              style={{
                border: '2px solid rgba(212,175,55,.5)',
                boxShadow: '0 0 30px rgba(212,175,55,.25)',
              }}
            >
              {form.preview_url ? (
                <img src={form.preview_url} alt="Аватар" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-semibold">
                  {initials}
                </div>
              )}
            </div>

            {/* Затемнение + золотая камера при наведении */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'rgba(10,22,40,.55)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8.5h2.2l1.4-2.3a1 1 0 0 1 .85-.5h7.1a1 1 0 0 1 .85.5l1.4 2.3H20a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8.5z" />
                <circle cx="12" cy="13.5" r="3.2" />
              </svg>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>

          <p className="mt-4 text-white font-semibold text-center">
            {`${form.first_name} ${form.last_name}`.trim() || profile?.display_name || user?.email}
          </p>
          <p className="text-xs text-gray-500 mt-1">{user?.email}</p>

          {profile?.avatar_url && (
            <button
              onClick={handleRemoveAvatar}
              className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Удалить фото
            </button>
          )}
          <p className="mt-3 text-[11px] text-gray-600 text-center">
            Нажмите на фото, чтобы загрузить новое
          </p>
        </div>

        {/* === Форма === */}
        <div className="premium-card">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Имя</label>
              <input type="text" className="input-field" value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Иван" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Фамилия</label>
              <input type="text" className="input-field" value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Петров" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Телефон</label>
              <input type="text" className="input-field" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+7 900 000-00-00" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Отдел</label>
              <select className="input-field" value={form.department_id}
                onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">Не выбран</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Дата трудоустройства</label>
              <DatePicker
                value={form.hire_date}
                onChange={v => setForm({ ...form, hire_date: v })}
                placeholder="Когда вы joined"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Дата рождения</label>
              <DatePicker
                value={form.birth_date}
                onChange={v => setForm({ ...form, birth_date: v })}
                placeholder="Выберите дату"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Должность</label>
              <select className="input-field" value={form.position_id}
                onChange={e => setForm({ ...form, position_id: e.target.value })}
                disabled={!canEditPosition}>
                <option value="">Не выбрана</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              {!canEditPosition && (
                <p className="text-[11px] text-gray-500 mt-1">Должность может изменить только администратор</p>
              )}
            </div>

            <button type="submit" disabled={saving} className="btn-gold w-full md:col-span-2"
              style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
