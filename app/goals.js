import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import DatePicker from '../../components/DatePicker'
import { supabase } from '../../lib/supabaseClient'
import { useProfile } from '../../context/ProfileContext'
import { BAND_COLORS, BAND_LABELS, bandFor } from '../../lib/kpi'
import { PERIOD_LABELS } from '../../components/PeriodHint'

export default function AppGoals() {
  const { user } = useProfile()
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [openMetric, setOpenMetric] = useState(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/kpi/my', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) { const d = await r.json(); setMetrics(d.metrics || []) }
      setLoading(false)
    }
    load()
  }, [user])

  // Фильтр по датам считается прямо по уже загруженной истории (API
  // отдаёт до 400 последних записей на показатель) — отдельный запрос на
  // каждое изменение диапазона не нужен, диапазон обычно укладывается в
  // уже полученные данные.
  const inRange = (d) => (!from || d >= from) && (!to || d <= to)

  return (
    <AppShell title="Цели" active="goals">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1 }}><DatePicker value={from} onChange={setFrom} placeholder="С даты" /></div>
        <span style={{ color: '#666' }}>—</span>
        <div style={{ flex: 1 }}><DatePicker value={to} onChange={setTo} placeholder="По дату" /></div>
      </div>

      {loading ? (
        <p style={{ color: '#777', fontSize: 13 }}>Загрузка...</p>
      ) : metrics.length === 0 ? (
        <p style={{ color: '#777', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Показателей пока нет</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metrics.map(m => {
            const daysInRange = (m.history || []).filter(h => inRange(h.entry_date))
            const achievedDays = daysInRange.filter(h => bandFor(Number(h.value), m) !== 'none')
            const pct = daysInRange.length ? Math.round(achievedDays.length / daysInRange.length * 100) : null
            return (
              <div key={m.id} onClick={() => setOpenMetric(m)} style={{ borderRadius: 16, padding: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BAND_COLORS[m.band]}33`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: BAND_COLORS[m.band], flexShrink: 0 }}>{BAND_LABELS[m.band]}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  Сейчас: {m.current != null ? `${m.current}${m.unit}` : 'нет данных'}
                </div>
                {daysInRange.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginBottom: 4 }}>
                      <span>Достигнуто {achievedDays.length} из {daysInRange.length} дн.</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 70 ? '#4ade80' : pct >= 40 ? '#FFD700' : '#f87171' }} />
                    </div>
                  </div>
                ) : (from || to) ? (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Нет данных за выбранный период</div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {openMetric && (
        <div onClick={() => setOpenMetric(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '22px 22px 0 0', padding: 22, background: '#151a2e', border: '1px solid rgba(255,215,0,0.25)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{openMetric.name}</div>
            <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#aaa' }}>{PERIOD_LABELS[openMetric.period || 'daily']}</span>
            {openMetric.description && <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, margin: '14px 0 0' }}>{openMetric.description}</p>}
            {openMetric.advice && <p style={{ fontSize: 12, color: '#a0e9ff', lineHeight: 1.5, margin: '10px 0 0', padding: 12, borderRadius: 10, background: 'rgba(160,233,255,0.06)' }}>{openMetric.advice}</p>}
            {openMetric.reward_description && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}>
                {openMetric.reward_image_url && <img src={openMetric.reward_image_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />}
                <div>
                  <div style={{ fontSize: 9, color: '#FFD700', textTransform: 'uppercase' }}>Приз за максимум</div>
                  <div style={{ fontSize: 12, color: '#ddd' }}>{openMetric.reward_description}</div>
                </div>
              </div>
            )}
            <button onClick={() => setOpenMetric(null)} style={{ width: '100%', marginTop: 18, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', fontSize: 13 }}>Закрыть</button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
