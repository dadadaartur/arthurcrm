/* BLUE TEST */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

export default function TestPlanetPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      setLoading(false)
    }
    init()
  }, [])

  const karmikWord = getKarmikWord(balance)

  if (loading) return <div style={{ color: 'white', textAlign: 'center', paddingTop: 100 }}>Загрузка...</div>

  return (
    <>
      <Head>
        <title>Тест синего баланса</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', fontFamily: 'Inter' }}>
        {/* Блок баланса с синим фоном */}
        <div style={{
          position: 'absolute', left: '4%', top: '4%',
          background: 'blue',   // <-- СИНИЙ ФОН ДЛЯ ТЕСТА
          border: '1px solid white',
          borderRadius: 24,
          padding: 20,
          color: 'white',
          width: 300,
          zIndex: 20
        }}>
          <h3>Баланс</h3>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{balance}</div>
          <div>{karmikWord}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button style={{ flex: 1 }}>Перевести</button>
            <button style={{ flex: 2 }}>Магазин</button>
            <button style={{ flex: 1 }}>Операции</button>
            <button style={{ flex: 1 }}>Мои покупки</button>
          </div>
        </div>

        {/* Летающие кнопки (упрощённые) */}
        <div style={{ position: 'absolute', left: '60%', top: '30%', color: 'white' }}>
          <p>Летающие кнопки здесь</p>
        </div>
      </div>
    </>
  )
}
