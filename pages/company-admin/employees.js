import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { isCompanyAdmin, roleLabel } from '../../lib/permissions'
import { useProfile } from '../../context/ProfileContext'
import { useFeedback } from '../../context/ActionFeedbackContext'

const PERMISSION_FIELDS = [
  { key: 'can_create_tasks', label: 'Создание заданий' },
  { key: 'can_review_tasks', label: 'Проверка заданий и покупок' },
  { key: 'can_manage_employees', label: 'Добавление сотрудников' },
  { key: 'can_delete_employees', label: 'Удаление сотрудников' },
]
const emptyPermissions = { can_create_tasks: false, can_review_tasks: false, can_manage_employees: false, can_delete_employees: false }
const GRID = '28px 2.2fr 1.4fr 1fr 1.2fr 0.9fr 110px'
const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '10px 20px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }

function EmployeesPage() {
  const router = useRouter()
  const { profile: myProfile } = useProfile()
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  const [companyRoles, setCompanyRoles] = useState([])
  const [levels, setLevels] = useState([])
  const [energyMap, setEnergyMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkRoleId, setBulkRoleId] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)
  const [editForm, setEditForm] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: '', ...emptyPermissions })
  const [pendingInvites, setPendingInvites] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: '', ...emptyPermissions })
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [addPositionOpen, setAddPositionOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!p) { router.push('/'); return }
      setCompanyId(p.company_id)
      await loadData(p.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const loadData = async (compId) => {
    const [empRes, posRes, rolesRes, levelsRes] = await Promise.all([
      supabase.from('profiles').select('*, positions(title)').eq('company_id', compId).is('deleted_at', null),
      supabase.from('positions').select('*').eq('company_id', compId).order('title'),
      supabase.from('roles').select('*').eq('company_id', compId).order('name'),
      supabase.from('progress_levels').select('*').order('energy_threshold')
    ])
    const emps = (empRes.data || []).filter(emp => !isCompanyAdmin(emp))
    const userIds = emps.map(e => e.user_id)
    let eMap = {}
    if (userIds.length) {
      const { data: energyRows } = await supabase.from('kpi_energy').select('user_id, energy').in('user_id', userIds)
      eMap = Object.fromEntries((energyRows || []).map(r => [r.user_id, r.energy || 0]))
    }
    setEmployees(emps); setPositions(posRes.data || []); setCompanyRoles(rolesRes.data || [])
    setLevels(levelsRes.data || []); setEnergyMap(eMap)
    loadPendingInvites()
  }

  const loadPendingInvites = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch('/api/company-admin/pending-invites', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) setPendingInvites(await res.json())
    } catch (e) {}
  }

  const cancelInvite = async (id) => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/company-admin/cancel-invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ invitationId: id }) })
    if (r.ok) { showSuccess('Приглашение отменено'); loadPendingInvites() } else showError('Ошибка отмены')
  }

  const handleAddPosition = async () => {
    if (!newPositionTitle.trim()) return
    const { error } = await supabase.from('positions').insert({ company_id: companyId, title: newPositionTitle.trim() })
    if (!error) { setNewPositionTitle(''); setAddPositionOpen(false); showSuccess('Должность добавлена'); loadData(companyId) }
    else showError('Ошибка добавления должности')
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.email) { showError('Укажите email сотрудника'); return }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/company-admin/invite-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: newEmployee.email, firstName: newEmployee.first_name, lastName: newEmployee.last_name, positionId: newEmployee.position_id || null, roleId: newEmployee.role_id || null, permissions: { can_create_tasks: newEmployee.can_create_tasks, can_review_tasks: newEmployee.can_review_tasks, can_manage_employees: newEmployee.can_manage_employees, can_delete_employees: newEmployee.can_delete_employees } })
    })
    const result = await res.json()
    if (!res.ok) { showError('Ошибка: ' + (result.error || 'не удалось пригласить')); return }
    setShowAddModal(false)
    setNewEmployee({ email: '', first_name: '', last_name: '', position_id: '', role_id: '', ...emptyPermissions })
    showSuccess('Приглашение отправлено')
    loadData(companyId)
  }

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp)
    setEditForm({ email: emp.email || '', first_name: emp.first_name || '', last_name: emp.last_name || '', position_id: emp.position_id || '', role_id: emp.role_id || '', can_create_tasks: !!emp.can_create_tasks, can_review_tasks: !!emp.can_review_tasks, can_manage_employees: !!emp.can_manage_employees, can_delete_employees: !!emp.can_delete_employees })
  }

  const handleSaveEdit = async () => {
    if (!editingEmployee) return
    const { error } = await supabase.from('profiles').update({
      email: editForm.email, first_name: editForm.first_name, last_name: editForm.last_name,
      position_id: editForm.position_id || null, role_id: editForm.role_id || null,
      can_create_tasks: editForm.can_create_tasks, can_review_tasks: editForm.can_review_tasks,
      can_manage_employees: editForm.can_manage_employees, can_delete_employees: editForm.can_delete_employees,
      display_name: `${editForm.first_name} ${editForm.last_name}`.trim() || editForm.email
    }).eq('user_id', editingEmployee.user_id)
    if (!error) { setEditingEmployee(null); showSuccess('Сотрудник обновлён'); loadData(companyId) }
    else showError('Ошибка сохранения')
  }

  const applyBulkRole = async () => {
    if (!bulkRoleId || selectedIds.size === 0) return
    setBulkApplying(true)
    const { error } = await supabase.from('profiles').update({ role_id: bulkRoleId }).in('user_id', [...selectedIds])
    setBulkApplying(false)
    if (!error) { showSuccess(`Роль назначена ${selectedIds.size} сотрудникам`); setSelectedIds(new Set()); setBulkRoleId(''); loadData(companyId) }
    else showError('Не удалось назначить роль')
  }
  const toggleSelect = (id) => setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelectedIds(s => s.size === employees.length ? new Set() : new Set(employees.map(e => e.user_id)))

  const handleDeleteEmployee = async (id) => {
    if (!(myProfile?.can_delete_employees || isCompanyAdmin(myProfile))) { showError('Нет прав на удаление'); return }
    const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('user_id', id)
    if (!error) { showSuccess('Сотрудник удалён'); loadData(companyId) } else showError('Ошибка удаления')
  }

  const canDelete = myProfile?.can_delete_employees || isCompanyAdmin(myProfile)
  const getEmployeeLevel = (userId) => {
    const energy = energyMap[userId] || 0
    let current = null
    levels.forEach(l => { if (energy >= l.energy_threshold) current = l })
    return current || { name: '—', color: 'var(--text-muted)' }
  }
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление командой" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/company-admin/departments" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V7l9-4 9 4v14" /><path d="M9 21V12h6v9" /></svg>
              Отделы компании
            </Link>
            <button onClick={() => setAddPositionOpen(true)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Должность</button>
            <button onClick={() => setShowAddModal(true)} style={{ ...ghostBtn, borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сотрудник</button>
          </div>
        } />

        {/* Таблица с жёсткой сеткой — шапка и строки совпадают */}
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', marginBottom: 12, borderRadius: 14, background: 'rgba(184,134,11,0.06)', border: '1px solid var(--border-gold)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Выбрано: {selectedIds.size}</span>
            <select className="input-field" style={{ fontSize: 12, width: 220 }} value={bulkRoleId} onChange={e => setBulkRoleId(e.target.value)}>
              <option value="">Назначить роль…</option>
              {companyRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={applyBulkRole} disabled={!bulkRoleId || bulkApplying} style={{ ...ghostBtn, borderColor: 'var(--border-gold)', color: '#8a6208', opacity: !bulkRoleId ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{bulkApplying ? 'Применяем…' : 'Применить ко всем выбранным'}</button>
            <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}>Снять выбор</button>
          </div>
        )}

        <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, alignItems: 'center' }}>
            <input type="checkbox" checked={employees.length > 0 && selectedIds.size === employees.length} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
            <div>Сотрудник</div><div>Должность</div><div>Роль</div><div>Уровень</div><div>Энергия</div><div></div>
          </div>
          {employees.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>В команде пока нет сотрудников</div>}
          {employees.map(emp => {
            const lvl = getEmployeeLevel(emp.user_id)
            return (
              <div key={emp.user_id} onClick={() => handleEditEmployee(emp)}
                style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '14px 24px', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <input type="checkbox" checked={selectedIds.has(emp.user_id)} onChange={() => toggleSelect(emp.user_id)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(emp)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</div>
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.positions?.title || '—'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleLabel(emp)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: lvl.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lvl.name}</span>
                </div>
                <div style={{ color: 'var(--accent-gold)', fontSize: 13, fontWeight: 600 }}>{energyMap[emp.user_id] || 0}</div>
                <div onClick={e => e.stopPropagation()}>
                  {canDelete && (
                    <button onClick={() => handleDeleteEmployee(emp.user_id)} style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '5px 12px', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#dc2626'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'}>Удалить</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {pendingInvites.length > 0 && (
          <div style={{ marginTop: 28, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, border: '1px solid var(--border-subtle)', padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>Ожидают активации ({pendingInvites.length})</h3>
            {pendingInvites.map(inv => (
              <div key={inv.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div><div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{inv.email}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>приглашён {new Date(inv.created_at).toLocaleDateString('ru')}</div></div>
                <button onClick={() => cancelInvite(inv.id)} style={{ background: 'none', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '5px 14px', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>Отменить</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PremiumModal isOpen={addPositionOpen} onClose={() => { setAddPositionOpen(false); setNewPositionTitle('') }} title="Новая должность" showCloseButton={false}>
        <input className="input-field" style={{ width: '100%', marginBottom: 16 }} placeholder="Например, Старший менеджер" value={newPositionTitle} onChange={e => setNewPositionTitle(e.target.value)} autoFocus />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setAddPositionOpen(false); setNewPositionTitle('') }} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
          <button onClick={handleAddPosition} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Добавить</button>
        </div>
      </PremiumModal>

      <PremiumModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Пригласить сотрудника" showCloseButton={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" className="input-field" style={{ width: '100%' }} placeholder="email@company.ru" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="input-field" placeholder="Имя" value={newEmployee.first_name} onChange={e => setNewEmployee({ ...newEmployee, first_name: e.target.value })} />
            <input className="input-field" placeholder="Фамилия" value={newEmployee.last_name} onChange={e => setNewEmployee({ ...newEmployee, last_name: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select className="input-field" value={newEmployee.position_id} onChange={e => setNewEmployee({ ...newEmployee, position_id: e.target.value })}><option value="">Без должности</option>{positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
            <select className="input-field" value={newEmployee.role_id} onChange={e => setNewEmployee({ ...newEmployee, role_id: e.target.value })}><option value="">Без роли</option>{companyRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </div>
          <div>{PERMISSION_FIELDS.map(f => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 6 }}>
              <input type="checkbox" checked={!!newEmployee[f.key]} onChange={e => setNewEmployee({ ...newEmployee, [f.key]: e.target.checked })} style={{ accentColor: '#8a6208' }} />{f.label}
            </label>
          ))}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowAddModal(false)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
            <button onClick={handleAddEmployee} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Пригласить</button>
          </div>
        </div>
      </PremiumModal>

      <PremiumModal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title="Редактировать сотрудника" showCloseButton={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="input-field" placeholder="Имя" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
            <input className="input-field" placeholder="Фамилия" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
          </div>
          <input type="email" className="input-field" style={{ width: '100%' }} value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select className="input-field" value={editForm.position_id} onChange={e => setEditForm({ ...editForm, position_id: e.target.value })}><option value="">Без должности</option>{positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
            <select className="input-field" value={editForm.role_id} onChange={e => setEditForm({ ...editForm, role_id: e.target.value })}><option value="">Без роли</option>{companyRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </div>
          <div>{PERMISSION_FIELDS.map(f => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 6 }}>
              <input type="checkbox" checked={!!editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.checked })} style={{ accentColor: '#8a6208' }} />{f.label}
            </label>
          ))}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditingEmployee(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
            <button onClick={handleSaveEdit} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
          </div>
        </div>
      </PremiumModal>
    </div>
  )
}
export default withAuth(EmployeesPage, { permission: 'can_manage_employees' })
