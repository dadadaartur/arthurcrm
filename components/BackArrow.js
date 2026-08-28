import Link from 'next/link'
export default function BackArrow({ href, title, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
      <Link href={href} className="back-arrow-circle"
        style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s', flexShrink: 0, background: 'rgba(255,255,255,0.03)' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,215,0,0.7)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="back-arrow-icon"><path d="M9 2L4 7l5 5" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
      <h1 className="back-arrow-title" style={{ fontSize: 26, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{title}</h1>
      {extra}
    </div>
  )
}
