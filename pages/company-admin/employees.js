import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'

function EmployeesPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editForm, setEditForm] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: 6 })
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ email: '', first_name: '', last_name: '', position_id: '', role_id: 6 })
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [notification, setNotification] = useState({ show: false, message: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
      if (!profileData) { router.push('/'); return }
      setCompanyId(profileData.company_id)
      await loadData(profileData.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const loadData = async (compId) => {
    const [empRes, posRes] = await Promise.all([
      supabase.from('profiles').select('*, positions(title)').eq('company_id', compId).is('deleted_at', null),
      supabase.from('positions').select('*').eq('company_id', compId).order('title')
    ])
    setEmployees(empRes.data?.filter(emp => ![1,2].includes(emp.role_id)) || [])
    setPositions(posRes.data || [])
  }

  const showNotification = (msg) => {
    setNotification({ show: true, message: msg })
    setTimeout(() => setNotification({ show: false, message: '' }), 3000)
  }

  const handleAddPosition = async () => {
    if (!newPositionTitle.trim()) return
    const { error } = await supabase.from('positions').insert({ company_id: companyId, title: newPositionTitle.trim() })
    if (!error) {
      setNewPositionTitle('')
      loadData(companyId)
      showNotification('Должность добавлена')
    } else {
      showNotification('Ошибка добавления должности')
    }
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.email) return
    const { error } = await supabase.from('profiles').insert({
      email: newEmployee.email,
      first_name: newEmployee.first_name,
      last_name: newEmployee.last_name,
      position_id: newEmployee.position_id || null,
      role_id: newEmployee.role_id,
      company_id: companyId,
      display_name: `${newEmployee.first_name} ${newEmployee.last_name}`.trim() || newEmployee.email
    })
    if (!error) {
      setShowAddModal(false)
      setNewEmployee({ email: '', first_name: '', last_name: '', position_id: '', role_id: 6 })
      loadData(companyId)
      showNotification('Сотрудник добавлен')
    } else {
      showNotification('Ошибка: ' + error.message)
    }
  }

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp)
    setEditForm({
      email: emp.email || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      position_id: emp.position_id || '',
      role_id: emp.role_id || 6
    })
  }

  const handleSaveEdit = async () => {
    if (!editingEmployee) return
    const { error } = await supabase.from('profiles').update({
      email: editForm.email,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      position_id: editForm.position_id || null,
      role_id: editForm.role_id,
      display_name: `${editForm.first_name} ${editForm.last_name}`.trim() || editForm.email
    }).eq('id', editingEmployee.id)
    if (!error) {
      setEditingEmployee(null)
      loadData(companyId)
      showNotification('Сотрудник обновлён')
    } else {
      showNotification('Ошибка сохранения')
    }
  }

  const handleDeleteEmployee = async (empId) => {
    await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', empId)
    loadData(companyId)
    showNotification('Сотрудник удалён')
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#d4af37' }}>Управление командой</h1>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          className="input-field w-48"
          placeholder="Новая должность"
          value={newPositionTitle}
          onChange={e => setNewPositionTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddPosition()}
        />
        <button onClick={handleAddPosition} className="btn-outline text-sm px-3 py-2">Добавить должность</button>
        <button onClick={() => setShowAddModal(true)} className="btn-gold text-sm px-4 py-2 ml-auto">Добавить сотрудника</button>
      </div>

      <div className="pastel-card overflow-auto max-h-[70vh]">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="py-2 pr-4">Имя</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Должность</th>
              <th className="py-2 pr-4">Роль</th>
              <th className="py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={() => handleEditEmployee(emp)}>
                <td className="py-3 pr-4">{emp.display_name || emp.email}</td>
                <td className="py-3 pr-4 text-gray-400">{emp.email}</td>
                <td className="py-3 pr-4">{emp.positions?.title || '—'}</td>
                <td className="py-3 pr-4">{emp.role_id === 4 ? 'Модератор' : 'Сотрудник'}</td>
                <td className="py-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleDeleteEmployee(emp.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модалки остаются без изменений */}
    </div>
  )
}

export default withAuth(EmployeesPage, [1, 2])
