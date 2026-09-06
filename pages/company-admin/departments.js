import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }
const Seg = ({ active, onClick, children, color = '#8a6208' }) => (
  <button type="button" onClick={onClick} style={{ padding: '6px 14px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? `linear-gradient(135deg, ${color}22, ${color}0d)` : 'var(--bg-card)', border: `1px solid ${active ? color + '88' : 'var(--border-subtle)'}`, color: active ? color : 'var(--text-secondary)', transition: 'all 0.2s ease' }}>{children}</button>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(14,116,144,0.06)', border: '1px solid rgba(14,116,144,0.3)' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(14,116,144,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#0e7490', overflow: 'hidden' }}>
          {selected.avatar_url ? <img src={selected.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : empName(selected).charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(selected)}</span>
        <RoleBadge roleName={selected.role_name} />
        {clearable && (
          <button type="button" onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
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
        <div style={{ position: 'absolute', zIndex: 30, marginTop: 4, width: '100%', maxHeight: 200, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card-hover)' }}>
          {employees.filter(e => empName(e).toLowerCase().includes(search.toLowerCase())).map(e => (
            <button type="button" key={e.user_id} onMouseDown={() => { onChange(e.user_id); setSearch('') }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--bg-hover)' }} onMouseLeave={ev => { ev.currentTarget.style.background = 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(184,134,11,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8a6208', overflow: 'hidden' }}>
                {e.avatar_url ? <img src={e.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : empName(e).charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{empName(e)}</span>
              <RoleBadge roleName={e.role_name} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Бейдж роли сотрудника — раньше нигде в этом файле не показывался,
// из-за чего при раскидывании по отделам администратор терял из виду,
// кто чем назначен, и был вынужден проверять отдельно на странице
// сотрудников (пункт 4 фидбека от 2 сентября 2026).
function RoleBadge({ roleName }) {
  if (!roleName) return null
  const isAdmin = roleName === 'Администратор'
  return (
    <span style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0, background: isAdmin ? 'rgba(184,134,11,0.12)' : 'rgba(14,116,144,0.1)', color: isAdmin ? '#8a6208' : '#0e7490', border: `1px solid ${isAdmin ? 'var(--border-gold)' : 'rgba(14,116,144,0.3)'}` }}>
      {roleName}
    </span>
  )
}

// Выбор родительского отдела с кнопкой «+» — раньше единственным
// способом завести родителя, которого ещё не существует, было закрыть
// текущую форму, создать его отдельно, вернуться и найти в списке
// (пункт 4 фидбека от 2 сентября 2026: «приходится бегать по
// страницам»). Клик по «+» открывает крошечную форму прямо здесь же.
function ParentDeptPicker({ pickerList, value, onChange, onCreateNew }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  if (creating) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input-field" style={{ flex: 1 }} placeholder="Название нового родительского отдела" value={newName}
          onChange={e => setNewName(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }} />
        <button type="button" disabled={saving || !newName.trim()} onClick={async () => {
          setSaving(true)
          const newId = await onCreateNew(newName.trim())
          setSaving(false)
          if (newId) { onChange(newId); setCreating(false); setNewName('') }
        }} style={{ ...ghostBtn, padding: '8px 14px', borderColor: 'var(--border-gold)', color: '#8a6208' }}>{saving ? '…' : 'Создать'}</button>
        <button type="button" onClick={() => { setCreating(false); setNewName('') }} style={{ ...ghostBtn, padding: '8px 12px' }}>Отмена</button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select className="input-field" style={{ flex: 1 }} value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">— Верхний уровень —</option>
        {pickerList.map(p => <option key={p.id} value={p.id}>{'—'.repeat(p.depth)} {p.name}</option>)}
      </select>
      <button type="button" onClick={() => setCreating(true)} title="Создать новый родительский отдел" style={{ ...ghostBtn, padding: '8px 14px', fontSize: 16, lineHeight: 1, fontWeight: 700 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+</button>
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
  const [selectedDept, setSelectedDept] = useState(null)
  const [savingField, setSavingField] = useState(false)

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

  // Создание отдела «в одно действие» — используется и мини-формой
  // родителя внутри ParentDeptPicker, и основной кнопкой создания.
  // Возвращает id нового отдела или null при ошибке.
  const quickCreateDept = async (name, parentId = null) => {
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/departments', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentDepartmentId: parentId, managerUserId: null }) })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось создать отдел'); return null }
      await load()
      return d.id
    } catch (e) { showError(e.message); return null }
  }

  // Автосохранение поля существующего отдела — уходит из поля/меняет
  // выбор, сохраняется само, без отдельной кнопки «Сохранить» (тот же
  // принцип, что уже применён в ручном заполнении показателей).
  const patchDept = async (deptId, patch) => {
    setSavingField(true)
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/departments', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deptId, ...patch }) })
      if (!r.ok) { const d = await r.json(); showError(d.error || 'Не удалось сохранить'); return }
      await load()
    } catch (e) { showError(e.message) } finally { setSavingField(false) }
  }

  const createDraftDept = async (draft) => {
    if (!draft.name?.trim()) { showError('Укажите название отдела'); return }
    if (draft.inviteByEmail && !draft.managerEmail?.trim()) { showError('Укажите email будущего руководителя'); return }
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/departments', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, parentDepartmentId: draft.parent_department_id, managerUserId: draft.inviteByEmail ? null : draft.manager_user_id }) })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось сохранить отдел'); return }

      if (draft.inviteByEmail && draft.managerEmail?.trim()) {
        const ir = await fetch('/api/company-admin/invite-department-manager', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: draft.managerEmail.trim(), departmentId: d.id }) })
        const id = await ir.json()
        if (!ir.ok) showError('Отдел сохранён, но приглашение не отправлено: ' + (id.error || ''))
        else showSuccess(id.status === 'assigned_existing' ? 'Отдел сохранён, руководитель назначен' : 'Отдел сохранён, приглашение отправлено')
      } else {
        showSuccess('Отдел создан — теперь можно сразу добавить сотрудников')
      }
      await load()
      // Остаёмся в той же панели, переключаясь из «черновика» в
      // «реальный отдел» — сразу видно поле добавления сотрудников,
      // не нужно искать созданный отдел в дереве заново.
      setSelectedDept({ id: d.id, name: draft.name, parent_department_id: draft.parent_department_id, manager_user_id: draft.inviteByEmail ? null : draft.manager_user_id })
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
  const pickerList = flattenForPicker(tree, 0, selectedDept?.id)

  const renderNode = (node, depth) => {
    const isOpen = expanded.has(node.id)
    const manager = employees.find(e => e.user_id === node.manager_user_id)
    return (
      <div key={node.id}>
        <div
          onClick={() => setSelectedDept(node)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginLeft: depth * 28, borderRadius: 14, cursor: 'pointer', background: selectedDept?.id === node.id ? 'rgba(184,134,11,0.06)' : 'var(--bg-card)', boxShadow: 'var(--shadow-card)', border: `1px solid ${selectedDept?.id === node.id ? 'var(--border-gold)' : 'var(--border-subtle)'}`, marginBottom: 8, transition: 'all 0.2s' }}
        >
          {node.children.length > 0 ? (
            <button onClick={e => { e.stopPropagation(); toggle(node.id) }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, display: 'flex', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ) : <span style={{ width: 14 }} />}
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7l9-4 9 4v14" /><path d="M9 21V12h6v9" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{node.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {manager ? `Руководитель: ${empName(manager)}` : 'Руководитель не назначен'} · {countEmployees(node.id)} сотр.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedDept({ isDraft: true, parent_department_id: node.id, name: '', manager_user_id: null })} title="Добавить подотдел" style={{ ...ghostBtn, padding: '6px 10px' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Подотдел</button>
            <button onClick={() => deleteDept(node)} title="Удалить" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '6px 9px', color: '#dc2626', cursor: 'pointer' }}>
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
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Отделы компании" extra={
          <button onClick={() => setSelectedDept({ isDraft: true, parent_department_id: null, name: '', manager_user_id: null })} style={{ ...ghostBtn, marginLeft: 'auto', borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Новый отдел</button>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: selectedDept ? '1fr 460px' : '1fr', gap: 24, alignItems: 'start' }}>
          <div>
            {tree.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                Отделов пока нет. Можно подключать сколько угодно команд — отделы продаж по городам, маркетинг, поддержку — каждый со своим руководителем, и вкладывать отделы друг в друга при необходимости.
              </div>
            ) : tree.map(n => renderNode(n, 0))}

            {unassigned.length > 0 && (
              <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>Без отдела ({unassigned.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {unassigned.map(e => (
                    <span key={e.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', padding: '4px 6px 4px 10px', borderRadius: 20, background: 'var(--bg-page)' }}>
                      {empName(e)} <RoleBadge roleName={e.role_name} />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedDept && (
            <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 24, border: '1px solid var(--border-gold)', position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{selectedDept.isDraft ? 'Новый отдел' : selectedDept.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {savingField && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Сохраняем…</span>}
                  {!selectedDept.isDraft && (
                    <button onClick={() => deleteDept(selectedDept)} title="Удалить отдел" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '6px 9px', color: '#dc2626', cursor: 'pointer' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  )}
                  <button onClick={() => setSelectedDept(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Название</label>
              <input className="input-field" style={{ width: '100%', marginBottom: 16 }} placeholder="Например: Отдел продаж — Москва" value={selectedDept.name}
                onChange={e => setSelectedDept({ ...selectedDept, name: e.target.value })}
                onBlur={() => !selectedDept.isDraft && selectedDept.name?.trim() && patchDept(selectedDept.id, { name: selectedDept.name })}
                autoFocus={selectedDept.isDraft} />

              <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Родительский отдел</label>
              <div style={{ marginBottom: 16 }}>
                <ParentDeptPicker pickerList={pickerList} value={selectedDept.parent_department_id}
                  onChange={v => { setSelectedDept({ ...selectedDept, parent_department_id: v }); if (!selectedDept.isDraft) patchDept(selectedDept.id, { parentDepartmentId: v }) }}
                  onCreateNew={(name) => quickCreateDept(name, null)} />
              </div>

              <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Руководитель</label>
              {selectedDept.isDraft ? (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <Seg active={!selectedDept.inviteByEmail} onClick={() => setSelectedDept({ ...selectedDept, inviteByEmail: false, managerEmail: '' })}>Уже есть в системе</Seg>
                    <Seg active={selectedDept.inviteByEmail} onClick={() => setSelectedDept({ ...selectedDept, inviteByEmail: true, manager_user_id: null })} color="#137a39">Пригласить по email</Seg>
                  </div>
                  {selectedDept.inviteByEmail ? (
                    <input className="input-field" style={{ width: '100%' }} type="email" placeholder="manager@company.ru" value={selectedDept.managerEmail || ''} onChange={e => setSelectedDept({ ...selectedDept, managerEmail: e.target.value })} />
                  ) : (
                    <EmployeePicker employees={employees} value={selectedDept.manager_user_id} empName={empName} onChange={v => setSelectedDept({ ...selectedDept, manager_user_id: v })} />
                  )}
                  {selectedDept.inviteByEmail && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0 0' }}>Если этого человека ещё нет в компании — он получит приглашение и автоматически станет руководителем этого отдела, как только зарегистрируется.</p>}
                  <button onClick={() => createDraftDept(selectedDept)} style={{ ...ghostBtn, width: '100%', marginTop: 20, borderColor: 'var(--border-gold)', color: 'var(--accent-gold)', padding: '12px 0', fontSize: 14, fontWeight: 600 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Создать отдел</button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <EmployeePicker employees={employees} value={selectedDept.manager_user_id} empName={empName}
                      onChange={v => { setSelectedDept({ ...selectedDept, manager_user_id: v }); setDeptManager(selectedDept.id, v) }} />
                  </div>
                  <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Сотрудники отдела ({countEmployees(selectedDept.id)})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
                    {employees.filter(e => e.department_id === selectedDept.id).map(e => (
                      <div key={e.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--bg-page)' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(e)}</span>
                        <RoleBadge roleName={e.role_name} />
                        <button onClick={() => assignEmployee(e.user_id, { departmentId: null })} title="Убрать из отдела" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    {countEmployees(selectedDept.id) === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Пока никого — добавьте ниже.</p>}
                  </div>
                  <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Добавить сотрудника в отдел</label>
                  <EmployeePicker employees={employees.filter(e => e.department_id !== selectedDept.id)} value={null} empName={empName}
                    onChange={v => v && assignEmployee(v, { departmentId: selectedDept.id })} placeholder="Начните вводить имя…" clearable={false} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default withAuth(DepartmentAdmin, { permission: 'can_manage_employees' })
