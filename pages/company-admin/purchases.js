import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import PremiumModal from '../../components/PremiumModal'

export default function PurchasesAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [modal, setModal] = useState({ show: false, purchase: null })
  const [comment, setComment] = useState('')
  const [dateOption, setDateOption] = useState('any')
  const [specificDate, setSpecificDate] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('company_id, role_id').eq('user_id', user.id).single()
      if (!prof || (prof.role_id !== 1 && prof.role_id !== 2)) { router.push('/'); return }
      setProfile(prof)
      loadPurchases(prof.company_id)
    }
    init()
  }, [])

  const loadPurchases = async (companyId) => {
    const { data: employees } = await supabase.from('profiles').select('user_id').eq('company_id', companyId)
    if (!employees?.length) return setPurchases([])
    const userIds = employees.map(e => e.user_id)
    const { data } = await supabase.from('purchases').select('*').in('user_id', userIds).eq('status', 'pending').order('created_at', { ascending: false })
    setPurchases(data || [])
  }

  const handleApprove = async () => {
    const { purchase } = modal
    if (!purchase) return
    const updateData = {
      status: 'approved',
      approved_comment: comment,
      certificate_data: {
        valid_date: dateOption === 'any' ? 'any' : specificDate,
        comment: comment
      }
    }
    const { error } = await supabase.from('purchases').update(updateData).eq('id', purchase.id)
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: purchase.user_id,
        message: `Ваша покупка "${purchase.reward_name}" одобрена! Подробности в разделе "Мои покупки".`,
        link: '/my-purchases'
      })
      setModal({ show: false })
      loadPurchases(profile.company_id)
    }
  }

  const handleReject = async () => {
    const { purchase } = modal
    if (!purchase) return
    await supabase.from('purchases').update({ status: 'rejected', approved_comment: comment }).eq('id', purchase.id)
    await supabase.from('notifications').insert({
      user_id: purchase.user_id,
      message: `Ваша покупка "${purchase.reward_name}" отклонена. Причина: ${comment || 'не указана'}.`,
      link: '/my-purchases'
    })
    setModal({ show: false })
    loadPurchases(profile.company_id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const size = Math.random() * 2 + 0.5
          const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
          const color
