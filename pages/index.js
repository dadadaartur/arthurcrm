import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isSuperAdmin } from '../lib/permissions'
import KpiBlock from '../components/KpiBlock'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

function FlyingComet({ left, top, angle, dist, dur, delay, scale = 0.55 }) {
  return (
    <div style={{ position: 'absolute', left, top, zIndex: 1, pointerEvents: 'none', transform: `rotate(${angle}deg)`, '--dist': dist + 'px', filter: 'blur(0.6px)' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', position: 'relative', width: 0, height: 0 }}>
        <div style={{ position: 'absolute', left: 0, top: -2, height: 4, width: dist, transformOrigin: '0 50%', borderRadius: 4, opacity: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(170,195,255,0.08) 40%, rgba(205,225,255,0.16) 80%, rgba(235,245,255,0.22) 100%)', animation: `cometSmoke ${dur}s linear ${delay}s infinite` }} />
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: 0, animation: `cometFly ${dur}s linear ${delay}s infinite` }}>
          <div style={{ position: 'absolute', left: -140, top: -1, width: 140, height: 2, background: 'linear-gradient(90deg, transparent 0%, rgba(180,210,255,0.25) 55%, rgba(225,240,255,0.7) 88%, rgba(255,255,255,0.95) 100%)', borderRadius: 2, filter: 'blur(0.8px)' }} />
          <div style={{ position: 'absolute', left: -120, top: -2.5, width: 120, height: 5, background: 'linear-gradient(90deg, transparent 0%, rgba(160,200,255,0.15) 60%, rgba(220,235,255,0.35) 100%)', borderRadius: 4, filter: 'blur(2.5px)' }} />
          <div style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgba(225,240,255,0.9) 45%, transparent 100%)', boxShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 18px rgba(170,210,255,0.6), 0 0 30px rgba(140,190,255,0.35)' }} />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user, profile, loading } = useProfile()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [planKind, setPlanKind] = useState('onboarding') // 'onboarding' | 'development' — см. п.8 ТЗ
  const [holo, setHolo] = useState(false)
  const [pulse, setPulse] = useState(0)
  const starsRef = useRef(null)
  const nebulaRef = useRef(null)
  const topFlashRef = useRef(null)
  const bottomFlashRef = useRef(null)
  const glowRef = useRef(null)

  const stars = useMemo(() => {
    const arr = []
    const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
    let attempts = 0
    while (arr.length < 170 && attempts < 800) {
      attempts++
      const left = Math.random() * 100
      const top = Math.random() * 100
      if (Math.hypot(left - 58, top - 42) < 13) continue
      arr.push({ left, top, size: Math.random() * 2.2 + 0.5, color: colors[Math.floor(Math.random() * colors.length)], op: Math.random() * 0.5 + 0.3, dur: Math.random() * 18 + 10, delay: Math.random() * 14 })
    }
    return arr
  }, [])

  useEffect(() => {
    if (!user) { setPageLoading(false); return }
    if (!loading && !isSuperAdmin(profile) && (!profile || !profile.company_id)) {
      router.push('/welcome'); return
    }
    const loadData = async () => {
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      // Пока сотрудник в периоде адаптации (есть активный план с kind='onboarding')
      // — показываем кнопку «План адаптации», иначе — «План развития».
      const { data: activeOnboarding } = await supabase.from('adaptation_plans').select('id')
        .eq('employee_id', user.id).eq('kind', 'onboarding').eq('status', 'active').maybeSingle()
      setPlanKind(activeOnboarding ? 'onboarding' : 'development')
      setPageLoading(false)
    }
    loadData()
  }, [user, loading, profile])

  useEffect(() => {
    const flash = (ref, name) => {
      const el = ref.current
      if (!el) return
      el.style.animation = 'none'
      void el.offsetWidth
      el.style.animation = `${name} 1.3s ease-out`
    }
    const onWheel = (e) => {
      if (e.deltaY < 0) flash(topFlashRef, 'flashTop')
      else if (e.deltaY > 0) flash(bottomFlashRef, 'flashBottom')
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  const handleMouseMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5
    const y = e.clientY / window.innerHeight - 0.5
    if (starsRef.current) starsRef.current.style.transform = `translate(${x * -6}px, ${y * -6}px)`
    if (nebulaRef.current) nebulaRef.current.style.transform = `translate(${x * -14}px, ${y * -14}px)`
    if (glowRef.current) glowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
  }

  const toggleHole = () => {
    setHolo(h => !h)
    setPulse(p => p + 1)
  }

  useEffect(() => {
    if (!loading && !user) router.push('/landing')
  }, [loading, user, router])

  if (loading || pageLoading) return null
  if (!user) return null

  const karmikWord = getKarmikWord(balance)
  const centerX = 58
  const centerY = 42

  const blocks = [
    { title: 'Задания', sub: 'Заработай кармики!', left: 58, top: 16, colors: ['#d4af37', '#A3E0B0'] },
    { title: 'Чемпионат', sub: 'менеджеров', left: 77, top: 24, colors: ['#7AC78F', '#c084fc'] },
    { title: 'Магазин', sub: 'награды', left: 85, top: 42, colors: ['#F28B82', '#FFD700'] },
    { title: 'Моя компания', sub: 'данные и новости', left: 77, top: 60, colors: ['#c084fc', '#F28B82'] },
    { title: 'Покупки', sub: 'мои награды', left: 58, top: 68, colors: ['#ffe29f', '#b3f0ff'] },
    { title: 'База знаний', sub: 'лучшие практики', left: 39, top: 60, colors: ['#c084fc', '#7AC78F'] },
    { title: planKind === 'onboarding' ? 'План адаптации' : 'План развития', sub: planKind === 'onboarding' ? 'твой путь' : 'расти дальше', left: 31, top: 42, colors: ['#7AC78F', '#F28B82'] },
    { title: 'Цели', sub: 'твои победы', left: 39, top: 24, colors: ['#A3E0B0', '#d4af37'] },
  ]
  const beams = blocks.map(block => {
    const dx = block.left - centerX
    const dy = block.top - centerY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const length = Math.sqrt(dx * dx + dy * dy) * 0.5
    return { angle, length }
  })
  const routes = {
    'Чемпионат': '/leaderboard', 'Моя компания': '/company', 'База знаний': '/knowledge',
    'План адаптации': '/onboarding', 'План развития': '/development', 'Цели': '/goals', 'Задания': '/tasks',
    'Магазин': '/shop', 'Покупки': '/my-purchases',
  }

  return (
    <>
      <Head><title>Кармический банк</title></Head>
      <div onMouseMove={handleMouseMove} style={{ width: '100%', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {holo && (
          <div ref={glowRef} style={{ position: 'fixed', left: 0, top: 0, zIndex: 9998, pointerEvents: 'none', willChange: 'transform', transform: 'translate(-300px, -300px)' }}>
            <div className="holo-glow-inner" />
          </div>
        )}
        <div ref={starsRef} style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%', zIndex: 0, transition: 'transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {stars.map((s, i) => (
            <div key={i} style={{ position: 'absolute', left: s.left + '%', top: s.top + '%', width: s.size + 'px', height: s.size + 'px', borderRadius: '50%', background: s.color, boxShadow: `0 0 ${s.size * 2}px ${s.color}`, opacity: s.op, animation: `twinkle ${s.dur}s ease-in-out infinite`, animationDelay: s.delay + 's' }} />
          ))}
        </div>
        <div ref={nebulaRef} style={{ position: 'absolute', top: '-3%', left: '-3%', width: '106%', height: '106%', zIndex: 1, transition: 'transform 2s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div style={{ position: 'absolute', top: '18%', left: '-4%', width: '38%', height: '38%', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(55px)', animation: 'nebulaDrift1 220s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: '18%', right: '-4%', width: '44%', height: '44%', background: 'radial-gradient(ellipse at center, rgba(255,150,200,0.045) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'nebulaDrift2 260s ease-in-out infinite alternate' }} />
        </div>
        <FlyingComet left="8%" top="22%" angle={-16} dist={560} dur={70} delay={6} scale={0.55} />
        <FlyingComet left="70%" top="10%" angle={158} dist={600} dur={80} delay={45} scale={0.45} />
        <FlyingComet left="12%" top="70%" angle={-30} dist={520} dur={75} delay={90} scale={0.5} />
        <FlyingComet left="85%" top="55%" angle={200} dist={560} dur={85} delay={130} scale={0.42} />
        {pulse > 0 && <div key={pulse} className="cosmos-light" />}
        <div style={{ position: 'absolute', right: '-6%', bottom: '-10%', zIndex: 1, pointerEvents: 'none', width: '52%', height: '70%', background: 'radial-gradient(ellipse at 60% 70%, rgba(200,120,50,0.14) 0%, rgba(120,80,40,0.07) 45%, transparent 75%)', filter: 'blur(30px)', animation: 'pillarsBreath 22s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', right: -30, bottom: -24, zIndex: 2, pointerEvents: 'none', width: 'min(46vw, 620px)', animation: 'pillarsBreath 22s ease-in-out infinite alternate' }}>
          <img src="/pillars.png" alt="" onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{ width: '100%', display: 'block', mixBlendMode: 'screen', filter: 'blur(0.5px) saturate(1.15) brightness(1.02)', maskImage: 'radial-gradient(ellipse at 55% 60%, black 52%, transparent 96%)', WebkitMaskImage: 'radial-gradient(ellipse at 55% 60%, black 52%, transparent 96%)' }} />
        </div>
        <div className="holo-rail" />
        <div ref={topFlashRef} className="scroll-flash-top" />
        <div ref={bottomFlashRef} className="scroll-flash-bottom" />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.16) 0%, rgba(255,100,50,0.07) 40%, transparent 75%)', filter: 'blur(18px)', animation: 'breathe1 40s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, right: '-8%', width: '115%', height: '100%', background: 'radial-gradient(ellipse at 72% 100%, rgba(130,100,255,0.1) 0%, transparent 70%)', filter: 'blur(24px)', animation: 'breathe3 56s ease-in-out infinite alternate' }} />
        </div>
        <div style={{ position: 'absolute', left: centerX + '%', top: centerY + '%', transform: 'translate(-50%, -50%)', width: 560, height: 560, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent, rgba(255,180,0,0.04) 20%, rgba(255,140,0,0.09) 40%, transparent 60%, rgba(139,92,246,0.07) 80%, transparent 100%)', filter: 'blur(34px)', animation: 'accretionSpin 180s linear infinite', pointerEvents: 'none', zIndex: 4 }} />
        <div onClick={toggleHole} style={{ position: 'absolute', left: centerX + '%', top: centerY + '%', width: 110, height: 110, zIndex: 5, animation: 'holeBreath 30s ease-in-out infinite', cursor: 'pointer' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.45) 0%, rgba(255,100,0,0.2) 30%, transparent 62%)', filter: 'blur(16px)', animation: 'orbitSpin 90s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-6%', left: '-6%', width: '112%', height: '112%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.55) 0%, rgba(200,100,255,0.22) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 70s linear infinite reverse' }} />
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)', boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 0 90px rgba(255,180,0,0.28)', filter: 'blur(2px)' }} />
        </div>
        {beams.map((beam, idx) => (
          <div key={`beam-${idx}`} style={{ position: 'absolute', left: centerX + '%', top: centerY + '%', width: beam.length + '%', height: '1px', background: 'linear-gradient(90deg, rgba(255,200,50,0) 0%, rgba(255,180,0,0.16) 30%, rgba(255,140,0,0.28) 60%, transparent 100%)', transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 0', filter: 'blur(3px)', animation: `beamPulse ${14 + idx % 3}s ease-in-out infinite alternate ${idx * 0.8}s`, pointerEvents: 'none', zIndex: 6 }} />
        ))}
        {blocks.map((block, idx) => {
          const [c1, c2] = block.colors
          const dx = block.left - centerX
          const dy = block.top - centerY
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const ux = dx / len
          const uy = dy / len
          const handleClick = () => { const p = routes[block.title]; if (p) router.push(p) }
          return (
            <div key={idx} style={{ position: 'absolute', left: block.left + '%', top: block.top + '%', zIndex: 10, '--ux': ux, '--uy': uy, animation: 'gravBreath 30s ease-in-out infinite' }}>
              <div style={{ animation: `drift${idx % 3} ${130 + idx * 6}s ease-in-out infinite alternate` }}>
                <div onClick={handleClick} style={{ transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s ease', willChange: 'transform' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.18)'; e.currentTarget.style.filter = `drop-shadow(0 0 24px ${c1}) drop-shadow(0 0 8px ${c2})` }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; e.currentTarget.style.filter = 'none' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, marginBottom: 4, background: `linear-gradient(135deg, ${c1}, ${c2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.6))', textAlign: 'center', whiteSpace: 'nowrap' }}>{block.title}</div>
                  {block.sub && (
                    <div style={{ fontSize: 13, fontWeight: 400, color: '#eaf0fb', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))', opacity: 0.85, textAlign: 'center', whiteSpace: 'nowrap' }}>{block.sub}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div style={{ position: 'absolute', left: '2.5%', top: 10, zIndex: 20, animation: 'driftBalance 55s ease-in-out infinite alternate', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 340, padding: '14px 40px' }}>
          <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textShadow: '0 0 8px rgba(160,233,255,0.6)', marginBottom: 8 }}>Баланс</div>
          <div style={{ fontSize: 58, fontWeight: 600, lineHeight: 1, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f, #b3f0ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 14px rgba(100,200,255,0.9)) drop-shadow(0 0 28px rgba(255,150,200,0.6))', animation: 'rainbowShift 12s ease-in-out infinite alternate', marginBottom: 6 }}>{balance}</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.85)', textShadow: '0 0 8px rgba(100,200,255,0.7)', letterSpacing: 2, marginBottom: 20 }}>{karmikWord}</div>
          <div style={{ width: '70%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', marginBottom: 18 }} />
          <div style={{ display: 'flex', gap: 56, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {[
              { label: 'Перевести', path: '/transfer', color: '#a0e9ff' },
              { label: 'Операции', path: '/history', color: '#ffb3c6' },
            ].map((btn, idx) => (
              <div key={idx} style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
                onClick={() => router.push(btn.path)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.18)'; e.currentTarget.firstChild.style.color = btn.color; e.currentTarget.firstChild.style.textShadow = `0 0 14px ${btn.color}` }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.firstChild.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.firstChild.style.textShadow = '0 0 6px rgba(100,200,255,0.4)' }}>
                <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.6)', textShadow: '0 0 6px rgba(100,200,255,0.4)', transition: 'all 0.5s ease', marginBottom: 5 }}>{btn.label}</div>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: btn.color, margin: '0 auto', boxShadow: `0 0 6px ${btn.color}` }} />
              </div>
            ))}
          </div>
        </div>
        {/* KPI сотрудника (вместо блока мастерства) */}
        <KpiBlock />
      </div>
      <style jsx global>{`
        html, body { overflow-x: hidden; scrollbar-width: none; -ms-overflow-style: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .holo-glow-inner { width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 50%;
          background: radial-gradient(circle, rgba(160,233,255,0.5) 0%, rgba(120,200,255,0.25) 40%, transparent 70%);
          filter: blur(2px); mix-blend-mode: screen; pointer-events: none;
          animation: glowIn 0.6s ease-out both, glowPulse 2.4s ease-in-out 0.6s infinite; }
        @keyframes glowIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        .holo-rail { position: fixed; right: 6px; top: 8%; bottom: 8%; width: 3px; border-radius: 3px; z-index: 40; pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(160,233,255,0.14), rgba(192,132,252,0.14), rgba(255,179,196,0.14), transparent);
          box-shadow: 0 0 6px rgba(160,233,255,0.08); }
        .scroll-flash-top { position: fixed; left: 0; right: 0; top: 0; height: 140px; z-index: 45; pointer-events: none; opacity: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(160,233,255,0.35) 0%, rgba(160,233,255,0.12) 45%, transparent 75%); }
        .scroll-flash-bottom { position: fixed; left: 0; right: 0; bottom: 0; height: 140px; z-index: 45; pointer-events: none; opacity: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(255,190,140,0.22) 0%, rgba(255,170,120,0.08) 45%, transparent 75%); }
        @keyframes flashTop { 0% { opacity: 0; } 20% { opacity: 0.6; } 100% { opacity: 0; } }
        @keyframes flashBottom { 0% { opacity: 0; } 20% { opacity: 0.35; } 100% { opacity: 0; } }
        .cosmos-light { position: absolute; inset: 0; z-index: 6; pointer-events: none; opacity: 0; mix-blend-mode: screen;
          background: radial-gradient(circle at 58% 42%, rgba(255,120,140,0.45) 0%, rgba(255,100,120,0.26) 30%, rgba(200,80,120,0.14) 55%, transparent 78%);
          animation: cosmosLight 3.4s ease-in-out forwards; }
        @keyframes cosmosLight { 0% { opacity: 0; } 25% { opacity: 1; } 60% { opacity: 0.6; } 100% { opacity: 0; } }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.9; transform: scale(1.05); } }
        @keyframes orbitSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes accretionSpin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes beamPulse { 0% { opacity: 0.15; } 100% { opacity: 0.4; } }
        @keyframes drift0 { 0% { transform: translateX(-5px) translateY(3px); } 100% { transform: translateX(5px) translateY(-3px); } }
        @keyframes drift1 { 0% { transform: translateX(4px) translateY(-4px); } 100% { transform: translateX(-4px) translateY(4px); } }
        @keyframes drift2 { 0% { transform: translateX(-4px) translateY(-3px); } 100% { transform: translateX(4px) translateY(3px); } }
        @keyframes driftBalance { 0% { transform: translate(0, 0); } 100% { transform: translate(3px, -3px); } }
        @keyframes rainbowShift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes breathe1 { 0% { opacity: 0.6; transform: scaleY(1); } 100% { opacity: 1; transform: scaleY(1.08); } }
        @keyframes breathe3 { 0% { opacity: 0.4; transform: scaleY(1.05) translateX(1%); } 100% { opacity: 0.8; transform: scaleY(1.15) translateX(-1%); } }
        @keyframes holeBreath { 0%, 100% { transform: translate(-50%, -50%) scale(0.92); } 50% { transform: translate(-50%, -50%) scale(1.42); } }
        @keyframes gravBreath { 0%, 100% { transform: translate(calc(var(--ux) * 14px), calc(var(--uy) * 14px)); } 50% { transform: translate(calc(var(--ux) * -24px), calc(var(--uy) * -24px)); } }
        @keyframes nebulaDrift1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(6%,3%) scale(1.05); } }
        @keyframes nebulaDrift2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-5%,-4%) scale(1.07); } }
        @keyframes pillarsBreath { 0% { opacity: 0.75; } 100% { opacity: 1; } }
        @keyframes cometFly { 0% { transform: translateX(0); opacity: 0; } 2% { opacity: 0.85; } 12% { transform: translateX(var(--dist)); opacity: 0; } 100% { transform: translateX(var(--dist)); opacity: 0; } }
        @keyframes cometSmoke { 0% { transform: scaleX(0) scaleY(1); opacity: 0; filter: blur(3px); } 2% { opacity: 0.25; } 12% { transform: scaleX(1) scaleY(1); opacity: 0.22; filter: blur(4px); } 45% { transform: scaleX(1) scaleY(2); opacity: 0.16; filter: blur(6px); } 75% { transform: scaleX(1) scaleY(3); opacity: 0.08; filter: blur(8px); } 95% { transform: scaleX(1) scaleY(3.6); opacity: 0; filter: blur(10px); } 100% { transform: scaleX(1) scaleY(3.6); opacity: 0; filter: blur(10px); } }
      `}</style>
    </>
  )
}
