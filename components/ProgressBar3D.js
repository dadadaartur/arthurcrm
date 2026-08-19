import { useEffect, useState } from 'react'

export default function ProgressBar3D({ value = 0, marks = [], height = 14, max = 0 }) {
  const [anim, setAnim] = useState(false)
  useEffect(() => {
    let r2
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setAnim(true)) })
    return () => { cancelAnimationFrame(r1); if (r2) cancelAnimationFrame(r2) }
  }, [])
  const v = Number(value) || 0
  const maxMark = Math.max(0, ...marks.map(m => Number(m.value) || 0))
  // Если задан max (шкала уровня) — точный процент без «адаптивности».
  const maxVal = max > 0 ? max : (Math.max(maxMark, v) * 1.25) || 1
  const pct = anim ? Math.min(100, (v / maxVal) * 100) : 0
  const bgSize = pct > 0 ? Math.min(10000, (100 * 100) / pct) : 100
  return (
    <div style={{ position: 'relative', height, borderRadius: height, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #22c55e 70%, #4ade80 100%)', opacity: 0.16, filter: 'blur(6px)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', borderRadius: height, overflow: 'hidden', transition: 'width 1.4s cubic-bezier(.22,1,.36,1)', boxShadow: '0 0 14px rgba(74,222,128,0.35)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 45%, #22c55e 100%)', backgroundSize: bgSize + '% 100%' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%', background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.05))' }} />
        <div className="pb3d-shine" style={{ position: 'absolute', top: 0, bottom: 0, width: 40, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
      </div>
      <span style={{ position: 'absolute', top: '50%', left: pct + '%', transform: 'translate(-50%,-50%)', width: height + 6, height: height + 6, borderRadius: '50%', background: '#fff', border: '2px solid rgba(0,0,0,0.3)', boxShadow: '0 0 12px rgba(255,255,255,0.9)', transition: 'left 1.4s cubic-bezier(.22,1,.36,1)' }} />
      <style>{`@keyframes pb3dShine { 0% { left: -20%; } 100% { left: 110%; } } .pb3d-shine { animation: pb3dShine 2.6s ease-in-out 1.2s infinite; }`}</style>
    </div>
  )
}
