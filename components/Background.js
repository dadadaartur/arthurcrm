export default function Background() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      background: '#FFFFFF',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 1,
        background: `
          radial-gradient(circle at 50% 50%, transparent 0, transparent 540px, rgba(212,180,84,.18) 541px, transparent 542px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 320px, rgba(212,180,84,.22) 321px, transparent 322px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 210px, rgba(212,180,84,.16) 211px, transparent 212px),
          radial-gradient(circle at 50% 50%, transparent 0, transparent 95px, rgba(212,180,84,.12) 96px, transparent 97px),
          radial-gradient(circle at 18% 50%, transparent 0, transparent 360px, rgba(212,180,84,.10) 361px, transparent 362px),
          radial-gradient(circle at 82% 50%, transparent 0, transparent 360px, rgba(212,180,84,.10) 361px, transparent 362px),
          linear-gradient(90deg, transparent, rgba(212,180,84,.14), transparent),
          linear-gradient(180deg, transparent, rgba(212,180,84,.10), transparent)
        `
      }} />
    </div>
  )
}
