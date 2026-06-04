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

// Функция для создания серверного клиента (без заголовков, для getInitialProps)
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}
