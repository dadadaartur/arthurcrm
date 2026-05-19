import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Transfer() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setBalance(data.balance) })
    })
  }, [])

  async function handleTransfer(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const transferAmount = parseInt(amount)
    if (!recipientEmail || !transferAmount || transferAmount <= 0) {
      setError('Заполните все поля')
      return
    }
    if (transferAmount > balance) {
      setError('Недостаточно кармиков на балансе')
      return
    }

    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      setError('Ошибка поиска пользователя')
      return
    }
    const recipient = users.find(u => u.email === recipientEmail)
    if (!recipient) {
      setError('Получатель не найден')
      return
    }

    const { error: transferError } = await supabase.from('transfers').insert({
      from_user_id: user.id,
      to_user_id: recipient.id,
      amount: transferAmount,
      description: comment || 'Перевод кармиков'
    })

    if (transferError) {
      setError(transferError.message)
      return
    }

    await supabase.from('karma_balance').upsert({
      user_id: user.id,
      balance: balance - transferAmount
    }, { onConflict: 'user_id' })

    const { data: recipientBalance } = await supabase.from('karma_balance')
      .select('balance').eq('user_id', recipient.id).single()
    const newRecipientBalance = (recipientBalance?.balance || 0) + transferAmount
    await supabase.from('karma_balance').upsert({
      user_id: recipient.id,
      balance: newRecipientBalance
    }, { onConflict: 'user_id' })

    await supabase.from('karma_transactions').insert([
      { user_id: user.id, amount: -transferAmount, description: `Перевод пользователю ${recipientEmail}` },
      { user_id: recipient.id, amount: transferAmount, description: `Перевод от ${user.email}` }
    ])

    setBalance(balance - transferAmount)
    setRecipientEmail('')
    setAmount('')
    setComment('')
    setShowModal(true)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="premium-card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Перевод кармиков</h2>
        <div className="text-sm text-gray-500 mb-4">Ваш баланс: <span className="text-gold font-semibold">{balance}</span> кармиков</div>
        <form onSubmit={handleTransfer} className="space-y-4">
          <input type="email" placeholder="Email получателя" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="input-field" required />
          <input type="number" placeholder="Сумма" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" min="1" required />
          <input type="text" placeholder="Комментарий" value={comment} onChange={e => setComment(e.target.value)} className="input-field" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full">Отправить</button>
        </form>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Перевод выполнен!</h3>
            <p className="text-gray-600">Операция записана в историю.</p>
            <button onClick={() => setShowModal(false)} className="btn-gold mt-6">Ок</button>
          </div>
        </div>
      )}
    </div>
  )
}
