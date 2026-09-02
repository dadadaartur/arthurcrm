import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BackArrow from '../components/BackArrow'
import LoadingScreen from '../components/LoadingScreen'

export default function MyTasksAnalytics() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/tasks/analytics', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setData(await r.json())
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />
  if (!data) return null

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <BackArrow href="/tasks" title="Моя аналитика по заданиям" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Заработано всего</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-gold)' }}>+{data.earnedKarma}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>за {data.completedCount} {data.completedCount === 1 ? 'задание' : 'заданий'}</div>
          </div>
          {data.lostKarma > 0 && (
            <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18, border: '1px solid rgba(220,38,38,0.25)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Упущено</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>−{data.lostKarma}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{data.lostCount} не выполнено/отклонено</div>
            </div>
          )}
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Текущий баланс</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{data.currentBalance}</div>
          </div>
        </div>

        {data.missedReward && (
          <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            На упущенные <b style={{ color: '#dc2626' }}>{data.lostKarma}</b> кармиков можно было купить «<b style={{ color: 'var(--text-primary)' }}>{data.missedReward.name}</b>» ({data.missedReward.cost} карм.) — обидно упускать то, что уже почти было в кармане.
          </div>
        )}

        {/* Прогноз — центральный, самый мотивирующий блок */}
        <div style={{ background: 'linear-gradient(135deg, rgba(184,134,11,0.07), rgba(124,58,237,0.05))', border: '1px solid var(--border-gold)', borderRadius: 20, padding: 26, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Прогноз на неделю</div>
          {data.forecast.thisWeekPotential > 0 ? (
            <>
              <p style={{ fontSize: 15, color: 'var(--text-primary)', margin: '0 0 14px', lineHeight: 1.6 }}>
                Если выполнить все текущие задания с дедлайном на этой неделе — заработаете ещё <b style={{ color: 'var(--accent-gold)' }}>+{data.forecast.thisWeekPotential}</b> кармиков, баланс станет <b style={{ color: 'var(--text-primary)' }}>{data.forecast.forecastBalance}</b>.
              </p>
              {data.forecast.bestForecast && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
                  {data.forecast.bestForecast.image_url && <img src={data.forecast.bestForecast.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>С этим балансом станет доступно:</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{data.forecast.bestForecast.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent-gold)', fontWeight: 600 }}>{data.forecast.bestForecast.cost} кармиков</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>На эту неделю активных заданий с дедлайном нет — загляните в «Мои задания», возможно, руководитель уже что-то назначил без срока.</p>
          )}
        </div>

        {data.bestNow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', marginBottom: 20 }}>
            {data.bestNow.image_url && <img src={data.bestNow.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Уже сейчас доступно в магазине:</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{data.bestNow.name} · {data.bestNow.cost} карм.</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries({ regular: 'Обычные', auto_goal: 'По целям', partner: 'От партнёров' }).map(([ty, label]) => data.byType[ty] > 0 && (
            <div key={ty} style={{ flex: '1 1 160px', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>+{data.byType[ty]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
