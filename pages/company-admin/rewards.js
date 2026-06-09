import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'

export default function RewardsAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    description: '',
    cost: '',
    type: 'physical',
    requires_approval: false,
    limit_per_user: '',
    image_file: null,
    preview_url: ''
  })
  const [editingId, setEditingId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '' })
  const [deleteModal, setDeleteModal] = useState({ show: false, rewardId: null, rewardName: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('company_id, role_id').eq('user_id', user.id).single()
      if (!prof || (prof.role_id !== 1 && prof.role_id !== 2)) { router.push('/'); return }
      setProfile(prof)
      await loadRewards()
      setLoading(false)
    }
    init()
  }, [])

  const loadRewards = async () => {
    const { data } = await supabase.from('rewards').select('*').order('created_at', { ascending: false })
    setRewards(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const costValue = parseInt(form.cost, 10)
    if (!form.name || isNaN(costValue) || costValue < 0) {
      setNotification({ show: true, message: 'Введите название и корректную стоимость' })
      return
    }

    let imageUrl = form.preview_url || null
    if (form.image_file) {
      const fileExt = form.image_file.name.split('.').pop()
      const fileName = `reward-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, form.image_file)
      if (error) {
        setNotification({ show: true, message: 'Ошибка загрузки изображения' })
        return
      }
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
      imageUrl = publicUrl.publicUrl
    }

    const rewardData = {
      name: form.name,
      description: form.description,
      cost: costValue,
      type: form.type,
      requires_approval: form.requires_approval,
      limit_per_user: form.limit_per_user ? parseInt(form.limit_per_user) : null,
      image_url: imageUrl
    }

    const { error } = editingId
      ? await supabase.from('rewards').update(rewardData).eq('id', editingId)
      : await supabase.from('rewards').insert(rewardData)

    if (error) {
      setNotification({ show: true, message: 'Ошибка сохранения товара: ' + error.message })
      return
    }

    setNotification({ show: true, message: editingId ? 'Товар обновлён' : 'Товар создан!' })

    setForm({ name: '', description: '', cost: '', type: 'physical', requires_approval: false, limit_per_user: '', image_file: null, preview_url: '' })
    setEditingId(null)
    loadRewards()
  }

  const handleEdit = (reward) => {
    setEditingId(reward.id)
    setShowHistory(false)
    setForm({
      name: reward.name,
      description: reward.description || '',
      cost: reward.cost.toString(),
      type: reward.type || 'physical',
      requires_approval: reward.requires_approval || false,
      limit_per_user: reward.limit_per_user ? reward.limit_per_user.toString() : '',
      image_file: null,
      preview_url: reward.image_url || ''
    })
  }

  const confirmDelete = (reward) => {
    setDeleteModal({ show: true, rewardId: reward.id, rewardName: reward.name })
  }

  const handleDelete = async () => {
    const { rewardId } = deleteModal
    if (!rewardId) return

    const { error } = await supabase.from('rewards').delete().eq('id', rewardId)
    if (error) {
      setNotification({ show: true, message: 'Ошибка удаления: ' + error.message })
    } else {
      setNotification({ show: true, message: 'Товар удалён' })
      loadRewards()
    }
    setDeleteModal({ show: false, rewardId: null, rewardName: '' })
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  // ... остальная часть (возврат jsx) остаётся той же, что и в предыдущем полном коде rewards.js,
  //     только кнопка удаления теперь вызывает confirmDelete, а не встроенный confirm.
  //     Приведу только ключевую часть для краткости — при вставке надо заменить весь файл.
  //     (В реальном ответе я дам полный код страницы.)
