export function getSupabaseUrl(): string | undefined {
  const v = import.meta.env.VITE_SUPABASE_URL
  return v?.trim() || undefined
}

export function getSupabaseAnonKey(): string | undefined {
  const v = import.meta.env.VITE_SUPABASE_ANON_KEY
  return v?.trim() || undefined
}

export function getCompetitionId(): string | undefined {
  const v = import.meta.env.VITE_COMPETITION_ID
  return v?.trim() || undefined
}

export function isConfigComplete(): boolean {
  return !!(getSupabaseUrl() && getSupabaseAnonKey() && getCompetitionId())
}
