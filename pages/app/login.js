import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabaseClient'

export default function AppLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (!signInError) {
      window.location.href = '/app'
      return
    }
    setError('Неверный email или пароль.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1c', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Head>
        <title>Вход · Кармический банк</title>
        <link rel="manifest" href="/app-manifest.json" />
        <link rel="apple-touch-icon" href="/app-icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0a0e1c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>

      <div style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 20, overflow: 'hidden' }}>
        <img src="/app-icons/icon-192.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Кармический банк</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Вход в мобильное приложение</p>

      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          style={{ padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 15 }} />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required
          style={{ padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 15 }} />
        {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading}
          style={{ marginTop: 8, padding: '14px 0', borderRadius: 14, background: 'linear-gradient(135deg, #FFD700, #f0b900)', border: 'none', color: '#0a0e1c', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
