export default function ProgressBar3D({ value = 0, marks = [], unit = '', height = 14 }) {
  const maxVal = Math.max(Number(value) || 0, ...marks.map(m => Number(m.value) || 0)) * 1.25 || 1
  const pct = Math.min(100, ((Number(value) || 0) / maxVal) * 100)
  const bgSize = pct > 0 ? Math.min(10000, (100 * 100) / pct) : 100
  return (
    <div style={{ position: 'relative', height, borderRadius: height, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), inset 0 -1px 2px rgba(255,255,255,0.08), 0 1px 0 rgba(255,255,255,0.06)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', borderRadius: height, overflow: 'hidden', transition: 'width 1.2s cubic-bezier(.22,1,.36,1)', boxShadow: '0 0 12px rgba(74,222,128,0.3)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 45%, #22c55e 100%)', backgroundSize: bgSize + '% 100%' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%', background: 'linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.05))' }} />
      </div>
      {marks.map(m => (
        <span key={m.key} title={`${m.label}: ${m.value}${unit}`} style={{ position: 'absolute', top: -3, bottom: -3, left: (Number(m.value) / maxVal * 100) + '%', width: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1, transform: 'translateX(-50%)' }} />
      ))}
      <span style={{ position: 'absolute', top: '50%', left: pct + '%', transform: 'translate(-50%,-50%)', width: height + 6, height: height + 6, borderRadius: '50%', background: '#fff', border: '2px solid rgba(0,0,0,0.3)', boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.6)', transition: 'left 1.2s cubic-bezier(.22,1,.36,1)' }} />
    </div>
  )
}
