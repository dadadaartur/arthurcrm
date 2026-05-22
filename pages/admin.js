import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import PremiumModal from '../components/PremiumModal'

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
  const [companies, setCompanies] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteTempPassword, setInviteTempPassword] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Модалки
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' })
  const [editingProfile, setEditingProfile] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRoleId, setEditRoleId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null)

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
    if (!inviteEmail || !inviteRoleId) return

    try {
      const token = crypto.randomUUID()
      const tempPassword = Math.random().toString(36).slice(-8)
      await supabase.from('invitations').insert({
        company_id: companies[0]?.id, // первая компания для суперадмина
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
      setModal({ isOpen: true, title: 'Ошибка', message: err.message })
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

  // Редактирование сотрудника
  async function openEdit(profile) {
    setEditingProfile(profile)
    setEditName(profile.display_name || '')
    setEditEmail(profile.email || '')
    setEditRoleId(profile.role_id || '')
  }

  async function saveEdit() {
    if (!editingProfile) return
    const { error } = await supabase.from('profiles').update({
      display_name: editName,
      email: editEmail,
      role_id: parseInt(editRoleId),
    }).eq('user_id', editingProfile.user_id)
    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
    } else {
      setEditingProfile(null)
      fetchAllProfiles()
    }
  }

  // Удаление сотрудника
  function confirmDelete(profile) {
    setDeleteTarget(profile)
  }

  async function executeDelete() {
    if (!deleteTarget) return
    await supabase.from('profiles').delete().eq('user_id', deleteTarget.user_id)
    setDeleteTarget(null)
    fetchAllProfiles()
  }

  // Сброс пароля
  function confirmResetPassword(profile) {
    setResetPasswordTarget(profile)
  }

  async function executeResetPassword() {
    if (!resetPasswordTarget) return
    const tempPassword = Math.random().toString(36).slice(-8)
    const { error } = await supabase.from('invitations').insert({
      company_id: companies[0]?.id,
      role_id: resetPasswordTarget.role_id,
      email: resetPasswordTarget.email,
      token: crypto.randomUUID(),
      temp_password: tempPassword,
      created_by: user.id,
    })
    if (error) {
      setModal({ isOpen: true, title: 'Ошибка', message: error.message })
    } else {
      setModal({ isOpen: true, title: 'Пароль сброшен', message: `Временный пароль: ${tempPassword}` })
      setResetPasswordTarget(null)
    }
  }

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

          <div className="dash-card mb-6">
            <h3>Сотрудники</h3>
            <div className="mt-4 space-y-2">
              {profiles.map(p => (
                <div key={p.user_id} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div>
                    <p className="text-white font-medium">{p.display_name || 'Без имени'}</p>
                    <p className="text-xs text-gray-400">{p.roles?.name} · {p.companies?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-xs text-blue-400 hover:text-blue-300">Изменить</button>
                    <button onClick={() => confirmDelete(p)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                    <button onClick={() => confirmResetPassword(p)} className="text-xs text-yellow-400 hover:text-yellow-300">Пароль</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowInvite(!showInvite)} className="btn-gold w-full mt-4">+ Пригласить сотрудника</button>
            </div>
            {showInvite && (
              <form onSubmit={handleInvite} className="mt-4 space-y-3">
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email сотрудника" className="input-field" required />
                <select value={inviteRoleId} onChange={e => setInviteRoleId(e.target.value)} className="input-field" required>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button type="submit" className="btn-gold w-full">Создать приглашение</button>
                {inviteLink && (
                  <div className="mt-3 space-y-2">
                    <input id="invite-link-input" type="text" value={inviteLink} readOnly className="input-field text-xs text-green-400 bg-gray-900 border-gray-700" style={{ cursor: 'text', userSelect: 'text' }} />
                    <button type="button" onClick={copyInviteLink} className="btn-gold w-full text-xs">{copySuccess ? 'Скопировано!' : 'Копировать ссылку'}</button>
                  </div>
                )}
              </form>
            )}
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

      {/* Модалка редактирования сотрудника */}
      <PremiumModal isOpen={!!editingProfile} onClose={() => setEditingProfile(null)} title="Редактировать сотрудника">
        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Имя" className="input-field mb-3" />
        <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" className="input-field mb-3" />
        <select value={editRoleId} onChange={e => setEditRoleId(e.target.value)} className="input-field mb-3">
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={saveEdit} className="btn-gold w-full">Сохранить</button>
      </PremiumModal>

      {/* Подтверждение удаления */}
      <PremiumModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Удалить сотрудника?">
        <p>Вы уверены, что хотите удалить {deleteTarget?.display_name}? Это действие необратимо.</p>
        <button onClick={executeDelete} className="btn-gold w-full mt-4">Удалить</button>
      </PremiumModal>

      {/* Сброс пароля */}
      <PremiumModal isOpen={!!resetPasswordTarget} onClose={() => setResetPasswordTarget(null)} title="Сброс пароля?">
        <p>Будет сгенерирован новый временный пароль для {resetPasswordTarget?.display_name}.</p>
        <button onClick={executeResetPassword} className="btn-gold w-full mt-4">Сбросить</button>
      </PremiumModal>

      {/* Общее уведомление */}
      <PremiumModal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title}>
        <p>{modal.message}</p>
      </PremiumModal>
    </div>
  )
}
