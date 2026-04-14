import { supabase } from './supabase'

export async function ensureAnonymousSession(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.user) return data.session.user.id

  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error || !signed.user) {
    throw error ?? new Error('Failed to create anonymous session')
  }
  return signed.user.id
}
