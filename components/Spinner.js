import { useId } from 'react'

// Единый премиальный спиннер проекта: две тонкие золотые стрелки,
// бегущие по кругу. Никаких "системных" крутилок.
export default function Spinner({ size = 44 }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const grad = `spng-${raw}`
  return (
    <span style={{ display: 'inline-flex', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="50" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE9A0" />
            <stop offset="0.5" stopColor="#D4AF37" />
            <stop offset="1" stopColor="#B8860B" />
          </linearGradient>
        </defs>
        <g style={{ transformOrigin: '25px 25px', animation: 'kbspin 1.1s linear infinite' }}>
          {/* Стрелка 1: дуга сверху вправо */}
          <path d="M25 7 A18 18 0 0 1 43 25" stroke={`url(#${grad})`} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M43 25 L46.4 20.1 M43 25 L39.6 20.1" stroke={`url(#${grad})`} strokeWidth="2.2" strokeLinecap="round" />
          {/* Стрелка 2: дуга снизу влево */}
          <path d="M25 43 A18 18 0 0 1 7 25" stroke={`url(#${grad})`} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7 25 L10.4 29.9 M7 25 L3.6 29.9" stroke={`url(#${grad})`} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <style>{`@keyframes kbspin { to { transform: rotate(360deg); } }`}</style>
      </svg>
    </span>
  )
}
