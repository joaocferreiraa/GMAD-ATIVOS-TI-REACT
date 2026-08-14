import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
  )
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Sem fluxo de OAuth/magic link neste app (só e-mail+senha, ver
          // authService.js) — desligar evita que o SDK tente interpretar a
          // URL a cada carregamento, o que é só overhead sem uso aqui.
          detectSessionInUrl: false,
        },
      })
    : null
