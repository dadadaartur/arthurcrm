import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
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
const GRID = '2.2fr 1.4fr 1fr 1.2fr 0.9fr 110px'
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '10px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }

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
    return current || { name: '—', color: '#888' }
  }
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление командой" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={() => setAddPositionOpen(true)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Должность</button>
            <button onClick={() => setShowAddModal(true)} style={{ ...ghostBtn, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сотрудник</button>
          </div>
        } />

        {/* Таблица с жёсткой сеткой — шапка и строки совпадают */}
        <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            <div>Сотрудник</div><div>Должность</div><div>Роль</div><div>Уровень</div><div>Энергия</div><div></div>
          </div>
          {employees.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#777' }}>В команде пока нет сотрудников</div>}
          {employees.map(emp => {
            const lvl = getEmployeeLevel(emp.user_id)
            return (
              <div key={emp.user_id} onClick={() => handleEditEmployee(emp)}
                style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '14px 24px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(emp)}</div>
                  <div style={{ color: '#666', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</div>
                </div>
                <div style={{ color: '#ccc', fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.positions?.title || '—'}</div>
                <div style={{ color: '#aaa', fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleLabel(emp)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: lvl.color, boxShadow: `0 0 8px ${lvl.color}88`, flexShrink: 0 }} />
                  <span style={{ color: lvl.color, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lvl.name}</span>
                </div>
                <div style={{ color: '#FFD700', fontSize: 13, fontWeight: 600 }}>{energyMap[emp.user_id] || 0}</div>
                <div onClick={e => e.stopPropagation()}>
                  {canDelete && (
                    <button onClick={() => handleDeleteEmployee(emp.user_id)} style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, padding: '5px 12px', color: '#f87171', fontSize: 11, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#f87171'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(244,67,54,0.3)'}>Удалить</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {pendingInvites.length > 0 && (
          <div style={{ marginTop: 28, background: 'rgba(15,20,35,0.85)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Ожидают активации ({pendingInvites.length})</h3>
            {pendingInvites.map(inv => (
              <div key={inv.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div><div style={{ fontSize: 13 }}>{inv.email}</div><div style={{ fontSize: 11, color: '#666' }}>приглашён {new Date(inv.created_at).toLocaleDateString('ru')}</div></div>
                <button onClick={() => cancelInvite(inv.id)} style={{ background: 'none', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, padding: '5px 14px', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>Отменить</button>
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
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ccc', cursor: 'pointer', marginBottom: 6 }}>
              <input type="checkbox" checked={!!newEmployee[f.key]} onChange={e => setNewEmployee({ ...newEmployee, [f.key]: e.target.checked })} style={{ accentColor: '#FFD700' }} />{f.label}
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
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ccc', cursor: 'pointer', marginBottom: 6 }}>
              <input type="checkbox" checked={!!editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.checked })} style={{ accentColor: '#FFD700' }} />{f.label}
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
