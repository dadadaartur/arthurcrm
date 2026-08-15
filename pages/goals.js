import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

export default function MyGoals() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [goals, setGoals] = useState([])
  const [mastery, setMastery] = useState(null)
  const [masteryInfo, setMasteryInfo] = useState(null)
  const [nextLevelInfo, setNextLevelInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('company_id, deleted_at').eq('user_id', user.id).maybeSingle()
      if (!profile?.company_id || profile.deleted_at) { router.push('/welcome'); return }
      setUser(user)
      await Promise.all([loadGoals(user.id), loadMastery(user.id)])
      setLoading(false)
    }
    init()
  }, [])

  const loadGoals = async (userId) => {
    const { data } = await supabase.from('goal_assignments')
      .select('goal_id, goals(*, goal_indicators(*))')
      .eq('user_id', userId)
    const active = (data || []).map(ga => ga.goals).filter(g => g && (g.status === 'active' || g.status === 'draft'))
    setGoals(active)
  }

  const loadMastery = async (userId) => {
    const { data: m } = await supabase.from('employee_mastery').select('*').eq('user_id', userId).maybeSingle()
    const total = m?.mastery_total || 0
    const level = m?.current_level || 1
    setMastery({ total, level })
    const { data: cur } = await supabase.from('mastery_levels').select('*').eq('level', level).single()
    const { data: next } = await supabase.from('mastery_levels').select('*').eq('level', level + 1).maybeSingle()
    setMasteryInfo(cur)
    setNextLevelInfo(next)
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner size={52} /></div>

  const progressToNext = mastery && nextLevelInfo && masteryInfo
    ? Math.min(100, Math.round(((mastery.total - masteryInfo.mastery_required) / (nextLevelInfo.mastery_required - masteryInfo.mastery_required)) * 100))
    : 100

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Мои цели</h1>
      </div>

      {/* Уровень мастерства */}
      <div className="premium-card mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Уровень мастерства</p>
            <p className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {masteryInfo?.title || 'Новичок I'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Баллы мастерства</p>
            <p className="text-xl font-semibold text-white">{mastery?.total || 0}</p>
          </div>
        </div>
        {nextLevelInfo && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>До уровня «{nextLevelInfo.title}»</span>
              <span>{progressToNext}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: progressToNext + '%', background: 'linear-gradient(90deg, #FFD700, #FFA500)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Цели */}
      {goals.length === 0 && <div className="premium-card"><p className="text-gray-400">Активных целей пока нет.</p></div>}
      <div className="space-y-4">
        {goals.map(goal => (
          <div key={goal.id} className="premium-card">
            <h3 className="text-white font-semibold">{goal.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{goal.description}</p>
            {(goal.goal_indicators || []).length > 0 && (
              <div className="mt-3 space-y-2">
                {goal.goal_indicators.map(ind => {
                  const target = ind.target_max ?? ind.target_min
                  const actual = ind.actual || 0
                  const pct = target ? Math.min(100, Math.round((actual / target) * 100)) : 0
                  return (
                    <div key={ind.id}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{ind.name} {ind.unit && `(${ind.unit})`}</span>
                        <span>{actual} / {target ?? '—'}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: pct + '%', background: 'linear-gradient(90deg, #c084fc, #f97316)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
