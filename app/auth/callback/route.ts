import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Recebe a ligação enviada por e-mail, troca o código por uma sessão e segue para a página pedida.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/'   // evita redireccionamento para outros sites
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safe, url.origin))
  }
  return NextResponse.redirect(new URL('/entrar?erro=link', url.origin))
}
