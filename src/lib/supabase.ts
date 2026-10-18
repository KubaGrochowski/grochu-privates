import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null = brak konfiguracji → aplikacja działa tylko lokalnie */
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true } }) : null
