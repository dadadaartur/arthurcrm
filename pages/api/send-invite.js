import { supabase } from '../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' })
  }

  const { email } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email обязателен' })
  }

  // Отправляем магическую ссылку через Supabase
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${req.headers.origin}/welcome`, // после входа попадёт на /welcome
    },
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(200).json({ success: true, message: 'Ссылка отправлена на email' })
}
