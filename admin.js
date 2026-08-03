import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

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

      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (profileData) {
        setProfile(profileData)
        setForm({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          hire_date: profileData.hire_date || '',
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-white mb-8">Мой профиль</h1>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-800">
            {form.preview_url ? (
              <img src={form.preview_url} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl font-semibold">{initials}</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="avatar-upload" />
            <label htmlFor="avatar-upload" className="action-btn text-xs px-4 py-2 cursor-pointer text-center">
              Загрузить фото
            </label>
            {profile?.avatar_url && (
              <button type="button" onClick={handleRemoveAvatar} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Удалить фото
              </button>
            )}
          </div>
        </div>

        {/* Остальные поля без изменений */}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm text-gray-400">Имя</label><input type="text" className="input-field" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
          <div><label className="text-sm text-gray-400">Фамилия</label><input type="text" className="input-field" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
        </div>
        <div><label className="text-sm text-gray-400">Телефон</label><input type="text" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label className="text-sm text-gray-400">Дата трудоустройства</label><input type="date" className="input-field" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></div>
        <div><label className="text-sm text-gray-400">Отдел</label>
          <select className="input-field" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
            <option value="">Не выбран</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400">Должность</label>
          <select className="input-field" value={form.position_id} onChange={e => setForm({ ...form, position_id: e.target.value })} disabled={profile?.role_id !== 1 && profile?.role_id !== 2}>
            <option value="">Не выбрана</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {profile?.role_id !== 1 && profile?.role_id !== 2 && <p className="text-xs text-gray-500 mt-1">Должность может изменить только администратор</p>}
        </div>

        <button type="submit" disabled={saving} className="btn-gold w-full">{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </form>
    </div>
  )
}
