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

  // Сотрудники (суперадмин видит всех)
  const [profiles, setProfiles] = useState([])
  const [roles, setRoles] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)

      // Проверяем, что пользователь — суперадмин
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles(name, is_system)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.roles?.is_system) {
        window.location.href = '/'
        return
      }

      await fetchStickers()
      await fetchAllProfiles()
      await fetchAllRoles()
    }
    checkAccess()
  }, [])

  async function fetchStickers() {
    const { data } = await supabase.from('admin_stickers').select('*').order('created_at', { ascending: false })
    setStickers(data || [])
    setLoading(false)
  }

  async function fetchAllProfiles() {
    const { data } = await supabase.from('profiles').select('*, roles(name), departments(name), companies(name)')
    setProfiles(data || [])
  }

  async function fetchAllRoles() {
    const { data } = await supabase.from('roles').select('*').order('name')
    setRoles(data || [])
    if (data && data.length > 0 && !inviteRoleId) {
      setInviteRoleId(data[0].id)
    }
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

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail || !inviteRoleId) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    // Для суперадмина company_id может быть null – используем первую компанию
    const companyId = profile?.company_id || (await supabase.from('companies').select('id').limit(1).single())?.data?.id
    if (!companyId) {
      alert('Не удалось определить компанию')
      return
    }

    const token = crypto.randomUUID()
    await supabase.from('invitations').insert({
      company_id: companyId,
      role_id: parseInt(inviteRoleId),
      email: inviteEmail,
      token,
      created_by: user.id,
    })

    setInviteLink(`${window.location.origin}/register?token=${token}`)
    setInviteEmail('')
    setInviteRoleId(roles[0]?.id || '')
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      const input = document.getElementById('invite-link-input')
      if (input) {
        input.select()
        document.execCommand('copy')
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }
    }
  }

  async function handleDeleteEmployee(targetUserId) {
    if (!confirm('Удалить сотрудника? Это действие нельзя отменить.')) return
    await supabase.from('profiles').delete().eq('user_id', targetUserId)
    fetchAllProfiles()
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
        <div className="w-full lg:w-1/3">
          <div className="dash-card mb-6">
            <h3>Дашборд платформы</h3>
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

          <div className="dash-card">
            <h3>Все сотрудники</h3>
            <div className="mt-4 space-y-2">
              {profiles.map(p => (
                <div key={p.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div>
                    <p className="text-white font-medium">{p.display_name || 'Без имени'}</p>
                    <p className="text-xs text-gray-400">{p.roles?.name} · {p.departments?.name} · {p.companies?.name}</p>
                  </div>
                  <button onClick={() => handleDeleteEmployee(p.user_id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                </div>
              ))}
              <button onClick={() => setShowInvite(!showInvite)} className="btn-gold w-full mt-4">+ Пригласить сотрудника</button>
            </div>
            {showInvite && (
              <form onSubmit={handleInvite} className="mt-4 space-y-3">
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email сотрудника" className="input-field" required />
                <select value={inviteRoleId} onChange={e => setInviteRoleId(e.target.value)} className="input-field" required>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn-gold w-full">Создать приглашение</button>
                {inviteLink && (
                  <div className="mt-3 space-y-2">
                    <input
                      id="invite-link-input"
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="input-field text-xs text-green-400 bg-gray-900 border-gray-700"
                      style={{ cursor: 'text', userSelect: 'text' }}
                    />
                    <button type="button" onClick={copyInviteLink} className="btn-gold w-full text-xs">
                      {copySuccess ? 'Скопировано!' : 'Копировать ссылку'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

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
