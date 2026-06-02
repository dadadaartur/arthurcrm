import { useEffect, useState } from 'react'
import { supabase, getAccessToken } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'

function getKarmikWord(n) { /* ... оставь без изменений */ }
function formatTimeLeft(deadline) { /* ... */ }

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    const token = await getAccessToken()
    if (!token) return
    const res = await fetch('/api/tasks/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(data)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const { data: balanceData } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (balanceData) setBalance(balanceData.balance)
      await fetchTasks()
      setLoading(false)
    }
    init()
  }, [])

  const handleStart = async (assignmentId) => {
    const token = await getAccessToken()
    await fetch('/api/tasks/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ assignmentId })
    })
    fetchTasks()
  }

  const handleComplete = async (assignmentId) => {
    const token = await getAccessToken()
    await fetch('/api/tasks/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ assignmentId })
    })
    fetchTasks()
    const { data: balanceData } = await supabase
      .from('karma_balance')
      .select('balance')
      .eq('user_id', user.id)
      .single()
    if (balanceData) setBalance(balanceData.balance)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const karmikWord = getKarmikWord(balance)
  // ... остальной JSX твоей вёрстки без изменений (баланс слева, задания справа, сообщение если пусто)
  // Скопируй JSX из предыдущего рабочего варианта, где дизайн был верным
}
