import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }
const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button type="button" onClick={onClick} style={{ padding: '6px 14px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`, color: active ? color : '#999', transition: 'all 0.2s ease' }}>{children}</button>
)

// Поиск сотрудника с аватаром — тот же паттерн, что в переводе кармиков и
// назначении плана адаптации, вынесен сюда локально ради скорости (третье
// место применения — кандидат на выделение в общий компонент отдельным
// заходом).
function EmployeePicker({ employees, value, onChange, empName, placeholder = 'Не назначен', clearable = true }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = employees.find(e => e.user_id === value)
  if (selected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.3)' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(160,233,255,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#a0e9ff', overflow: 'hidden' }}>
          {selected.avatar_url ? <img src={selected.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : empName(selected).charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(selected)}</span>
        {clearable && (
          <button type="button" onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    )
  }
  return (
    <div style={{ position: 'relative' }}>
      <input className="input-field" style={{ width: '100%', fontSize: 12 }} placeholder={placeholder} value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} autoComplete="off" />
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, marginTop: 4, width: '100%', maxHeight: 200, overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(20,25,45,0.98)', backdropFilter: 'blur(16px)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
          {employees.filter(e => empName(e).toLowerCase().includes(search.toLowerCase())).map(e => (
            <button type="button" key={e.user_id} onMouseDown={() => { onChange(e.user_id); setSearch('') }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,215,0,0.08)' }} onMouseLeave={ev => { ev.currentTarget.style.background = 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,215,0,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#FFD700', overflow: 'hidden' }}>
                {e.avatar_url ? <img src={e.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : empName(e).charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: '#fff' }}>{empName(e)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function buildTree(departments) {
  const byId = {}
  departments.forEach(d => { byId[d.id] = { ...d, children: [] } })
  const roots = []
  departments.forEach(d => {
    if (d.parent_department_id && byId[d.parent_department_id]) byId[d.parent_department_id].children.push(byId[d.id])
    else roots.push(byId[d.id])
  })
  return roots
}
// Плоский список с указанием глубины — для выпадающего списка «родитель»
// (не даём выбрать в родители самого себя или своего потомка).
function flattenForPicker(nodes, depth = 0, excludeId = null, out = []) {
  nodes.forEach(n => {
    if (n.id !== excludeId) {
      out.push({ id: n.id, name: n.name, depth })
      flattenForPicker(n.children, depth + 1, excludeId, out)
    }
  })
  return out
}

function DepartmentAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [editDept, setEditDept] = useState(null)
  const [selectedDept, setSelectedDept] = useState(null)

  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Сессия истекла — обновите страницу')
    return { Authorization: `Bearer ${session.access_token}` }
  }

  const load = async () => {
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/departments', { headers: h })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось загрузить отделы'); return }
      setDepartments(d.departments)
      setEmployees(d.employees)
    } catch (e) {
      showError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const saveDept = async () => {
    if (!editDept.name?.trim()) { showError('Укажите название отдела'); return }
    if (editDept.inviteByEmail && !editDept.managerEmail?.trim()) { showError('Укажите email будущего руководителя'); return }
    try {
      const h = await auth()
      const r = editDept.id
        ? await fetch('/api/company-admin/departments', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editDept.id, name: editDept.name, parentDepartmentId: editDept.parent_department_id, managerUserId: editDept.manager_user_id }) })
        : await fetch('/api/company-admin/departments', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editDept.name, parentDepartmentId: editDept.parent_department_id, managerUserId: editDept.inviteByEmail ? null : editDept.manager_user_id }) })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось сохранить отдел'); return }

      if (editDept.inviteByEmail && editDept.managerEmail?.trim()) {
        const deptId = editDept.id || d.id
        const ir = await fetch('/api/company-admin/invite-department-manager', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: editDept.managerEmail.trim(), departmentId: deptId }) })
        const id = await ir.json()
        if (!ir.ok) { showError('Отдел сохранён, но приглашение не отправлено: ' + (id.error || '')); setEditDept(null); load(); return }
        showSuccess(id.status === 'assigned_existing' ? 'Отдел сохранён, руководитель назначен' : 'Отдел сохранён, приглашение руководителю отправлено')
      } else {
        showSuccess(editDept.id ? 'Отдел обновлён' : 'Отдел создан')
      }
      setEditDept(null)
      load()
    } catch (e) { showError(e.message) }
  }

  const setDeptManager = async (deptId, managerUserId) => {
    try {
      const h = await auth()
      await fetch('/api/company-admin/departments', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deptId, managerUserId }) })
      load()
    } catch (e) { showError(e.message) }
  }

  const deleteDept = async (dept) => {
    if (!confirm(`Удалить отдел «${dept.name}»? Подотделы и сотрудники останутся, но потеряют привязку к нему.`)) return
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/departments', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dept.id }) })
      if (!r.ok) { const d = await r.json(); showError(d.error || 'Не удалось удалить'); return }
      showSuccess('Отдел удалён')
      if (selectedDept?.id === dept.id) setSelectedDept(null)
      load()
    } catch (e) { showError(e.message) }
  }

  const assignEmployee = async (userId, patch) => {
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/departments', { method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, ...patch }) })
      if (!r.ok) { const d = await r.json(); showError(d.error || 'Не удалось сохранить'); return }
      load()
    } catch (e) { showError(e.message) }
  }

  const toggle = id => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (loading) return <LoadingScreen />

  const tree = buildTree(departments)
  const countEmployees = deptId => employees.filter(e => e.department_id === deptId).length
  const pickerList = flattenForPicker(tree, 0, editDept?.id)

  const renderNode = (node, depth) => {
    const isOpen = expanded.has(node.id)
    const manager = employees.find(e => e.user_id === node.manager_user_id)
    return (
      <div key={node.id}>
        <div
          onClick={() => setSelectedDept(node)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginLeft: depth * 28, borderRadius: 14, cursor: 'pointer', background: selectedDept?.id === node.id ? 'rgba(255,215,0,0.08)' : 'rgba(15,20,35,0.85)', border: `1px solid ${selectedDept?.id === node.id ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)'}`, marginBottom: 8, transition: 'all 0.2s' }}
        >
          {node.children.length > 0 ? (
            <button onClick={e => { e.stopPropagation(); toggle(node.id) }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 2, display: 'flex', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ) : <span style={{ width: 14 }} />}
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7l9-4 9 4v14" /><path d="M9 21V12h6v9" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{node.name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {manager ? `Руководитель: ${empName(manager)}` : 'Руководитель не назначен'} · {countEmployees(node.id)} сотр.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditDept({ parent_department_id: node.id, name: '', manager_user_id: null })} title="Добавить подотдел" style={{ ...ghostBtn, padding: '6px 10px' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Подотдел</button>
            <button onClick={() => setEditDept(node)} title="Редактировать" style={{ background: 'rgba(160,233,255,0.08)', border: '1px solid rgba(160,233,255,0.3)', borderRadius: 10, padding: '6px 9px', color: '#a0e9ff', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
            </button>
            <button onClick={() => deleteDept(node)} title="Удалить" style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 10, padding: '6px 9px', color: '#f87171', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
        {isOpen && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  const unassigned = employees.filter(e => !e.department_id && !e.is_company_admin)

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Отделы компании" extra={
          <button onClick={() => setEditDept({ parent_department_id: null, name: '', manager_user_id: null })} style={{ ...ghostBtn, marginLeft: 'auto', borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Новый отдел</button>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: selectedDept ? '1fr 380px' : '1fr', gap: 24, alignItems: 'start' }}>
          <div>
            {tree.length === 0 ? (
              <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>
                Отделов пока нет. Можно подключать сколько угодно команд — отделы продаж по городам, маркетинг, поддержку — каждый со своим руководителем, и вкладывать отделы друг в друга при необходимости.
              </div>
            ) : tree.map(n => renderNode(n, 0))}

            {unassigned.length > 0 && (
              <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>Без отдела ({unassigned.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {unassigned.map(e => <span key={e.user_id} style={{ fontSize: 12, color: '#ccc', padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)' }}>{empName(e)}</span>)}
                </div>
              </div>
            )}
          </div>

          {selectedDept && (
            <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 22, border: '1px solid rgba(255,215,0,0.25)', position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{selectedDept.name}</h3>
                <button onClick={() => setSelectedDept(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Руководитель отдела</label>
              <div style={{ marginBottom: 18 }}>
                <EmployeePicker employees={employees} value={selectedDept.manager_user_id} empName={empName}
                  onChange={v => setDeptManager(selectedDept.id, v)} />
              </div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Сотрудники отдела ({countEmployees(selectedDept.id)})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, maxHeight: 260, overflowY: 'auto' }}>
                {employees.filter(e => e.department_id === selectedDept.id).map(e => (
                  <div key={e.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 12, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(e)}</span>
                    <button onClick={() => assignEmployee(e.user_id, { departmentId: null })} title="Убрать из отдела" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Добавить сотрудника в отдел</label>
              <EmployeePicker employees={employees.filter(e => e.department_id !== selectedDept.id)} value={null} empName={empName}
                onChange={v => v && assignEmployee(v, { departmentId: selectedDept.id })} placeholder="Начните вводить имя…" clearable={false} />
            </div>
          )}
        </div>
      </div>

      {editDept && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={() => setEditDept(null)}>
          <div style={{ background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 20, padding: 26, maxWidth: 420, width: '94%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 16px' }}>{editDept.id ? 'Редактировать отдел' : 'Новый отдел'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название</label>
                <input className="input-field" style={{ width: '100%' }} placeholder="Например: Отдел продаж — Москва" value={editDept.name} onChange={e => setEditDept({ ...editDept, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Родительский отдел</label>
                <select className="input-field" style={{ width: '100%' }} value={editDept.parent_department_id || ''} onChange={e => setEditDept({ ...editDept, parent_department_id: e.target.value || null })}>
                  <option value="">— Верхний уровень —</option>
                  {pickerList.map(p => <option key={p.id} value={p.id}>{'—'.repeat(p.depth)} {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Руководитель</label>
                {editDept.id ? (
                  <EmployeePicker employees={employees} value={editDept.manager_user_id} empName={empName} onChange={v => setEditDept({ ...editDept, manager_user_id: v })} />
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      <Seg active={!editDept.inviteByEmail} onClick={() => setEditDept({ ...editDept, inviteByEmail: false, managerEmail: '' })}>Уже есть в системе</Seg>
                      <Seg active={editDept.inviteByEmail} onClick={() => setEditDept({ ...editDept, inviteByEmail: true, manager_user_id: null })} color="#4ade80">Пригласить по email</Seg>
                    </div>
                    {editDept.inviteByEmail ? (
                      <input className="input-field" style={{ width: '100%' }} type="email" placeholder="manager@company.ru" value={editDept.managerEmail || ''} onChange={e => setEditDept({ ...editDept, managerEmail: e.target.value })} />
                    ) : (
                      <EmployeePicker employees={employees} value={editDept.manager_user_id} empName={empName} onChange={v => setEditDept({ ...editDept, manager_user_id: v })} />
                    )}
                    {editDept.inviteByEmail && <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0' }}>Если этого человека ещё нет в компании — он получит приглашение и автоматически станет руководителем этого отдела, как только зарегистрируется.</p>}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={() => setEditDept(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
                <button onClick={saveDept} style={{ ...ghostBtn, flex: 1, borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default withAuth(DepartmentAdmin, { permission: 'can_manage_employees' })
