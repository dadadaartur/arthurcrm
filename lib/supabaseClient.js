import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Клиент для браузера — без лишних заголовков
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Серверный клиент
export function createServerClient(cookie) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: cookie ? { cookie } : {},
    },
  })
}
