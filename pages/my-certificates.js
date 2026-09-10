import { useEffect, useState } from 'react'
import BackArrow from '../components/BackArrow'
import LoadingScreen from '../components/LoadingScreen'
import Certificate from '../components/Certificate'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'

export default function MyCertificates() {
  const { profile } = useProfile()
  const [loading, setLoading] = useState(true)
  const [certs, setCerts] = useState([])
  const [openCert, setOpenCert] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/my-certificates', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setCerts((await r.json()).certificates || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />
  const myName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.display_name || 'Сотрудник'

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <BackArrow href="/goals" title="Мои грамоты" />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 640 }}>
          Признание за реальные победы — начисляется само, по факту события, не по чьему-то решению.
        </p>

        {certs.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Пока нет ни одной грамоты — первая появится сама, как только придёт победа</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {certs.map(c => (
              <div key={c.id} onClick={() => setOpenCert(c)} style={{ cursor: 'pointer' }}>
                <Certificate name={myName} title={c.title} subtitle={c.subtitle} date={new Date(c.awarded_at).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })} />
              </div>
            ))}
          </div>
        )}

        {openCert && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setOpenCert(null)}>
            <div style={{ width: 'min(560px, 94vw)' }} onClick={e => e.stopPropagation()}>
              <Certificate name={myName} title={openCert.title} subtitle={openCert.subtitle} date={new Date(openCert.awarded_at).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <button onClick={() => setOpenCert(null)} className="btn-outline" style={{ marginTop: 16, width: '100%' }}>Закрыть</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
