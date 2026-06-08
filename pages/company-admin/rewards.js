import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'

export default function RewardsAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    description: '',
    cost: 0,
    type: 'physical',
    requires_approval: false,
    image_file: null,
    preview_url: ''
  })
  const [editingId, setEditingId] = useState(null)

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
    if (!form.name || !form.cost) return

    let imageUrl = form.preview_url || null
    if (form.image_file) {
      const fileExt = form.image_file.name.split('.').pop()
      const fileName = `reward-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, form.image_file)
      if (error) {
        alert('Ошибка загрузки изображения')
        return
      }
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
      imageUrl = publicUrl.publicUrl
    }

    const rewardData = {
      name: form.name,
      description: form.description,
      cost: form.cost,
      type: form.type,
      requires_approval: form.requires_approval,
      image_url: imageUrl
    }

    if (editingId) {
      const { error } = await supabase.from('rewards').update(rewardData).eq('id', editingId)
      if (error) return alert('Ошибка обновления')
    } else {
      const { error } = await supabase.from('rewards').insert(rewardData)
      if (error) return alert('Ошибка создания: ' + error.message)
    }

    // Сброс формы
    setForm({ name: '', description: '', cost: 0, type: 'physical', requires_approval: false, image_file: null, preview_url: '' })
    setEditingId(null)
    loadRewards()
  }

  const handleEdit = (reward) => {
    setEditingId(reward.id)
    setForm({
      name: reward.name,
      description: reward.description || '',
      cost: reward.cost,
      type: reward.type || 'physical',
      requires_approval: reward.requires_approval || false,
      image_file: null,
      preview_url: reward.image_url || ''
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить товар?')) return
    await supabase.from('rewards').delete().eq('id', id)
    loadRewards()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const size = Math.random() * 2 + 0.5
          const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
          const color = colors[Math.floor(Math.random() * colors.length)]
          return (
            <div key={i} style={{
              position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
              width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 10 + 's'
            }} />
          )
        })}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 32, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Управление товарами</h1>

        {/* Форма создания/редактирования */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(20,25,45,0.9)', backdropFilter: 'blur(10px)',
          borderRadius: 16, padding: 24, marginBottom: 32,
          border: '1px solid rgba(255,255,255,0.1)', display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr'
        }}>
          <div>
            <label style={{ fontSize: 14, color: '#aaa' }}>Название</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, background: '#111', border: '1px solid #333', color: '#fff' }} required />
          </div>
          <div>
            <label style={{ fontSize: 14, color: '#aaa' }}>Стоимость (кармики)</label>
            <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: 10, borderRadius: 8, background: '#111', border: '1px solid #333', color: '#fff' }} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 14, color: '#aaa' }}>Описание</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, background: '#111', border: '1px solid #333', color: '#fff' }} rows={3} />
          </div>
          <div>
            <label style={{ fontSize: 14, color: '#aaa' }}>Тип</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, background: '#111', border: '1px solid #333', color: '#fff' }}>
              <option value="physical">Физический</option>
              <option value="digital">Цифровой (сертификат)</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#aaa' }}>
              <input type="checkbox" checked={form.requires_approval} onChange={e => setForm({ ...form, requires_approval: e.target.checked })} />
              Требуется согласование
            </label>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 14, color: '#aaa', display: 'block', marginBottom: 8 }}>Изображение</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px dashed rgba(255,255,255,0.3)',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 14,
                color: '#ccc'
              }}>
                {form.image_file ? form.image_file.name : form.preview_url ? 'Заменить изображение' : 'Выбрать файл'}
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    setForm({ ...form, image_file: file, preview_url: URL.createObjectURL(file) });
                  }
                }} style={{ display: 'none' }} />
              </label>
              {form.preview_url && (
                <img src={form.preview_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              )}
            </div>
          </div>
          <button type="submit" style={{
            gridColumn: 'span 2',
            background: 'linear-gradient(135deg, #f97316, #e65c00)',
            border: 'none', color: '#fff', padding: '12px 24px', borderRadius: 10, cursor: 'pointer', fontSize: 16,
            fontWeight: 500
          }}>
            {editingId ? 'Сохранить изменения' : 'Создать товар'}
          </button>
        </form>

        {/* Список товаров */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rewards.length === 0 && <p style={{ color: '#aaa' }}>Товаров пока нет</p>}
          {rewards.map(reward => (
            <div key={reward.id} style={{
              background: 'rgba(20,25,45,0.9)', backdropFilter: 'blur(10px)',
              borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {reward.image_url && <img src={reward.image_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{reward.name}</div>
                <div style={{ fontSize: 13, color: '#aaa' }}>{reward.description?.slice(0, 80)}</div>
                <div style={{ fontSize: 13, color: '#FFD700' }}>{reward.cost} кармиков · {reward.type === 'digital' ? 'Цифровой' : 'Физический'} {reward.requires_approval && '· Требуется согласование'}</div>
              </div>
              <button onClick={() => handleEdit(reward)} style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.2s'
              }}>Редактировать</button>
              <button onClick={() => handleDelete(reward.id)} style={{
                background: 'rgba(255,0,0,0.1)',
                border: '1px solid rgba(255,0,0,0.4)',
                color: '#f44',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14
              }}>Удалить</button>
            </div>
          ))}
        </div>
      </div>
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
