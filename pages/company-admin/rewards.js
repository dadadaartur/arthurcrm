import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import SuccessBurst from '../../components/SuccessBurst'

const TYPE_LABELS = { digital: 'Сертификат', workplace: 'Рабочее место', delivery: 'Доставка домой', promocode: 'Промокод' }

export default function RewardsAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('create') // create | history
  const [editingId, setEditingId] = useState(null)
  const [success, setSuccess] = useState({ show: false, message: '' })
  const [deleteModal, setDeleteModal] = useState({ show: false, reward: null })
  const [form, setForm] = useState({
    name: '', description: '', cost: '', type: 'digital',
    requires_approval: false, limit_per_user: '', image_file: null, preview_url: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles').select('company_id, role_id, is_company_admin, deleted_at')
        .eq('user_id', user.id).maybeSingle()
      if (!prof || prof.deleted_at || !(prof.is_company_admin || prof.role_id === 1)) { router.push('/'); return }
      setProfile(prof)
      await loadRewards(prof)
      setLoading(false)
    }
    init()
  }, [router])

  const loadRewards = async (prof) => {
    const { data } = await supabase.from('rewards').select('*').eq('company_id', prof.company_id).order('created_at', { ascending: false })
    setRewards(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const costValue = parseInt(form.cost, 10)
    if (!form.name || isNaN(costValue) || costValue < 0) {
      setSuccess({ show: true, message: 'Введите название и корректную стоимость' }); return
    }
    let imageUrl = form.preview_url || null
    if (form.image_file) {
      const fileExt = form.image_file.name.split('.').pop()
      const fileName = `reward-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, form.image_file)
      if (error) { setSuccess({ show: true, message: 'Ошибка загрузки изображения' }); return }
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
      imageUrl = publicUrl.publicUrl
    }
    const rewardData = {
      name: form.name, description: form.description, cost: costValue, type: form.type,
      requires_approval: form.requires_approval,
      limit_per_user: form.limit_per_user ? parseInt(form.limit_per_user) : null,
      image_url: imageUrl, company_id: profile.company_id
    }
    const { error } = editingId
      ? await supabase.from('rewards').update(rewardData).eq('id', editingId)
      : await supabase.from('rewards').insert(rewardData)
    if (error) { setSuccess({ show: true, message: 'Ошибка сохранения товара' }); return }

    setSuccess({ show: true, message: editingId ? 'Товар обновлён' : 'Товар создан' })
    setForm({ name: '', description: '', cost: '', type: 'digital', requires_approval: false, limit_per_user: '', image_file: null, preview_url: '' })
    setEditingId(null)
    loadRewards(profile)
  }

  const handleEdit = (reward) => {
    setEditingId(reward.id); setTab('create')
    setForm({
      name: reward.name, description: reward.description || '', cost: reward.cost.toString(),
      type: reward.type || 'digital', requires_approval: reward.requires_approval || false,
      limit_per_user: reward.limit_per_user ? reward.limit_per_user.toString() : '',
      image_file: null, preview_url: reward.image_url || ''
    })
  }

  const handleDelete = async () => {
    const { reward } = deleteModal
    if (!reward) return
    const { error } = await supabase.from('rewards').delete().eq('id', reward.id)
    if (!error) { setSuccess({ show: true, message: 'Товар удалён' }); loadRewards(profile) }
    else setSuccess({ show: true, message: 'Ошибка удаления товара' })
    setDeleteModal({ show: false, reward: null })
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner size={52} /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/company-admin" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Управление товарами</h1>
      </div>

      {/* Переключатель创建 / история */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => { setTab('create'); }} className={`filter-pill ${tab === 'create' ? 'active' : ''}`}>
          {editingId ? 'Редактировать товар' : 'Новый товар'}
        </button>
        <button onClick={() => setTab('history')} className={`filter-pill ${tab === 'history' ? 'active' : ''}`}>
          История товаров
        </button>
      </div>

      {tab === 'history' ? (
        <div className="space-y-3">
          {rewards.length === 0 && <div className="premium-card"><p className="text-gray-400">Товаров пока нет</p></div>}
          {rewards.map(reward => (
            <div key={reward.id} className="premium-card flex items-center gap-4">
              {reward.image_url
                ? <img src={reward.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-14 h-14 rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }} />}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{reward.name}</div>
                <div className="text-xs text-gray-400 truncate">{reward.description}</div>
                <div className="text-xs mt-0.5" style={{ color: '#FFD700' }}>
                  {reward.cost} кармиков · {TYPE_LABELS[reward.type] || 'Товар'}
                  {reward.requires_approval ? ' · Требуется согласование' : ''}
                  {reward.limit_per_user ? ` · Лимит: ${reward.limit_per_user}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleEdit(reward)} className="btn-glass text-xs px-4 py-2">Редактировать</button>
                <button onClick={() => setDeleteModal({ show: true, reward })} className="btn-glass btn-glass-red text-xs px-4 py-2">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="premium-card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Название</label>
            <input type="text" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Стоимость (кармики)</label>
            <input type="number" className="input-field" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} min="0" step="1" placeholder="Например, 100" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Тип</label>
            <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="digital">Цифровой (сертификат)</option>
              <option value="workplace">Рабочее место</option>
              <option value="delivery">Доставка домой</option>
              <option value="promocode">Промокод</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Описание</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.requires_approval} onChange={e => setForm({ ...form, requires_approval: e.target.checked })} />
              Требуется согласование
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Лимит на сотрудника</label>
            <input type="number" className="input-field" value={form.limit_per_user} onChange={e => setForm({ ...form, limit_per_user: e.target.value })} min="1" step="1" placeholder="Без ограничений" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Изображение</label>
            <div className="flex items-center gap-3 mt-1">
              <label className="btn-glass cursor-pointer inline-block text-sm">
                {form.image_file ? form.image_file.name : form.preview_url ? 'Заменить изображение' : 'Выбрать файл'}
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files[0]
                  if (file) setForm({ ...form, image_file: file, preview_url: URL.createObjectURL(file) })
                }} />
              </label>
              {form.preview_url && <img src={form.preview_url} alt="" className="w-14 h-14 rounded-xl object-cover" />}
            </div>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-glass w-full">{editingId ? 'Сохранить изменения' : 'Создать товар'}</button>
          </div>
        </form>
      )}

      {/* Модалка подтверждения удаления */}
      {deleteModal.show && deleteModal.reward && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, reward: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 className="text-xl font-bold text-white mb-3">Удалить товар?</h3>
            <p className="text-gray-400 mb-6">Вы действительно хотите удалить «{deleteModal.reward.name}»?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ show: false, reward: null })} className="btn-glass flex-1">Отмена</button>
              <button onClick={handleDelete} className="btn-glass btn-glass-red flex-1">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Красивая анимация успеха вместо слова "Информация" */}
      <SuccessBurst show={success.show} message={success.message} onClose={() => setSuccess({ show: false, message: '' })} />
    </div>
  )
}
