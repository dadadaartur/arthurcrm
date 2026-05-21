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

  const [profiles, setProfiles] = useState([])
  const [roles, setRoles] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteTempPassword, setInviteTempPassword] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Компании
  const [companies, setCompanies] = useState([])
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyAdminEmail, setNewCompanyAdminEmail] = useState('')
  const [companyCreationResult, setCompanyCreationResult] = useState(null)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('roles(name, is_system)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.roles?.is_system) { window.location.href = '/'; return }

      await fetchStickers()
      await fetchAllProfiles()
      await fetchAllRoles()
      await fetchCompanies()
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
    if (data && data.length > 0 && !inviteRoleId) setInviteRoleId(data[0].id)
  }

  async function fetchCompanies() {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    setCompanies(data || [])
  }

  // Создание компании и приглашение администратора
  async function handleCreateCompany(e) {
    e.preventDefault()
    if (!newCompanyName || !newCompanyAdminEmail) return

    try {
      const { data: company, error: companyError } = await supabase.from('companies').insert({ name: newCompanyName }).select().single()
      if (companyError) throw companyError

      const { data: role, error: roleError } = await supabase.from('roles').insert({ name: 'Администратор', company_id: company.id }).select().single()
      if (roleError) throw roleError

      const token = crypto.randomUUID()
      const tempPassword = Math.random().toString(36).slice(-8)

      const { error: inviteError } = await supabase.from('invitations').insert({
        company_id: company.id,
        role_id: role.id,
        email: newCompanyAdminEmail,
        token,
        temp_password: tempPassword,
        created_by: user.id,
      })
      if (inviteError) throw inviteError

      setCompanyCreationResult({
        link: `${window.location.origin}/invite?token=${token}`,
        tempPassword,
      })

      setNewCompanyName('')
      setNewCompanyAdminEmail('')
      fetchCompanies()
    } catch (err) {
      alert('Ошибка при создании компании: ' + err.message)
    }
  }

  // Приглашение сотрудника (старое, для суперадмина)
  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail || !inviteRoleId) return

    try {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      const companyId = profile?.company_id || (await supabase.from('companies').select('id').limit(1).single())?.data?.id
      if (!companyId) { alert('Не удалось определить компанию'); return }

      const token = crypto.randomUUID()
      const tempPassword = Math.random().toString(36).slice(-8)
      await supabase.from('invitations').insert({
        company_id: companyId,
        role_id: parseInt(inviteRoleId),
        email: inviteEmail,
        token,
        temp_password: tempPassword,
        created_by: user.id,
      })

      setInviteLink(`${window.location.origin}/invite?token=${token}`)
      setInviteTempPassword(tempPassword)
      setInviteEmail('')
      setInviteRoleId(roles[0]?.id || '')
    } catch (err) {
      alert('Ошибка при создании приглашения: ' + err.message)
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      const input = document.getElementById('invite-link-input')
      if (input) { input.select(); document.execCommand('copy'); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000) }
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

  async function handleDeleteEmployee(targetUserId) {
    if (!confirm('Удалить сотрудника?')) return
    await supabase.from('profiles').delete().eq('user_id', targetUserId)
    fetchAllProfiles()
  }

  const toggleFilter = (c) => setFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  const filtered = filter.length === 0 ? stickers : stickers.filter(s => filter.includes(s.color))

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Левая колонка: Дашборд, Компании, Сотрудники */}
        <div className="w-full lg:w-1/3">
          <div className="dash-card mb-6">
            <h3>Дашборд платформы</h3>
            <div className="space-y-4 mt-4">
              <div><p className="text-sm text-gray-400">Компаний</p><p className="text-2xl font-bold text-white">{companies.length}</p></div>
              <div><p className="text-sm text-gray-400">Сотрудников</p><p className="text-2xl font-bold text-white">{profiles.length}</p></div>
              <div><p className="text-sm text-gray-400">Срочных фиксов</p><p className="text-2xl font-bold text-red-400">{stickers.filter(s => s.color === 'red').length}</p></div>
              <div><p className="text-sm text-gray-400">Путь проекта</p><p className="text-2xl font-bold text-blue-400">{stickers.filter(s => s.color === 'blue').length}</p></div>
            </div>
          </div>

          <div className="dash-card mb-6">
            <h3>Компании</h3>
            <div className="mt-4 space-y-2">
              {companies.map(c => (
                <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <p className="text-white font-medium">{c.name}</p>
                  <span className="text-xs text-gray-400">{c.plan_type}</span>
                </div>
              ))}
              <button onClick={() => setShowCreateCompany(!showCreateCompany)} className="btn-gold w-full mt-4">+ Создать компанию</button>
            </div>
            {showCreateCompany && (
              <form onSubmit={handleCreateCompany} className="mt-4 space-y-3">
                <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Название компании" className="input-field" required />
                <input type="email" value={newCompanyAdminEmail} onChange={e => setNewCompanyAdminEmail(e.target.value)} placeholder="Email администратора" className="input-field" required />
                <button type="submit" className="btn-gold w-full">Создать компанию и выслать приглашение</button>
                {companyCreationResult && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-300">Ссылка: <span className="text-green-400">{companyCreationResult.link}</span></p>
                    <p className="text-xs text-gray-300">Временный пароль: <span className="text-yellow-400 font-mono">{companyCreationResult.tempPassword}</span></p>
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="dash-card">
            <h3>Все сотрудники</h3>
            <div className="mt-4 space-y-2">
              {profiles.map(p => (
                <div key={p.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div>
                    <p className="text-white font-medium">{p.display_name || 'Без имени'}</p>
                    <p className="text-xs text-gray-400">{p.roles?.name} · {p.companies?.name}</p>
                  </div>
                  <button onClick={() => handleDeleteEmployee(p.user_id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Правая колонка: Стикеры */}
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
                      {longText && <button onClick={() => toggleExpand(sticker.id)} className="text-xs opacity-80 hover:opacity-100 transition">{isExpanded ? 'Свернуть' : 'Далее'}</button>}
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
