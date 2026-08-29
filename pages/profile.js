import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from '../components/LoadingScreen'
import BackArrow from '../components/BackArrow'
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
  const [stats, setStats] = useState(null)

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

      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (!profileData || profileData.deleted_at) { router.push('/welcome'); return }
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

      // Панель статистики справа — реальные данные вместо пустого места:
      // те же самые API, что уже использует «Мои цели» и «Мои задания»,
      // не завожу ничего нового ради одной сводки.
      const { data: { session } } = await supabase.auth.getSession()
      const h = { Authorization: `Bearer ${session.access_token}` }
      const [{ data: bal }, myRes, levelsRes, tasksRes] = await Promise.all([
        supabase.from('karma_balance').select('balance').eq('user_id', user.id).maybeSingle(),
        fetch('/api/kpi/my', { headers: h }),
        fetch('/api/kpi/levels', { headers: h }),
        fetch('/api/tasks/my', { headers: h }),
      ])
      let energy = 0, levels = [], activeTasks = 0, goalsCount = 0
      if (myRes.ok) { const d = await myRes.json(); energy = d.energy || 0; goalsCount = (d.metrics || []).length }
      if (levelsRes.ok) levels = await levelsRes.json()
      if (tasksRes.ok) { const d = await tasksRes.json(); activeTasks = (d.active || []).filter(a => a.status !== 'pending_review').length }
      let cur = null
      levels.forEach(l => { if (energy >= l.energy_threshold) cur = l })
      const next = levels.find(l => l.energy_threshold > energy) || null
      setStats({ balance: bal?.balance || 0, energy, cur, next, activeTasks, goalsCount })

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
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone,
        hire_date: profile.hire_date, department_id: profile.department_id, position_id: profile.position_id,
        avatar_url: null
      })
    })
    if (res.ok) {
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

    // Раньше здесь был прямой supabase.from('profiles').update(...) с браузера —
    // теперь запрос идёт через серверный роут с allowlist полей
    // (pages/api/profile/update.js), см. комментарий там.
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        hire_date: form.hire_date || null,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
        avatar_url: avatarUrl
      })
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) setMessage({ type: 'error', text: 'Ошибка сохранения: ' + (result.error || res.statusText) })
    else {
      setMessage({ type: 'success', text: 'Профиль обновлён' })
      setProfile({ ...profile, ...result.profile })
    }
    setSaving(false)
  }

  if (loading) return <LoadingScreen />

  const initials = profile?.first_name && profile?.last_name
    ? (profile.first_name[0] + profile.last_name[0]).toUpperCase()
    : profile?.display_name
      ? profile.display_name.substring(0, 2).toUpperCase()
      : user?.email?.substring(0, 2).toUpperCase() || '?'

  const sectionStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-card)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  }
  const sectionTitleStyle = { fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 18 }
  const fieldLabelStyle = { fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }} className="theme-light px-4 py-12">
      <BackArrow href="/" title="Мой профиль" />

      {message.text && (
        <div
          className="mb-6"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: message.type === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
            border: `1px solid ${message.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
            color: message.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
            fontSize: 14,
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) minmax(360px, 520px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* Аватар — узкая колонка слева, а не растянутая на всю ширину строка */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Фото профиля</div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative w-28 h-28 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-gold)', background: 'var(--bg-page)' }}>
              {form.preview_url ? (
                <img src={form.preview_url} alt="Аватар" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold" style={{ color: 'var(--text-muted)' }}>{initials}</div>
              )}
            </div>
            <div className="flex flex-col gap-2 items-center">
              <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="avatar-upload" />
              <label htmlFor="avatar-upload" className="file-upload-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Загрузить фото
              </label>
              {profile?.avatar_url && (
                <button type="button" onClick={handleRemoveAvatar} className="text-xs transition-colors" style={{ color: 'var(--accent-red)' }}>
                  Удалить фото
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Правая колонка — контакты и рабочая информация, поля разумной ширины внутри сетки на 2 столбца */}
        <div>
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Контакты</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label style={fieldLabelStyle}>Имя</label><input type="text" className="input-field" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><label style={fieldLabelStyle}>Фамилия</label><input type="text" className="input-field" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label style={fieldLabelStyle}>Телефон</label><input type="text" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+7 ___ ___-__-__" /></div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Рабочая информация</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={fieldLabelStyle}>Дата трудоустройства</label>
                <DatePicker value={form.hire_date} onChange={v => setForm({ ...form, hire_date: v })} placeholder="Не указана" />
              </div>
              <div>
                <label style={fieldLabelStyle}>Отдел</label>
                <select className="input-field" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Не выбран</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label style={fieldLabelStyle}>Должность</label>
                <select className="input-field" value={form.position_id} onChange={e => setForm({ ...form, position_id: e.target.value })} disabled={profile?.role_id !== 1 && profile?.role_id !== 2}>
                  <option value="">Не выбрана</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                {profile?.role_id !== 1 && profile?.role_id !== 2 && <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Должность может изменить только администратор</p>}
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-gold" style={{ minWidth: 160 }}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
        </div>

        {/* Панель личной статистики — реальные данные (баланс, уровень,
            активные задания/цели), чтобы широкий третий столбец на
            большом экране не пустовал просто так. */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Кратко о вас</div>
          {stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'rgba(184,134,11,0.06)', border: '1px solid var(--border-gold)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Баланс</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>{stats.balance} к.</span>
              </div>

              {stats.cur && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: stats.cur.color || 'var(--accent-gold)' }}>{stats.cur.name}</span>
                    {stats.next && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.energy}/{stats.next.energy_threshold} эн.</span>}
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-page)', overflow: 'hidden' }}>
                    <div style={{ width: `${stats.next ? Math.min(100, Math.round((stats.energy - stats.cur.energy_threshold) / (stats.next.energy_threshold - stats.cur.energy_threshold) * 100)) : 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-purple))' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--bg-page)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-cyan)' }}>{stats.activeTasks}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>активных заданий</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--bg-page)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-purple)' }}>{stats.goalsCount}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>отслеживаемых целей</div>
                </div>
              </div>

              <a href="/history" style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent-cyan)', textDecoration: 'none', padding: '10px 0', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                Смотреть историю операций →
              </a>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
