import { useEffect, useState } from 'react'
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

  // Справочники
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])

  // Форма
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    hire_date: '',
    department_id: '',
    position_id: '',
    avatar_file: null
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      // Загружаем профиль
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setForm({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          hire_date: profileData.hire_date || '',
          department_id: profileData.department_id || '',
          position_id: profileData.position_id || '',
          avatar_file: null
        })
      }

      // Загружаем справочники
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
    if (form.avatar_file) {
      avatarUrl = await uploadAvatar(form.avatar_file)
    }

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

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)

    if (error) {
      setMessage({ type: 'error', text: 'Ошибка сохранения: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Профиль обновлён' })
      // Обновляем локальное состояние
      setProfile({ ...profile, ...updates })
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-white mb-8">Мой профиль</h1>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Аватар */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">?</div>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-400">Аватар</label>
            <input type="file" accept="image/*" onChange={e => setForm({ ...form, avatar_file: e.target.files[0] })} className="mt-1 text-sm text-gray-400" />
          </div>
        </div>

        {/* ФИО */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Имя</label>
            <input type="text" className="input-field" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-400">Фамилия</label>
            <input type="text" className="input-field" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
          </div>
        </div>

        {/* Телефон */}
        <div>
          <label className="text-sm text-gray-400">Телефон</label>
          <input type="text" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>

        {/* Дата трудоустройства */}
        <div>
          <label className="text-sm text-gray-400">Дата трудоустройства</label>
          <input type="date" className="input-field" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
        </div>

        {/* Отдел и должность */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Отдел</label>
            <select className="input-field" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Не выбран</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Должность</label>
            <select className="input-field" value={form.position_id} onChange={e => setForm({ ...form, position_id: e.target.value })}>
              <option value="">Не выбрана</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-gold w-full">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
