import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Health check: returns { ok, reason }
export async function checkSupabaseHealth() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const { error } = await supabase.from('events').select('id').limit(1).abortSignal(controller.signal)
    clearTimeout(timeout)
    if (error) {
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return { ok: false, reason: 'schema' }
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        return { ok: false, reason: 'rls' }
      }
      return { ok: false, reason: 'query', detail: error.message }
    }
    return { ok: true }
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, reason: 'timeout' }
    return { ok: false, reason: 'network', detail: e.message }
  }
}
