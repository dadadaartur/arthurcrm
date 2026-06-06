import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'

export default function EmployeesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [newEmployee, setNewEmployee] = useState({
    email: '', first_name: '', last_name: '', position_id: '', role_id: 6
  })
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [editingPosition, setEditingPosition] = useState(null)
  const [editPositionTitle, setEditPositionTitle] = useState('')
  const [deletePositionId, setDeletePositionId] = useState(null)
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, roles(name, is_system)')
        .eq('user_id', user.id)
        .single()

      if (!profileData || (profileData.role_id !== 1 && profileData.role_id !== 2)) {
        router.push('/')
        return
      }
      setProfile(profileData)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async () => {
    const [empRes, posRes] = await Promise.all([
      supabase.from('profiles').select('*, positions(title)').eq('company_id', profile.company_id).is('deleted_at', null),
      supabase.from('positions').select('*').eq('company_id', profile.company_id).order('title')
    ])
    // убираем суперадмина и текущего админа
    setEmployees(empRes.data?.filter(emp => ![1,2].includes(emp.role_id)) || [])
    setPositions(posRes.data || [])
  }

  const handleAddPosition = async () => {
    if (!newPositionTitle.trim()) return
    await supabase.from('positions').insert({ company_id: profile.company_id, title: newPositionTitle.trim() })
    setNewPositionTitle('')
    loadData()
  }

  const handleEditPosition = async (id) => {
    if (!editPositionTitle.trim()) return
    await supabase.from('positions').update({ title: editPositionTitle.trim() }).eq('id', id)
    setEditingPosition(null)
    setEditPositionTitle('')
    loadData()
  }

  const handleDeletePosition = async (id) => {
    await supabase.from('positions').delete().eq('id', id)
    setDeletePositionId(null)
    loadData()
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.email) return
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', newEmployee.email).maybeSingle()
    if (existing) {
      setSuccessModal({ show: true, message: 'Сотрудник с таким email уже существует' })
      return
    }

    const { error } = await supabase.from('profiles').insert({
      email: newEmployee.email,
      first_name: newEmployee.first_name,
      last_name: newEmployee.last_name,
      position_id: newEmployee.position_id || null,
      role_id: newEmployee.role_id,
      company_id: profile.company_id,
      display_name: `${newEmployee.first_name} ${newEmployee.last_name}`.trim() || newEmployee.email
    })

    if (!error) {
      setShowAddEmployee(false)
      setNewEmployee({ email: '', first_name: '', last_name: '', position_id: '', role_id: 6 })
      loadData()
      setSuccessModal({ show: true, message: 'Сотрудник добавлен' })
    } else {
      setSuccessModal({ show: true, message: 'Ошибка: ' + error.message })
    }
  }

  const handleDeleteEmployee = async (employeeId) => {
    await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', employeeId)
    loadData()
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Сотрудники и должности</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Должности */}
        <div className="pastel-card">
          <h3 className="text-lg font-semibold mb-4">Должности</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Название должности"
              value={newPositionTitle}
              onChange={e => setNewPositionTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPosition()}
            />
            <button onClick={handleAddPosition} className="btn-outline text-sm px-4 py-2">Добавить</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {positions.map(pos => (
              <div key={pos.id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1">
                {editingPosition === pos.id ? (
                  <>
                    <input
                      type="text"
                      className="input-field w-28 py-0.5"
                      value={editPositionTitle}
                      onChange={e => setEditPositionTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditPosition(pos.id)}
                    />
                    <button onClick={() => handleEditPosition(pos.id)} className="text-xs text-green-400">✓</button>
                    <button onClick={() => setEditingPosition(null)} className="text-xs text-red-400">✕</button>
                  </>
                ) : (
                  <>
                    <span className="text-white text-sm">{pos.title}</span>
                    <button onClick={() => { setEditingPosition(pos.id); setEditPositionTitle(pos.title) }} className="text-xs text-blue-400 ml-2">✎</button>
                    <button onClick={() => setDeletePositionId(pos.id)} className="text-xs text-red-400 ml-1">✕</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Сотрудники */}
        <div className="pastel-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Сотрудники</h3>
            <button onClick={() => setShowAddEmployee(true)} className="btn-outline text-sm px-4 py-2">Добавить</button>
          </div>

          {showAddEmployee && (
            <div className="modal-overlay" onClick={() => setShowAddEmployee(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 text-gold">Новый сотрудник</h3>
                <div className="space-y-4">
                  <input type="email" className="input-field" placeholder="Email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} />
                  <input type="text" className="input-field" placeholder="Имя" value={newEmployee.first_name} onChange={e => setNewEmployee({...newEmployee, first_name: e.target.value})} />
                  <input type="text" className="input-field" placeholder="Фамилия" value={newEmployee.last_name} onChange={e => setNewEmployee({...newEmployee, last_name: e.target.value})} />
                  <select className="input-field" value={newEmployee.position_id} onChange={e => setNewEmployee({...newEmployee, position_id: e.target.value})}>
                    <option value="">Без должности</option>
                    {positions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowAddEmployee(false)} className="btn-outline">Отмена</button>
                  <button onClick={handleAddEmployee} className="btn-gold">Добавить</button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {employees.map(emp => (
              <div key={emp.id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                <div>
                  <span className="text-white">{emp.display_name || emp.email}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {emp.positions?.title || 'Без должности'} — {emp.role_id === 4 ? 'Модератор' : 'Сотрудник'}
                  </span>
                </div>
                <button onClick={() => handleDeleteEmployee(emp.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>

      {deletePositionId && (
        <div className="modal-overlay" onClick={() => setDeletePositionId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gold">Удалить должность?</h3>
            <div className="flex justify-center gap-4">
              <button onClick={() => setDeletePositionId(null)} className="btn-outline">Отмена</button>
              <button onClick={() => handleDeletePosition(deletePositionId)} className="btn-gold">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
