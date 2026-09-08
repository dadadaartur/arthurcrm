export default function Spinner({ size = 64 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid transparent', borderTopColor: '#FFD700', borderRightColor: 'rgba(255,215,0,0.15)', animation: 'spinA 1.1s linear infinite', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.55))' }} />
      <div style={{ position: 'absolute', inset: 7, borderRadius: '50%', border: '1.5px solid transparent', borderTopColor: '#a0e9ff', borderLeftColor: 'rgba(160,233,255,0.15)', animation: 'spinB 1.7s linear infinite', filter: 'drop-shadow(0 0 8px rgba(160,233,255,0.45))' }} />
      <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '1.5px solid transparent', borderTopColor: '#c084fc', borderBottomColor: 'rgba(192,132,252,0.15)', animation: 'spinA 2.3s linear infinite', filter: 'drop-shadow(0 0 8px rgba(192,132,252,0.45))' }} />
      <div style={{ position: 'absolute', inset: '36%', borderRadius: '50%', background: 'radial-gradient(circle, #fff, #FFD700 45%, rgba(255,215,0,0) 72%)', animation: 'spinCore 1.9s ease-in-out infinite', boxShadow: '0 0 28px rgba(255,215,0,0.75)' }} />
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <span key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 3, height: 3, marginLeft: -1.5, marginTop: -1.5, borderRadius: '50%', background: i % 2 ? '#FFD700' : '#a0e9ff', boxShadow: `0 0 10px ${i % 2 ? '#FFD700' : '#a0e9ff'}`, animation: `spinParticle ${1.4 + i * 0.12}s linear ${i * 0.18}s infinite` }} />
      ))}
      <style jsx>{`
        @keyframes spinA { to { transform: rotate(360deg); } }
        @keyframes spinB { to { transform: rotate(-360deg); } }
        @keyframes spinCore { 0%, 100% { transform: scale(0.85); opacity: 0.75; } 50% { transform: scale(1.18); opacity: 1; } }
        @keyframes spinParticle {
          0% { transform: rotate(0deg) translateX(${size * 0.3}px) scale(1); opacity: 0.95; }
          70% { opacity: 0.55; }
          100% { transform: rotate(360deg) translateX(${size * 0.55}px) scale(0.15); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
