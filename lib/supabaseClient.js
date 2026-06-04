import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Клиент для браузера (с заголовками)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
})

// Серверный клиент, который умеет читать сессию из кук
export function createServerSupabaseClient(cookieHeader) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        // Передаём куки, чтобы Supabase мог определить пользователя
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    },
  })
}
