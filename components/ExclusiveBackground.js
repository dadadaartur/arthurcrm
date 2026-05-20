import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ExclusiveBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
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
    </div>,
    document.body
  )
}
