// Единый премиальный спиннер Кармического банка: орбитальная система
// вокруг пульсирующего золотого ядра — из той же космической эстетики,
// что и главная страница (чёрная дыра, орбиты, карма).
//
// Почему больше не "прыгает":
// 1) Не используем useId — ID градиентов фиксированные, одинаковые на
//    сервере и в браузере, нет SSR-mismatch и лишней перерисовки.
// 2) По умолчанию спиннер рендерится фиксированным слоем по центру
//    экрана (fullScreen) — он не зависит от макета страницы и не
//    смещается, пока контент грузится.
export default function Spinner({ size = 72, fullScreen = true }) {
  const svg = (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <style>{`
        @keyframes kbspn-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes kbspn-glow { 0%, 100% { opacity: .65; } 50% { opacity: 1; } }
        .kbspn-core { animation: kbspn-pulse 2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .kbspn-halo { animation: kbspn-glow 2s ease-in-out infinite; }
      `}</style>
      <defs>
        <radialGradient id="kbspn-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF7D6" />
          <stop offset="0.45" stopColor="#FFD700" />
          <stop offset="1" stopColor="#FFA500" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="kbspn-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFD700" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kbspn-gold" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE9A0" />
          <stop offset="1" stopColor="#D4AF37" />
        </linearGradient>
        <linearGradient id="kbspn-violet" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Мягкое внешнее свечение */}
      <circle className="kbspn-halo" cx="50" cy="50" r="30" fill="url(#kbspn-glow)" />

      {/* Орбита 1 — золотая, наклон -18° */}
      <g transform="rotate(-18 50 50)">
        <ellipse cx="50" cy="50" rx="42" ry="13" fill="none" stroke="url(#kbspn-gold)" strokeWidth="0.6" opacity="0.45" />
        <circle r="3.2" fill="#FFD700">
          <animateMotion dur="2.6s" repeatCount="indefinite" path="M 8 50 a 42 13 0 1 0 84 0 a 42 13 0 1 0 -84 0" />
        </circle>
      </g>

      {/* Орбита 2 — фиолетовая, наклон +38°, частица летит навстречу */}
      <g transform="rotate(38 50 50)">
        <ellipse cx="50" cy="50" rx="42" ry="13" fill="none" stroke="url(#kbspn-violet)" strokeWidth="0.6" opacity="0.4" />
        <circle r="2.6" fill="#c084fc">
          <animateMotion dur="3.4s" repeatCount="indefinite" calcMode="linear" keyPoints="1;0" keyTimes="0;1" path="M 8 50 a 42 13 0 1 0 84 0 a 42 13 0 1 0 -84 0" />
        </circle>
      </g>

      {/* Орбита 3 — тонкая, почти вертикальная, маленькая частица */}
      <g transform="rotate(78 50 50)">
        <ellipse cx="50" cy="50" rx="34" ry="10" fill="none" stroke="url(#kbspn-gold)" strokeWidth="0.4" opacity="0.25" />
        <circle r="1.8" fill="#FFE9A0">
          <animateMotion dur="4.2s" repeatCount="indefinite" path="M 16 50 a 34 10 0 1 0 68 0 a 34 10 0 1 0 -68 0" />
        </circle>
      </g>

      {/* Ядро */}
      <g className="kbspn-core">
        <circle cx="50" cy="50" r="9" fill="url(#kbspn-core)" />
        <circle cx="50" cy="50" r="5" fill="#FFD700" />
      </g>
    </svg>
  )

  // Полноэкранный режим: фиксированный слой по центру экрана.
  // Не зависит от макета — спиннер гарантированно стоит на месте.
  if (fullScreen) {
    return (
      <span
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        {svg}
      </span>
    )
  }

  // Инлайн-режим (если нужно встроить спиннер в конкретный блок).
  return <span style={{ display: 'inline-flex', width: size, height: size }}>{svg}</span>
}
