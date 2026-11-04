import { createClient } from '@supabase/supabase-js'
// Só para uso em server actions, depois de confirmar que quem chama é administrador.
export const adminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
