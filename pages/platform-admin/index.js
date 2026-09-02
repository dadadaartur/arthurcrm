import { useEffect, useState } from 'react'
import DatePicker from '../../components/DatePicker'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import LoadingScreen from '../../components/LoadingScreen'
import { useFeedback } from '../../context/ActionFeedbackContext'
import BackArrow from '../../components/BackArrow'

const STATUS_LABELS = {
  pending: { label: 'На модерации', color: '#b45309' },
  active: { label: 'Активна', color: '#137a39' },
  suspended: { label: 'Заблокирована', color: '#dc2626' },
  rejected: { label: 'Отклонена', color: '#5f6b80' },
}
const PERM_LABELS = {
  approve_companies: 'Одобрять компании',
  suspend_companies: 'Блокировать компании',
  moderate_content: 'Модерировать контент',
  manage_partner_tasks: 'Задания от партнёров',
}

export default function PlatformAdmin() {
  const { showError } = useFeedback()
  const [access, setAccess] = useState('checking') // checking | denied | granted
  const [me, setMe] = useState(null)
  const [companies, setCompanies] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [reasonModal, setReasonModal] = useState(null) // { companyId, targetStatus }
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState('companies') // companies | moderators
  const [moderators, setModerators] = useState([])
  const [newModEmail, setNewModEmail] = useState('')
  const [newModName, setNewModName] = useState('')
  const [newModPerms, setNewModPerms] = useState({ approve_companies: false, suspend_companies: false, moderate_content: false, manage_partner_tasks: false })
  const [partnerTasks, setPartnerTasks] = useState([])
  const [ptForm, setPtForm] = useState({ title: '', description: '', partnerName: '', rewardKarma: 200, enableUnlock: false, unlockKey: '', enableBoost: false, boostPercent: 10, boostDurationDays: 30, enablePrize: false, prizeLabel: '', prizeDescription: '', deadlineDate: '', deadlineTime: '', companyIds: [], applyToAllCompanies: false, image_file: null })
  const [unlockCheck, setUnlockCheck] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [ptSaving, setPtSaving] = useState(false)

  useEffect(() => {
    if (!ptForm.enableUnlock || !ptForm.unlockKey.trim()) { setUnlockCheck(null); return }
    const t = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`/api/platform-admin/check-unlock-key?key=${encodeURIComponent(ptForm.unlockKey.trim())}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setUnlockCheck(await r.json())
    }, 400)
    return () => clearTimeout(t)
  }, [ptForm.enableUnlock, ptForm.unlockKey])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const meRes = await fetch('/api/platform-admin/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const meData = await meRes.json()
      if (!meData.isPlatformStaff) { setAccess('denied'); return }
      setMe(meData)
      setAccess('granted')
      await loadCompanies(session.access_token)
    }
    init()
  }, [])

  const loadCompanies = async (token, status = statusFilter, q = search) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (q) params.set('search', q)
    const res = await fetch(`/api/platform-admin/companies?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setCompanies(res.ok ? await res.json() : [])
    setLoading(false)
  }

  const refetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    loadCompanies(session.access_token)
  }

  const applyStatus = async (companyId, status, reasonText) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/platform-admin/set-company-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ companyId, status, reason: reasonText || null })
    })
    setReasonModal(null)
    setReason('')
    refetch()
  }

  const loadModerators = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/platform-admin/moderators', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    if (res.ok) setModerators(await res.json())
  }

  const addModerator = async () => {
    if (!newModEmail) return
    const { data: { session } } = await supabase.auth.getSession()
    const permissions = Object.keys(newModPerms).filter(k => newModPerms[k])
    const res = await fetch('/api/platform-admin/moderators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: newModEmail, displayName: newModName, permissions })
    })
    const result = await res.json()
    if (!res.ok) { showError(result.error || 'Ошибка добавления модератора'); return }
    setNewModEmail(''); setNewModName(''); setNewModPerms({ approve_companies: false, suspend_companies: false, moderate_content: false, manage_partner_tasks: false })
    loadModerators()
  }

  const removeModerator = async (userId) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/platform-admin/moderators', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userId })
    })
    loadModerators()
  }

  const loadPartnerTasks = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/platform-admin/partner-tasks', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) setPartnerTasks(await res.json())
  }

  const saveEditedTask = async () => {
    if (!editingTask.title.trim()) { showError('Название не может быть пустым'); return }
    setEditSaving(true)
    let imageUrl = editingTask.image_url
    if (editingTask.image_file) {
      const ext = editingTask.image_file.name.split('.').pop()
      const path = `public/partner-task-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, editingTask.image_file)
      if (!upErr) { const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path); imageUrl = pub.publicUrl }
    }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/platform-admin/partner-tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: editingTask.id, title: editingTask.title, description: editingTask.description, rewardKarma: editingTask.rewardKarma, deadlineDate: editingTask.deadlineDate, deadlineTime: editingTask.deadlineTime, imageUrl })
    })
    setEditSaving(false)
    if (!res.ok) { const d = await res.json(); showError(d.error || 'Не удалось сохранить'); return }
    showSuccess('Задание обновлено')
    setEditingTask(null)
    loadPartnerTasks()
  }

  const createPartnerTask = async () => {
    if (!ptForm.title.trim() || !ptForm.partnerName.trim()) { showError('Укажите название задания и партнёра'); return }
    if (!ptForm.applyToAllCompanies && ptForm.companyIds.length === 0) { showError('Выберите хотя бы одну компанию или «все компании»'); return }
    setPtSaving(true)
    let imageUrl = null
    if (ptForm.image_file) {
      const ext = ptForm.image_file.name.split('.').pop()
      const path = `public/partner-task-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, ptForm.image_file)
      if (!upErr) { const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path); imageUrl = pub.publicUrl }
    }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/platform-admin/partner-tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...ptForm, imageUrl })
    })
    const data = await res.json()
    setPtSaving(false)
    if (!res.ok) { showError(data.error || 'Не удалось создать задание'); return }
    setPtForm({ title: '', description: '', partnerName: '', rewardKarma: 200, enableUnlock: false, unlockKey: '', enableBoost: false, boostPercent: 10, boostDurationDays: 30, enablePrize: false, prizeLabel: '', prizeDescription: '', deadlineDate: '', deadlineTime: '', companyIds: [], applyToAllCompanies: false, image_file: null })
    loadPartnerTasks()
  }

  useEffect(() => {
    if (tab === 'moderators' && me?.isSuperAdmin) loadModerators()
    if (tab === 'partner-tasks') loadPartnerTasks()
  }, [tab, me])

  if (access === 'checking') {
    return <LoadingScreen />
  }

  if (access === 'denied') {
    return (
      <div className="theme-light max-w-xl mx-auto px-4 py-16 text-center">
        <div className="premium-card">
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Нет доступа</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Этот раздел доступен только сотрудникам Кармического банка.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="theme-light max-w-6xl mx-auto px-6 py-8">
      <BackArrow href="/" title="Кабинет модератора площадки" extra={
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {me?.isSuperAdmin && <a href="/central-bank" style={{ fontSize: 12, padding: '7px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-gold)', color: 'var(--accent-gold)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Центробанк →</a>}
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{me?.isSuperAdmin ? 'Супер-админ' : `Модератор · права: ${me?.permissions?.join(', ') || '—'}`}</span>
        </div>
      } />

      <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setTab('companies')}
          style={tab === 'companies' ? { color: '#8a6208', borderBottom: '2px solid #8a6208' } : { color: 'var(--text-secondary)' }} className="pb-2 text-sm"
        >
          Компании
        </button>
        {me?.isSuperAdmin && (
          <button
            onClick={() => setTab('moderators')}
            style={tab === 'moderators' ? { color: '#8a6208', borderBottom: '2px solid #8a6208' } : { color: 'var(--text-secondary)' }} className="pb-2 text-sm"
          >
            Модераторы
          </button>
        )}
        {(me?.isSuperAdmin || me?.permissions?.includes('manage_partner_tasks')) && (
          <button
            onClick={() => setTab('partner-tasks')}
            style={tab === 'partner-tasks' ? { color: '#8a6208', borderBottom: '2px solid #8a6208' } : { color: 'var(--text-secondary)' }} className="pb-2 text-sm"
          >
            Задания от партнёров
          </button>
        )}
      </div>

      {tab === 'moderators' && me?.isSuperAdmin && (
        <div>
          <div className="pastel-card p-4 mb-6">
            <h3 className="font-bold mb-3">Назначить модератора</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Пользователь должен уже иметь аккаунт в системе (зарегистрироваться самостоятельно) — здесь мы только
              выдаём ему права модератора площадки, без доступа к какой-либо конкретной компании.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input className="input-field" placeholder="Email существующего пользователя" value={newModEmail} onChange={e => setNewModEmail(e.target.value)} />
              <input className="input-field" placeholder="Имя (для отображения)" value={newModName} onChange={e => setNewModName(e.target.value)} />
            </div>
            <div className="flex gap-4 mb-4 text-sm flex-wrap">
              {Object.keys(newModPerms).map(perm => (
                <label key={perm} className="flex items-center gap-2">
                  <input type="checkbox" checked={newModPerms[perm]} onChange={e => setNewModPerms({ ...newModPerms, [perm]: e.target.checked })} />
                  {PERM_LABELS[perm] || perm}
                </label>
              ))}
            </div>
            <button onClick={addModerator} className="btn-gold text-sm px-4 py-2">Назначить</button>
          </div>

          <div className="pastel-card overflow-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr><th className="py-2 pr-4">Имя</th><th className="py-2 pr-4">Права</th><th className="py-2 pr-4">Статус</th><th className="py-2">Действия</th></tr>
              </thead>
              <tbody>
                {moderators.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-2 pr-4">{m.display_name}</td>
                    <td className="py-2 pr-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{(m.permissions || []).join(', ') || '—'}</td>
                    <td className="py-2 pr-4">{m.active ? 'активен' : 'отключён'}</td>
                    <td className="py-2">
                      {m.active && (
                        <button onClick={() => removeModerator(m.user_id)} className="text-xs text-red-400 hover:text-red-300">Отозвать</button>
                      )}
                    </td>
                  </tr>
                ))}
                {moderators.length === 0 && <tr><td colSpan={4} className="py-6 text-center" style={{ color: 'var(--text-muted)' }}>Модераторов пока нет</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'partner-tasks' && (me?.isSuperAdmin || me?.permissions?.includes('manage_partner_tasks')) && (
        <div>
          <div className="pastel-card p-4 mb-6">
            <h3 className="font-bold mb-3">Новое задание от партнёра</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input className="input-field" placeholder="Партнёр (например, МТС)" value={ptForm.partnerName} onChange={e => setPtForm({ ...ptForm, partnerName: e.target.value })} />
              <input className="input-field" placeholder="Название задания" value={ptForm.title} onChange={e => setPtForm({ ...ptForm, title: e.target.value })} />
            </div>
            <textarea className="input-field w-full mb-3" rows={2} placeholder="Описание (что нужно сделать)" value={ptForm.description} onChange={e => setPtForm({ ...ptForm, description: e.target.value })} />

            <div className="mb-3">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Кармиков сразу (0 — без них)</label>
              <input type="number" className="input-field" style={{ width: 160 }} value={ptForm.rewardKarma} onChange={e => setPtForm({ ...ptForm, rewardKarma: e.target.value })} />
            </div>

            <div className="mb-3">
              <label className="text-xs block mb-2" style={{ color: 'var(--text-secondary)' }}>Дополнительные награды — можно скомбинировать сколько угодно сразу, не только одну</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-page)', border: `1px solid ${ptForm.enableUnlock ? 'var(--border-gold)' : 'var(--border-subtle)'}` }}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={ptForm.enableUnlock} onChange={e => setPtForm({ ...ptForm, enableUnlock: e.target.checked })} />
                    Открыть товары в магазине
                  </label>
                  {ptForm.enableUnlock && (
                    <div style={{ marginTop: 10 }}>
                      <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Ключ разблокировки — произвольная строка, задайте точно такую же у товара в разделе «Награды» компании, поле «Открывается заданием» (requires_unlock)</label>
                      <input className="input-field w-full" placeholder="mts-merch" value={ptForm.unlockKey} onChange={e => setPtForm({ ...ptForm, unlockKey: e.target.value })} />
                      {ptForm.unlockKey.trim() && (
                        <p style={{ fontSize: 11, marginTop: 6, color: unlockCheck?.count > 0 ? '#137a39' : '#b45309' }}>
                          {unlockCheck == null ? 'Проверяем…' : unlockCheck.count === 0
                            ? 'Пока ни один товар ни в одной компании не использует такой ключ — сотрудник разблокирует «пустоту», пока кто-то не заведёт товар с таким же значением.'
                            : `Совпадает с ${unlockCheck.count} товар${unlockCheck.count === 1 ? 'ом' : 'ами'}: ${unlockCheck.items.map(i => `«${i.name}» (${i.company})`).join(', ')}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-page)', border: `1px solid ${ptForm.enableBoost ? 'var(--border-gold)' : 'var(--border-subtle)'}` }}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={ptForm.enableBoost} onChange={e => setPtForm({ ...ptForm, enableBoost: e.target.checked })} />
                    Буст % к начислениям
                  </label>
                  {ptForm.enableBoost && (
                    <div className="grid grid-cols-2 gap-3" style={{ marginTop: 10 }}>
                      <div>
                        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Буст, %</label>
                        <input type="number" className="input-field w-full" value={ptForm.boostPercent} onChange={e => setPtForm({ ...ptForm, boostPercent: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Длительность, дней</label>
                        <input type="number" className="input-field w-full" value={ptForm.boostDurationDays} onChange={e => setPtForm({ ...ptForm, boostDurationDays: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-page)', border: `1px solid ${ptForm.enablePrize ? 'var(--border-gold)' : 'var(--border-subtle)'}` }}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={ptForm.enablePrize} onChange={e => setPtForm({ ...ptForm, enablePrize: e.target.checked })} />
                    Приз (физический/промокод/что угодно вне системы)
                  </label>
                  {ptForm.enablePrize && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input className="input-field w-full" placeholder="Например: iPhone 15" value={ptForm.prizeLabel} onChange={e => setPtForm({ ...ptForm, prizeLabel: e.target.value })} />
                      <input className="input-field w-full" placeholder="Как получить / промокод / условия (необязательно)" value={ptForm.prizeDescription} onChange={e => setPtForm({ ...ptForm, prizeDescription: e.target.value })} />
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Система только сообщит сотруднику о призе — выдача физического приза или промокода остаётся на вас, платформа это не автоматизирует.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Изображение задания (необязательно)</label>
              <label htmlFor="partner-task-image" className="input-field w-full" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: ptForm.image_file ? 'var(--text-primary)' : 'var(--text-muted)', boxSizing: 'border-box' }}>
                {ptForm.image_file ? ptForm.image_file.name : 'Выбрать файл...'}
              </label>
              <input id="partner-task-image" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPtForm({ ...ptForm, image_file: e.target.files?.[0] || null })} />
            </div>

            <div className="mb-3">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Срок выполнения (необязательно)</label>
              <div style={{ maxWidth: 240 }}>
                <DatePicker
                  withTime
                  value={ptForm.deadlineDate ? `${ptForm.deadlineDate}T${ptForm.deadlineTime || ''}` : ''}
                  onChange={v => { const [d, t] = (v || '').split('T'); setPtForm({ ...ptForm, deadlineDate: d || '', deadlineTime: t || '' }) }}
                  placeholder="Без срока"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={ptForm.applyToAllCompanies} onChange={e => setPtForm({ ...ptForm, applyToAllCompanies: e.target.checked, companyIds: [] })} />
                Применить ко всем активным компаниям
              </label>
              {!ptForm.applyToAllCompanies && (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-auto pastel-card p-3">
                  {companies.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={ptForm.companyIds.includes(c.id)}
                        onChange={e => setPtForm({ ...ptForm, companyIds: e.target.checked ? [...ptForm.companyIds, c.id] : ptForm.companyIds.filter(id => id !== c.id) })} />
                      {c.name}
                    </label>
                  ))}
                  {companies.length === 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Список компаний ещё грузится — откройте вкладку «Компании» один раз.</span>}
                </div>
              )}
            </div>

            <button onClick={createPartnerTask} disabled={ptSaving} className="btn-gold text-sm px-4 py-2">{ptSaving ? 'Создание…' : 'Создать и разослать'}</button>
          </div>

          <div className="pastel-card overflow-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr><th className="py-2 pr-4">Партнёр</th><th className="py-2 pr-4">Задание</th><th className="py-2 pr-4">Награда</th><th className="py-2">Создано</th><th className="py-2"></th></tr>
              </thead>
              <tbody>
                {partnerTasks.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-2 pr-4">{t.partner_name}</td>
                    <td className="py-2 pr-4">{t.title}</td>
                    <td className="py-2 pr-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {t.rewardKarma || t.reward_karma > 0 ? `${t.reward_karma} карм.` : ''}
                      {Array.isArray(t.bonus_rewards) && t.bonus_rewards.length > 0 ? ' + ' + t.bonus_rewards.map(b =>
                        b.type === 'unlock' ? `товары (${b.unlockKey})` : b.type === 'boost' ? `буст +${b.percent}% на ${b.durationDays} дн.` : b.type === 'prize' ? `приз «${b.label}»` : ''
                      ).join(', ') : (t.reward_type === 'shop_unlock' ? ` + товары: ${t.reward_config?.unlock_key || '—'}` : t.reward_type === 'karma_boost' ? ` + буст +${t.reward_config?.percent}% на ${t.reward_config?.duration_days} дн.` : '')}
                    </td>
                    <td className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString('ru')}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => setEditingTask({ id: t.id, title: t.title, description: t.description || '', rewardKarma: t.reward_karma, deadlineDate: t.deadline_at ? t.deadline_at.slice(0, 10) : '', deadlineTime: t.deadline_at ? t.deadline_at.slice(11, 16) : '', image_url: t.image_url || '', image_file: null })} style={{ fontSize: 11, color: '#0e7490', background: 'none', border: 'none', cursor: 'pointer' }}>Редактировать</button>
                    </td>
                  </tr>
                ))}
                {partnerTasks.length === 0 && <tr><td colSpan={5} className="py-6 text-center" style={{ color: 'var(--text-muted)' }}>Партнёрских заданий пока нет</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }} onClick={() => !editSaving && setEditingTask(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 94vw)', maxHeight: '86vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Редактировать задание</h3>

            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Изображение</label>
            <label htmlFor="edit-task-image" className="input-field w-full mb-3" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxSizing: 'border-box' }}>
              {(editingTask.image_file || editingTask.image_url) && <img src={editingTask.image_file ? URL.createObjectURL(editingTask.image_file) : editingTask.image_url} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />}
              <span style={{ color: editingTask.image_file ? 'var(--text-primary)' : 'var(--text-muted)' }}>{editingTask.image_file ? editingTask.image_file.name : editingTask.image_url ? 'Заменить изображение…' : 'Выбрать файл…'}</span>
            </label>
            <input id="edit-task-image" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setEditingTask({ ...editingTask, image_file: e.target.files?.[0] || null })} />

            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Название</label>
            <input className="input-field w-full mb-3" value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} />

            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Описание</label>
            <textarea className="input-field w-full mb-3" rows={2} value={editingTask.description} onChange={e => setEditingTask({ ...editingTask, description: e.target.value })} />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Кармиков</label>
                <input type="number" className="input-field w-full" value={editingTask.rewardKarma} onChange={e => setEditingTask({ ...editingTask, rewardKarma: e.target.value })} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Дедлайн</label>
                <DatePicker withTime value={editingTask.deadlineDate ? `${editingTask.deadlineDate}T${editingTask.deadlineTime || ''}` : ''} onChange={v => { const [d, t] = (v || '').split('T'); setEditingTask({ ...editingTask, deadlineDate: d || '', deadlineTime: t || '' }) }} placeholder="Без срока" />
              </div>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px' }}>Партнёр, компании-получатели и награды здесь не меняются — эта запись относится к одной конкретной компании, уже разосланная аудитория не пересматривается.</p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditingTask(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={saveEditedTask} disabled={editSaving} className="btn-gold" style={{ flex: 1 }}>{editSaving ? 'Сохраняем…' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'companies' && (<>
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {['all', 'pending', 'active', 'suspended', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); refetchWithStatus(s) }}
            className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
          >
            {s === 'all' ? 'Все' : STATUS_LABELS[s].label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && refetch()}
          className="input-field w-64 ml-auto"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="pastel-card overflow-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <tr>
                <th className="py-2 pr-4">Компания</th>
                <th className="py-2 pr-4">Сотрудников</th>
                <th className="py-2 pr-4">Статус</th>
                <th className="py-2 pr-4">Создана</th>
                <th className="py-2">Действия</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-3 pr-4">
                    <div className="font-medium">{c.name}</div>
                    {c.description && <div className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.description}</div>}
                  </td>
                  <td className="py-3 pr-4">{c.employeeCount}</td>
                  <td className="py-3 pr-4">
                    <span style={{ color: STATUS_LABELS[c.status]?.color || 'var(--text-muted)' }}>
                      {STATUS_LABELS[c.status]?.label || c.status}
                    </span>
                    {c.status_reason && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.status_reason}</div>}
                  </td>
                  <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{new Date(c.created_at).toLocaleDateString('ru')}</td>
                  <td className="py-3">
                    <div className="flex gap-2 flex-wrap">
                      {c.status !== 'active' && (
                        <button onClick={() => applyStatus(c.id, 'active')} className="text-xs" style={{ color: '#137a39' }}>Активировать</button>
                      )}
                      {c.status !== 'suspended' && (
                        <button onClick={() => setReasonModal({ companyId: c.id, targetStatus: 'suspended' })} className="text-xs" style={{ color: '#dc2626' }}>Заблокировать</button>
                      )}
                      {c.status === 'pending' && (
                        <button onClick={() => setReasonModal({ companyId: c.id, targetStatus: 'rejected' })} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Отклонить</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>Нет компаний по заданному фильтру</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </>)}

      {reasonModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="premium-card max-w-md w-full">
            <h3 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              {reasonModal.targetStatus === 'suspended' ? 'Причина блокировки' : 'Причина отклонения'}
            </h3>
            <textarea
              className="input-field mb-4"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Необязательно, но полезно для истории"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setReasonModal(null); setReason('') }} className="btn-outline text-sm px-4 py-2">Отмена</button>
              <button
                onClick={() => applyStatus(reasonModal.companyId, reasonModal.targetStatus, reason)}
                className="btn-gold text-sm px-4 py-2"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function refetchWithStatus(s) {
    supabase.auth.getSession().then(({ data: { session } }) => loadCompanies(session.access_token, s, search))
  }
}

PlatformAdmin.bypassLayout = false
