import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'

export default function Login() {
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

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
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

      {/* Мягкие переливы внизу */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.5) 0%, rgba(255,100,50,0.2) 40%, transparent 75%)', animation: 'breathe1 12s ease-in-out infinite alternate' }} />
      </div>

      {/* Большая чёрная дыра */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 400, height: 400, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="black-hole" style={{ width: 360, height: 360, position: 'absolute' }} />
        <div style={{ position: 'relative', zIndex: 1, width: 320, textAlign: 'center' }}>
          <h2 style={{ color: '#FFD700', marginBottom: 24, fontSize: 24, fontWeight: 600, letterSpacing: 2 }}>
            {step === 'tempPass' || step === 'setNewPass' ? 'Активация аккаунта' : 'Вход'}
          </h2>

          {step === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" className="input-field" required />
              {error && <p style={{ color: '#f44', fontSize: 14 }}>{error}</p>}
              <button type="submit" className="btn-gold" disabled={loading}>
                {loading ? <Spinner /> : 'Войти'}
              </button>
            </form>
          )}

          {step === 'tempPass' && invite && (
            <form onSubmit={handleTempPassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: '#aaa', fontSize: 14 }}>
                Для {invite.email} требуется активация. Введите временный пароль, полученный от администратора.
              </p>
              <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Временный пароль" className="input-field" required />
              {error && <p style={{ color: '#f44', fontSize: 14 }}>{error}</p>}
              <button type="submit" className="btn-gold" disabled={loading}>
                {loading ? <Spinner /> : 'Далее'}
              </button>
            </form>
          )}

          {step === 'setNewPass' && (
            <form onSubmit={handleSetNewPass} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: '#aaa', fontSize: 14 }}>Придумайте новый пароль для входа в систему.</p>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль (минимум 6 символов)" className="input-field" required />
              {error && <p style={{ color: '#f44', fontSize: 14 }}>{error}</p>}
              <button type="submit" className="btn-gold" disabled={loading}>
                {loading ? <Spinner /> : 'Активировать аккаунт'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes breathe1 {
          0% { opacity: 0.7; transform: scaleY(1); }
          100% { opacity: 1; transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  )
}
