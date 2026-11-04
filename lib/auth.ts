import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export const getSession = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null as any }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return { supabase, user, profile: profile as any }
})
export async function requireRole(role: 'candidate' | 'company' | 'admin') {
  const s = await getSession()
  if (!s.user) redirect('/entrar')
  if (s.profile?.role !== role) redirect('/')
  return s
}
