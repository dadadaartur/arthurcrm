import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

const COLORS = {
  red: { label: 'Срочный фикс', bg: 'rgba(239, 68, 68, 0.85)', border: 'rgba(239, 68, 68, 0.9)', text: '#FFFFFF', shadow: '0 0 25px rgba(239, 68, 68, 0.5)' },
  yellow: { label: 'Срочно, но есть время', bg: 'rgba(234, 179, 8, 0.85)', border: 'rgba(234, 179, 8, 0.9)', text: '#FFFFFF', shadow: '0 0 25px rgba(234, 179, 8, 0.5)' },
  green: { label: 'Идея на будущее', bg: 'rgba(34, 197, 94, 0.85)', border: 'rgba(34, 197, 94, 0.9)', text: '#FFFFFF', shadow: '0 0 25px rgba(34, 197, 94, 0.5)' },
  blue: { label: 'Путь проекта', bg: 'rgba(59, 130, 246, 0.9)', border: 'rgba(59, 130, 246, 1)', text: '#FFFFFF', shadow: '0 0 30px rgba(59, 130, 246, 0.7)' },
}

export default function Admin() {
  const [user, setUser] = useState(null)
  const [stickers, setStickers] = useState([])
  const [content, setContent] = useState('')
  const [color, setColor] = useState('blue')
  const [filter, setFilter] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  // Сотрудники
  const [profiles, setProfiles] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [roles, setRoles] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      await fetchStickers()
      await fetchProfiles()
      await fetchRoles()
    }
    checkUser()
  }, [])

  async function fetchStickers() {
    const { data } = await supabase.from('admin_stickers').select('*').order('created_at', { ascending: false })
    setStickers(data || [])
    setLoading(false)
  }

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('*, roles(name), departments(name), companies(name)')
    setProfiles(data || [])
  }

  async function fetchRoles() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    if (!profile) return
    const { data } = await supabase.from('roles').select('*').eq('company_id', profile.company_id)
    setRoles(data || [])
  }

  async function createSticker(e) {
    e.preventDefault()
    if (!content.trim()) return
    await supabase.from('admin_stickers').insert({ user_id: user.id, content, color })
    setContent('')
    fetchStickers()
  }

  async function deleteSticker(id) {
    await supabase.from('admin_stickers').delete().eq('id', id)
    fetchStickers()
  }

  const toggleFilter = (c) => setFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  const filtered = filter.length === 0 ? stickers : stickers.filter(s => filter.includes(s.color))

  // Приглашение сотрудника
  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail || !inviteRole) return
    const token = crypto.randomUUID()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
    if (!profile) return
    await supabase.from('invitations').insert({
      company_id: profile.company_id,
      role_id: parseInt(inviteRole),
      email: inviteEmail,
      token,
      created_by: user.id,
    })
    setInviteLink(`${window.location.origin}/register?token=${token}`)
    setInviteEmail('')
    setInviteRole('')
  }

  // Удаление сотрудника (пока без заявки – прямое удаление, позже заменим на approval)
  async function handleDeleteEmployee(targetUserId) {
    if (!confirm('Удалить сотрудника? Это действие нельзя отменить.')) return
    await supabase.from('profiles').delete().eq('user_id', targetUserId)
    fetchProfiles()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Левая колонка: дашборд и фильтры */}
        <div className="w-full lg:w-1/3">
          <div className="dash-card mb-6">
            <h3>Дашборд компании</h3>
            <div className="space-y-4 mt-4">
              <div><p className="text-sm text-gray-400">Сотрудников</p><p className="text-2xl font-bold text-white">{profiles.length}</p></div>
              <div><p className="text-sm text-gray-400">Срочных фиксов</p><p className="text-2xl font-bold text-red-400">{stickers.filter(s => s.color === 'red').length}</p></div>
              <div><p className="text-sm text-gray-400">Срочных задач</p><p className="text-2xl font-bold text-yellow-400">{stickers.filter(s => s.color === 'yellow').length}</p></div>
              <div><p className="text-sm text-gray-400">Идей</p><p className="text-2xl font-bold text-green-400">{stickers.filter(s => s.color === 'green').length}</p></div>
              <div><p className="text-sm text-gray-400">Путь проекта</p><p className="text-2xl font-bold text-blue-400">{stickers.filter(s => s.color === 'blue').length}</p></div>
            </div>
          </div>

          <div className="dash-card mb-6">
            <h3>Фильтры стикеров</h3>
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(COLORS).map(([key, val]) => (
                <button key={key} onClick={() => toggleFilter(key)} className={`filter-pill ${filter.includes(key) ? 'active' : ''}`}
                  style={filter.includes(key) ? { background: val.border, color: 'white', borderColor: 'transparent' } : {}}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Сотрудники */}
          <div className="dash-card">
            <h3>Сотрудники</h3>
            <div className="mt-4 space-y-2">
              {profiles.map(p => (
                <div key={p.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div>
                    <p className="text-white font-medium">{p.display_name || 'Без имени'}</p>
                    <p className="text-xs text-gray-400">{p.roles?.name} · {p.departments?.name}</p>
                  </div>
                  <button onClick={() => handleDeleteEmployee(p.user_id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                </div>
              ))}
              <button onClick={() => setShowInvite(!showInvite)} className="btn-gold w-full mt-4">+ Пригласить сотрудника</button>
            </div>
            {showInvite && (
              <form onSubmit={handleInvite} className="mt-4 space-y-3">
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email сотрудника" className="input-field" required />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="input-field" required>
                  <option value="">Выберите роль</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn-gold w-full">Создать приглашение</button>
                {inviteLink && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg break-all">
                    <p className="text-xs text-gray-300 mb-1">Ссылка для регистрации:</p>
                    <code className="text-xs text-green-400">{inviteLink}</code>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Правая колонка: стикеры */}
        <div className="flex-1">
          <div className="dash-card mb-6">
            <h3>Новый стикер</h3>
            <form onSubmit={createSticker} className="space-y-4 mt-4">
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Опишите задачу или идею..." className="input-field" rows={3} required />
              <div className="flex gap-3 items-center">
                <select value={color} onChange={e => setColor(e.target.value)} className="input-field w-auto">
                  <option value="red">🔴 Срочный фикс</option>
                  <option value="yellow">🟡 Срочно, но есть время</option>
                  <option value="green">🟢 Идея на будущее</option>
                  <option value="blue">🔵 Путь проекта</option>
                </select>
                <button type="submit" className="btn-gold">Создать</button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(sticker => {
              const style = COLORS[sticker.color]
              const isExpanded = expanded[sticker.id]
              const longText = sticker.content.length > 120
              const displayText = isExpanded || !longText ? sticker.content : sticker.content.slice(0, 120) + '...'
              return (
                <div key={sticker.id} className="premium-card relative flex flex-col" style={{ background: style.bg, borderColor: style.border, boxShadow: style.shadow, color: style.text }}>
                  <p className="text-sm whitespace-pre-wrap flex-1 sticker-text">{displayText}</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs opacity-70">{new Date(sticker.created_at).toLocaleString('ru')}</span>
                    <div className="flex gap-2">
                      {longText && (
                        <button onClick={() => toggleExpand(sticker.id)} className="text-xs opacity-80 hover:opacity-100 transition">
                          {isExpanded ? 'Свернуть' : 'Далее'}
                        </button>
                      )}
                      <button onClick={() => deleteSticker(sticker.id)} className="text-xs text-red-300 hover:text-red-200 transition">Удалить</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
