// pages/test-planet.js — Галактическое свечение, контент на всю ширину

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'

export default function TestPlanetPage() {
  const router = useRouter()
  const { token } = router.query
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialCheck, setInitialCheck] = useState(!!token)
  const [step, setStep] = useState('login')
  const [invite, setInvite] = useState(null)

  useEffect(() => {
    if (token) fetchInvite(token)
  }, [token])

  async function fetchInvite(t) {
    setInitialCheck(true)
    const { data } = await supabase
      .from('invitations')
      .select('*, companies(name), roles(name)')
      .eq('token', t)
      .eq('status', 'pending')
      .maybeSingle()

    if (data) {
      setInvite(data)
      setEmail(data.email || '')
      setStep('tempPass')
    } else {
      setError('Приглашение не найдено или уже использовано')
    }
    setInitialCheck(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (!signInError) {
      window.location.href = '/'
      return
    }

    if (signInError.message.includes('Invalid login credentials')) {
      const { data: inviteData } = await supabase
        .from('invitations')
        .select('*, companies(name), roles(name)')
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle()

      if (inviteData) {
        setInvite(inviteData)
        setEmail(inviteData.email)
        setStep('tempPass')
        setLoading(false)
        return
      }

      window.location.href = '/welcome'
      return
    }

    setError('Неверный email или пароль')
    setLoading(false)
  }

  async function handleTempPassSubmit(e) {
    e.preventDefault()
    if (!tempPassword) return
    setLoading(true)
    setError('')

    if (tempPassword !== invite.temp_password) {
      setError('Неверный временный пароль')
      setLoading(false)
      return
    }

    setStep('setNewPass')
    setLoading(false)
  }

  async function handleSetNewPass(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: newPassword,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      const user = signUpData?.user
      if (!user) {
        setError('Не удалось создать аккаунт')
        setLoading(false)
        return
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          user_id: user.id,
          company_id: invite.company_id,
          department_id: null,
          role_id: invite.role_id,
          display_name: email,
          email: invite.email,
          manager_id: invite.created_by,
        })
      }

      await supabase.from('invitations').update({ status: 'accepted', temp_password: null }).eq('id', invite.id)

      await supabase.auth.signOut()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password: newPassword,
      })

      if (signInError) {
        setError('Не удалось войти после активации')
        setLoading(false)
        return
      }

      window.location.href = '/'
    } catch (err) {
      setError('Непредвиденная ошибка')
      setLoading(false)
    }
  }

  if (initialCheck) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  // Единый стиль для всех кнопок (стеклянный)
  const glassButtonStyle = {
    width: '100%',
    padding: '12px 0',
    fontSize: 15,
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(160,233,255,0.2), rgba(255,179,198,0.2), rgba(255,226,159,0.2))',
    backdropFilter: 'blur(12px)',
    transition: 'all 0.3s',
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
    animation: 'subtleGlow 3s ease-in-out infinite',
    marginTop: 12
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#000', overflowY: 'auto', overflowX: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      {/* Звёзды (фиксированные) */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 150 }).map((_, i) => {
          const size = Math.random() * 2.8 + 0.6
          const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
          const color = colors[Math.floor(Math.random() * colors.length)]
          return (
            <div key={i} style={{
              position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
              width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 10 + 's'
            }} />
          )
        })}
      </div>

      {/* Галактические туманности – яркие, заполняют края */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <div style={{
          position: 'absolute',
          top: '0%', left: '0%',
          width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,180,255,0.6) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'nebulaLeft 8s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute',
          top: '10%', right: '0%',
          width: 650, height: 650,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,180,50,0.7) 0%, transparent 70%)',
          filter: 'blur(55px)',
          animation: 'nebulaRight 10s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '0%', left: '15%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,120,180,0.6) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'nebulaBottom 12s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute',
          top: '30%', left: '30%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160,120,255,0.5) 0%, transparent 70%)',
          filter: 'blur(45px)',
          animation: 'nebulaCenter 9s ease-in-out infinite alternate'
        }} />
      </div>

      {/* Контент: используем всю ширину с минимальными отступами */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 1400, margin: '0 auto',
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '40px 40px',
        flexWrap: 'wrap'
      }}>
        {/* Левая часть – информация */}
        <div style={{
          flex: '1 1 500px',
          maxWidth: 600,
          paddingLeft: 0,
          marginBottom: 20
        }}>
          <h1 style={{
            fontSize: 44, fontWeight: 700, marginBottom: 14,
            background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.2
          }}>
            Кармический банк
          </h1>
          <p style={{ fontSize: 18, color: '#ccc', marginBottom: 36, lineHeight: 1.5 }}>
            Система мотивации и наград для вашей команды
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {[
              { title: 'Выполняй задания', desc: 'Получай кармики за выполненные поручения и цели' },
              { title: 'Обменивай на призы', desc: 'Трать кармики в магазине: от выходного до доставки на дом' },
              { title: 'Соревнуйся', desc: 'Участвуй в чемпионатах и зарабатывай больше кармиков' },
              { title: 'Получай сертификаты', desc: 'Цифровые и физические награды с подтверждением' },
            ].map((item, idx) => (
              <div key={idx}>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 15, color: '#999', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Правая часть – форма */}
        <div style={{
          flex: '0 0 360px',
          marginBottom: 20,
          marginLeft: 40
        }}>
          <div style={{
            background: 'rgba(15, 20, 35, 0.4)',
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            border: '1px solid rgba(255,215,0,0.2)',
            padding: 28,
            boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 60px rgba(255,200,0,0.15)'
          }}>
            {step === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" className="input-field" required />
                {error && <p style={{ color: '#f44', fontSize: 14 }}>{error}</p>}
                <button type="submit" style={glassButtonStyle} disabled={loading}>
                  {loading ? <Spinner /> : 'Войти'}
                </button>
              </form>
            )}

            {step === 'tempPass' && invite && (
              <form onSubmit={handleTempPassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: '#aaa', fontSize: 13 }}>
                  Для {invite.email} требуется активация. Введите временный пароль, полученный от администратора.
                </p>
                <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Временный пароль" className="input-field" required />
                {error && <p style={{ color: '#f44', fontSize: 14 }}>{error}</p>}
                <button type="submit" style={glassButtonStyle} disabled={loading}>
                  {loading ? <Spinner /> : 'Далее'}
                </button>
              </form>
            )}

            {step === 'setNewPass' && (
              <form onSubmit={handleSetNewPass} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: '#aaa', fontSize: 13 }}>Придумайте новый пароль для входа в систему.</p>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль (минимум 6 символов)" className="input-field" required />
                {error && <p style={{ color: '#f44', fontSize: 14 }}>{error}</p>}
                <button type="submit" style={glassButtonStyle} disabled={loading}>
                  {loading ? <Spinner /> : 'Активировать аккаунт'}
                </button>
              </form>
            )}

            {step === 'login' && (
              <button
                onClick={() => router.push('/welcome')}
                style={{ ...glassButtonStyle, marginTop: 10 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(160,233,255,0.4), rgba(255,179,198,0.4), rgba(255,226,159,0.4))';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(160,233,255,0.2), rgba(255,179,198,0.2), rgba(255,226,159,0.2))';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Зарегистрироваться
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes subtleGlow {
          0% { box-shadow: 0 0 5px rgba(0,255,100,0.2); }
          50% { box-shadow: 0 0 12px rgba(0,255,100,0.4); }
          100% { box-shadow: 0 0 5px rgba(0,255,100,0.2); }
        }
        @keyframes nebulaLeft {
          0% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          100% { transform: translate(40px, -30px) scale(1.1); opacity: 1; }
        }
        @keyframes nebulaRight {
          0% { transform: translate(0, 0) scale(1); opacity: 0.9; }
          100% { transform: translate(-30px, 20px) scale(1.15); opacity: 1; }
        }
        @keyframes nebulaBottom {
          0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          100% { transform: translate(20px, -35px) scale(1.05); opacity: 0.95; }
        }
        @keyframes nebulaCenter {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          100% { transform: translate(-20px, 25px) scale(1.1); opacity: 0.85; }
        }
        *::-webkit-scrollbar { width: 0; height: 0; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  )
}

TestPlanetPage.bypassLayout = true
