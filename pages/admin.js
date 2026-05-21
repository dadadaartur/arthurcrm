import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

// ... (COLORS остаются те же)

export default function Admin() {
  const [user, setUser] = useState(null)
  const [stickers, setStickers] = useState([])
  const [content, setContent] = useState('')
  const [color, setColor] = useState('blue')
  const [filter, setFilter] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  // Сотрудники (суперадмин видит всех)
  const [profiles, setProfiles] = useState([])
  // ... (остальные стейты для приглашений, если оставим)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)

      // Проверяем, что пользователь — суперадмин
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles(name, is_system)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.roles?.is_system) {
        window.location.href = '/'
        return
      }

      await fetchStickers()
      await fetchAllProfiles()
      await fetchAllRoles()
    }
    checkAccess()
  }, [])

  // ... (все остальные функции остаются, как в последней версии)
