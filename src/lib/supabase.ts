import { createClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from './config'

export function createSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) throw new Error('Supabase env missing')
  return createClient(url, key)
}
