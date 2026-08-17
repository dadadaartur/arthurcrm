import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

const PERIOD_LABELS = { day: 'в день', week: 'в неделю', month: 'в месяц', custom: '' }
const TYPE_LABELS = {
  calls: 'Звонки', emails: 'Письма', deals: 'Сделки',
  comments: 'Комментарии', chats: 'Чаты'
}

function GoalProgressBar({ current = 0, target = 1 }) {
  const pct = Math.min(100, Math.round((current / target) * 100))
  const color = pct >= 100 ? '#4ade80' : pct >= 60 ? '#FFD700' : '#f97316'
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Прогресс</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}88` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Текущее: {current}</span>
        <span>Цель: {target}</span>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, deleted_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!profile?.company_id || profile.deleted_at) { router.push('/welcome'); return }

      setUser(user)

      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      setGoals(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const getTypeLabel = (g) => {
    if (g.title && g.title !== g.goal_type) return g.title
    return TYPE_LABELS[g.goal_type] || g.goal_type
  }

  const getDeadlineLabel = (g) => {
    if (!g.deadline) {
      const p = PERIOD_LABELS[g.period]
      return p ? `Повторяется ${p}` : 'Без срока'
    }
    const d = new Date(g.deadline)
    const now = new Date()
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'Срок истёк'
    if (diffDays === 0) return 'Сегодня последний день'
    return `Осталось ${diffDays} дн.`
  }

  const getStatus = (g) => {
    const current = g.current_value ?? 0
    const pct = target(g) > 0 ? (current / target(g)) * 100 : 0
    if (pct >= 100) return { label: 'Выполнено', color: '#4ade80' }
    if (pct >= 60) return { label: 'В процессе', color: '#FFD700' }
    return { label: 'Нужны усилия', color: '#f97316' }
  }

  const target = (g) => g.target_value || 1

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2"
        style={{ background: 'linear-gradient(135deg, #f97316, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Мои цели
      </h1>
      <p className="text-gray-400 text-sm mb-8">Цели, поставленные вашим руководителем</p>

      {goals.length === 0 ? (
        <div className="premium-card text-center py-12">
          <div className="text-4xl mb-4" style={{ filter: 'grayscale(1)', opacity: 0.4 }}>🎯</div>
          <p className="text-gray-400">Руководитель пока не поставил вам целей</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(g => {
            const status = getStatus(g)
            const current = g.current_value ?? 0
            return (
              <div key={g.id} className="premium-card"
                style={{ borderColor: `${status.color}33` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white text-lg">{getTypeLabel(g)}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${status.color}22`, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 flex flex-wrap gap-4">
                      <span>Цель: <b className="text-white">{g.target_value}</b>
                        {g.period && g.period !== 'custom' ? ` ${PERIOD_LABELS[g.period] || ''}` : ''}
                      </span>
                      <span style={{ color: status.color }}>{getDeadlineLabel(g)}</span>
                    </div>

                    <GoalProgressBar current={current} target={target(g)} />

                    {(g.reward_karma > 0 || g.reward_rubles > 0) && (
                      <div className="flex gap-3 mt-3">
                        {g.reward_karma > 0 && (
                          <span className="text-xs px-3 py-1 rounded-full"
                            style={{ background: 'rgba(255,215,0,0.12)', color: '#FFD700' }}>
                            +{g.reward_karma} кармиков за выполнение
                          </span>
                        )}
                        {g.reward_rubles > 0 && (
                          <span className="text-xs px-3 py-1 rounded-full"
                            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                            +{g.reward_rubles}₽ за выполнение
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 premium-card text-center"
        style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
        <p className="text-gray-500 text-sm">Текущее значение показателей обновляется вашим руководителем.</p>
        <p className="text-gray-500 text-sm mt-1">Если данные неверны — обратитесь к администратору компании.</p>
      </div>
    </div>
  )
}
