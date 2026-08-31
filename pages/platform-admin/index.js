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
  const [ptForm, setPtForm] = useState({ title: '', description: '', partnerName: '', rewardType: 'karma', rewardKarma: 200, unlockKey: '', boostPercent: 10, boostDurationDays: 30, deadlineDate: '', companyIds: [], applyToAllCompanies: false })
  const [ptSaving, setPtSaving] = useState(false)

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

  const createPartnerTask = async () => {
    if (!ptForm.title.trim() || !ptForm.partnerName.trim()) { showError('Укажите название задания и партнёра'); return }
    if (!ptForm.applyToAllCompanies && ptForm.companyIds.length === 0) { showError('Выберите хотя бы одну компанию или «все компании»'); return }
    setPtSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/platform-admin/partner-tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(ptForm)
    })
    const data = await res.json()
    setPtSaving(false)
    if (!res.ok) { showError(data.error || 'Не удалось создать задание'); return }
    setPtForm({ title: '', description: '', partnerName: '', rewardType: 'karma', rewardKarma: 200, unlockKey: '', boostPercent: 10, boostDurationDays: 30, deadlineDate: '', companyIds: [], applyToAllCompanies: false })
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

            <div className="flex gap-4 mb-3 text-sm flex-wrap">
              {[['karma', 'Только кармики'], ['shop_unlock', 'Открыть товары в магазине'], ['karma_boost', 'Буст % к начислениям']].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" name="rewardType" checked={ptForm.rewardType === k} onChange={() => setPtForm({ ...ptForm, rewardType: k })} />
                  {label}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Кармиков сразу (0 — без них)</label>
                <input type="number" className="input-field w-full" value={ptForm.rewardKarma} onChange={e => setPtForm({ ...ptForm, rewardKarma: e.target.value })} />
              </div>
              {ptForm.rewardType === 'shop_unlock' && (
                <div className="md:col-span-2">
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Ключ разблокировки (задайте у товаров в rewards.requires_unlock такой же)</label>
                  <input className="input-field w-full" placeholder="mts-merch" value={ptForm.unlockKey} onChange={e => setPtForm({ ...ptForm, unlockKey: e.target.value })} />
                </div>
              )}
              {ptForm.rewardType === 'karma_boost' && (<>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Буст, %</label>
                  <input type="number" className="input-field w-full" value={ptForm.boostPercent} onChange={e => setPtForm({ ...ptForm, boostPercent: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Длительность, дней</label>
                  <input type="number" className="input-field w-full" value={ptForm.boostDurationDays} onChange={e => setPtForm({ ...ptForm, boostDurationDays: e.target.value })} />
                </div>
              </>)}
            </div>

            <div className="mb-3">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Срок выполнения (необязательно)</label>
              <div style={{ maxWidth: 200 }}><DatePicker value={ptForm.deadlineDate} onChange={v => setPtForm({ ...ptForm, deadlineDate: v })} placeholder="Без срока" /></div>
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
                <tr><th className="py-2 pr-4">Партнёр</th><th className="py-2 pr-4">Задание</th><th className="py-2 pr-4">Награда</th><th className="py-2">Создано</th></tr>
              </thead>
              <tbody>
                {partnerTasks.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-2 pr-4">{t.partner_name}</td>
                    <td className="py-2 pr-4">{t.title}</td>
                    <td className="py-2 pr-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {t.reward_type === 'shop_unlock' ? `Товары: ${t.reward_config?.unlock_key || '—'}` : t.reward_type === 'karma_boost' ? `Буст +${t.reward_config?.percent}% на ${t.reward_config?.duration_days} дн.` : `${t.reward_karma} кармиков`}
                    </td>
                    <td className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString('ru')}</td>
                  </tr>
                ))}
                {partnerTasks.length === 0 && <tr><td colSpan={4} className="py-6 text-center" style={{ color: 'var(--text-muted)' }}>Партнёрских заданий пока нет</td></tr>}
              </tbody>
            </table>
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
