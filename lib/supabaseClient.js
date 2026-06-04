import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Клиент для браузера
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
})

// Серверный клиент, который получает куки и может определить пользователя
export function createServerClient(cookie) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        ...(cookie ? { cookie } : {}),
      },
    },
  })
}
