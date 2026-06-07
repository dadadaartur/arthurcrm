import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import PremiumModal from '../components/PremiumModal'

export default function Transfer() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const { data } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (data) setBalance(data.balance)
    }
    init()
  }, [])

  const handleTransfer = async (e) => {
    e.preventDefault()
    setError('')
    const transferAmount = parseInt(amount)
    if (!recipientEmail || !transferAmount || transferAmount <= 0) {
      setError('Заполните все поля')
      return
    }
    if (transferAmount > balance) {
      setError('Недостаточно кармиков')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail, amount: transferAmount, comment }),
        credentials: 'include'  // ← важно для передачи кук
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Ошибка перевода')
      } else {
        setBalance(result.newBalance)
        setRecipientEmail('')
        setAmount('')
        setComment('')
        setShowModal(true)
      }
    } catch (err) {
      setError('Сетевая ошибка')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="premium-card">
        <h2 className="text-2xl font-bold text-white mb-6">Перевод кармиков</h2>
        <div className="text-sm text-gray-300 mb-4">
          Ваш баланс: <span className="text-gold font-semibold">{balance}</span> кармиков
        </div>
        <form onSubmit={handleTransfer} className="space-y-4">
          <input
            type="email"
            placeholder="Email получателя"
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="number"
            placeholder="Сумма"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input-field"
            min="1"
            required
          />
          <input
            type="text"
            placeholder="Комментарий"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="input-field"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={loading}>
            {loading ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>
      <PremiumModal isOpen={showModal} onClose={() => setShowModal(false)} title="Перевод выполнен!">
        <p className="text-white">Операция записана в историю.</p>
      </PremiumModal>
    </div>
  )
}
