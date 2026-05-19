import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Transfer() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      description: description || 'Перевод кармиков'
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

    setSuccess(`Перевод ${transferAmount} кармиков выполнен`)
    setRecipientEmail('')
    setAmount('')
    setDescription('')
    setBalance(balance - transferAmount)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-6">Перевод кармиков</h1>
        <p className="text-gold text-xl mb-4">Ваш баланс: {balance} кармиков</p>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email получателя</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-field"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание (необязательно)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-field"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button type="submit" className="btn-gold w-full">Отправить</button>
        </form>
      </div>
    </div>
  )
}
