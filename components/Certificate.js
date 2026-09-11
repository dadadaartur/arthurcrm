// Цифровая грамота (по видению от 6 сентября 2026: «грамотами» как
// часть настоящей мотивационной платформы). Макет нарисован и
// проверен рендером до того, как встраивать в код.
export default function Certificate({ name, title, subtitle, date }) {
  const id = Math.round(Math.random() * 1e6)
  return (
    <svg viewBox="0 0 500 360" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
      <defs>
        <linearGradient id={`bgCert${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf0" /><stop offset="100%" stopColor="#fff3e0" />
        </linearGradient>
        <linearGradient id={`goldFrame${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0c674" /><stop offset="50%" stopColor="#ea580c" /><stop offset="100%" stopColor="#c589f5" />
        </linearGradient>
        <radialGradient id={`medal${id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff3c4" /><stop offset="50%" stopColor="#e8a94a" /><stop offset="100%" stopColor="#8a5a12" />
        </radialGradient>
      </defs>
      <rect width="500" height="360" fill={`url(#bgCert${id})`} />
      <rect x="10" y="10" width="480" height="340" fill="none" stroke={`url(#goldFrame${id})`} strokeWidth="3" rx="4" />
      <rect x="18" y="18" width="464" height="324" fill="none" stroke={`url(#goldFrame${id})`} strokeWidth="1" rx="2" opacity="0.6" />
      <path d="M18 40 L18 18 L40 18" fill="none" stroke={`url(#goldFrame${id})`} strokeWidth="2.5" />
      <path d="M460 18 L482 18 L482 40" fill="none" stroke={`url(#goldFrame${id})`} strokeWidth="2.5" />
      <path d="M18 320 L18 342 L40 342" fill="none" stroke={`url(#goldFrame${id})`} strokeWidth="2.5" />
      <path d="M482 320 L482 342 L460 342" fill="none" stroke={`url(#goldFrame${id})`} strokeWidth="2.5" />

      {/* «ГРАМОТА» намеренно капсом с разрядкой — формальное
          документное соглашение (как на настоящих дипломах), не
          типовой AI-эйбрау, поэтому не подпадает под общий запрет на
          капс в интерфейсе. */}
      <text x="250" y="70" fontFamily="Georgia, serif" fontSize="13" letterSpacing="4" fill="#a5720a" textAnchor="middle">ГРАМОТА</text>
      <line x1="180" y1="82" x2="320" y2="82" stroke={`url(#goldFrame${id})`} strokeWidth="1" />

      <text x="250" y="130" fontFamily="Georgia, serif" fontSize="23" fontWeight="bold" fill="#2a2a2a" textAnchor="middle">{name}</text>
      <text x="250" y="163" fontFamily="Georgia, serif" fontSize="13" fill="#666" textAnchor="middle">{title}</text>
      {subtitle && <text x="250" y="186" fontFamily="Georgia, serif" fontSize="12" fill="#999" textAnchor="middle">{subtitle}</text>}

      <circle cx="250" cy="250" r="34" fill={`url(#medal${id})`} stroke="#8a5a12" strokeWidth="1.5" />
      <circle cx="250" cy="250" r="24" fill="none" stroke="#fff8e0" strokeWidth="1.5" opacity="0.7" />
      <path d="M250 234 L254 246 L266 246 L256 253 L260 265 L250 258 L240 265 L244 253 L234 246 L246 246 Z" fill="#fff8e0" />
      <path d="M235 278 L232 300 L250 290 L268 300 L265 278" fill={`url(#medal${id})`} stroke="#8a5a12" strokeWidth="1" />

      {date && <text x="250" y="335" fontFamily="Georgia, serif" fontSize="10" fill="#bbb" textAnchor="middle">{date}</text>}
    </svg>
  )
}
