// Единая фирменная анимация загрузки Кармического банка.
// Использовать: <Spinner /> или <Spinner text="Загружаем…" />
export default function Spinner({ size = 48, text = null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 12 }}>
      <style>{`
        @keyframes kbs-rotate { to { transform: rotate(360deg); } }
        @keyframes kbs-pulse {
          0%, 100% { transform: scale(1); opacity: .9; }
          50% { transform: scale(1.14); opacity: 1; }
        }
        .kbs-core { animation: kbs-pulse 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .kbs-ring { animation: kbs-rotate 1.5s linear infinite; transform-box: fill-box; transform-origin: center; }
        .kbs-ring2 { animation: kbs-rotate 2.6s linear infinite reverse; transform-box: fill-box; transform-origin: center; }
      `}</style>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="kbs-g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFD700" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="15" stroke="rgba(212,175,55,.25)" strokeWidth="1" strokeDasharray="2 5" />
        <circle className="kbs-core" cx="24" cy="24" r="6.5" fill="url(#kbs-g)" />
        <g className="kbs-ring">
          <path d="M24 5 a19 19 0 0 1 19 19" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </g>
        <g className="kbs-ring2">
          <path d="M24 43 a19 19 0 0 1 -19 -19" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </g>
      </svg>
      {text && (
        <span style={{ color: '#9aa9c1', fontSize: 12, letterSpacing: 1.5 }}>{text}</span>
      )}
    </div>
  )
}
