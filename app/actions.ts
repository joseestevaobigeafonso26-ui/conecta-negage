'use server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { HOME } from '@/lib/constants'
import { normPhone } from '@/lib/phone'
import { adminClient } from '@/lib/supabase/admin'
import { ptError } from '@/lib/utils'

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean)
const enc = encodeURIComponent

export async function signUp(f: FormData) {
  const supabase = createClient()
  const role = s(f, 'role') === 'company' ? 'company' : 'candidate'
  const back = `/registar?tipo=${role === 'company' ? 'empresa' : 'candidato'}`
  if (s(f, 'terms') !== 'on') redirect(`${back}&erro=${enc('Tem de aceitar os Termos de Uso e a Política de Privacidade.')}`)
  const raw = s(f, 'phone')
  const phone = raw ? normPhone(raw) : ''
  if (raw && !phone) redirect(`${back}&erro=${enc('Telefone inválido. Use o formato 9XX XXX XXX ou deixe em branco.')}`)
  const { data, error } = await supabase.auth.signUp({
    email: s(f, 'email').toLowerCase(), password: s(f, 'password'),
    options: { data: { role, full_name: s(f, 'full_name'), phone, company_name: s(f, 'company_name'), sector: s(f, 'sector') } },
  })
  if (error) redirect(`${back}&erro=${enc(/registered|exists/i.test(error.message) ? 'Este e-mail já tem uma conta. Faça login.' : ptError(error.message))}`)
  redirect(data.session ? HOME[role] : '/entrar?msg=confirme')
}
export async function signIn(f: FormData) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email: s(f, 'email').toLowerCase(), password: s(f, 'password') })
  if (error || !data.user) redirect('/entrar?erro=1')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  redirect(HOME[p?.role ?? 'candidate'])
}
export async function signOut() {
  await createClient().auth.signOut()
  redirect('/')
}

export async function applyToJob(jobId: string, f: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/entrar`)
  const { data: me } = await supabase.from('candidates').select('area, cv_path').eq('id', user.id).maybeSingle()
  if (!me?.cv_path || !me?.area) redirect(`/vagas/${jobId}?perfil=1`)
  const { error } = await supabase.from('applications').insert({ job_id: jobId, candidate_id: user.id, message: s(f, 'message') })
  redirect(`/vagas/${jobId}?${error ? (error.code === '23505' ? 'dup=1' : 'erro=1') : 'ok=1'}`)
}
export async function uploadProfile(f: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  const patch: any = { area: s(f, 'area'), education: s(f, 'education') }
  const file = f.get('cv') as File | null
  if (file && file.size > 0) {
    if (file.type !== 'application/pdf' || file.size > 3_000_000) redirect('/candidato?erro=cv')
    const path = `${user.id}/cv.pdf`
    const { error } = await supabase.storage.from('cvs').upload(path, file, { upsert: true, contentType: 'application/pdf' })
    if (error) redirect('/candidato?erro=cv')
    patch.cv_path = path
  }
  await supabase.from('candidates').update(patch).eq('id', user.id)
  revalidatePath('/candidato')
}
export async function markRead() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
  revalidatePath('/candidato'); revalidatePath('/empresa'); revalidatePath('/admin')
}

export async function createJob(f: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  const { data: c } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
  if (!c) redirect('/')
  await supabase.from('jobs').insert({
    company_id: c.id, title: s(f, 'title'), category: s(f, 'category'), type: s(f, 'type'),
    location: s(f, 'location') || 'Negage', salary: s(f, 'salary') || 'A combinar', description: s(f, 'description'),
    requirements: lines(s(f, 'requirements')), benefits: lines(s(f, 'benefits')),
    tags: s(f, 'tags').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5),
  })
  revalidatePath('/empresa'); revalidatePath('/')
}
export async function setJobStatus(id: string, status: string) {
  await createClient().from('jobs').update({ status }).eq('id', id)
  revalidatePath('/empresa'); revalidatePath('/admin'); revalidatePath('/')
}
export async function updateApplication(id: string, f: FormData) {
  const at = s(f, 'interview_at')
  await createClient().from('applications').update({
    status: s(f, 'status'), interview_at: at ? new Date(at).toISOString() : null, note: s(f, 'note') || null,
  }).eq('id', id)
  revalidatePath('/empresa')
}
export async function setCompanyStatus(id: string, status: string) {
  await createClient().from('companies').update({ status }).eq('id', id)
  revalidatePath('/admin')
}

export async function updateCompany(f: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  const raw = s(f, 'phone')
  const phone = raw ? normPhone(raw) : null
  if (raw && !phone) redirect('/empresa/perfil?erro=tel')
  const { error } = await supabase.from('companies').update({
    name: s(f, 'name'), sector: s(f, 'sector'), phone, description: s(f, 'description') || null, address: s(f, 'address') || null,
  }).eq('owner_id', user.id)
  await supabase.from('profiles').update({ full_name: s(f, 'full_name'), phone }).eq('id', user.id)
  revalidatePath('/empresa'); revalidatePath('/')
  redirect(`/empresa/perfil?${error ? 'erro=1' : 'ok=1'}`)
}

// Recuperação de conta sem SMS/e-mail: o admin define uma palavra-passe nova e entrega-a ao utilizador.
export async function resetPassword(userId: string, f: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/')
  const pw = s(f, 'password')
  if (pw.length < 6) redirect('/admin?erro=pw')
  const { error } = await adminClient().auth.admin.updateUserById(userId, { password: pw })
  redirect(`/admin?${error ? 'erro=pw' : 'ok=pw'}`)
}

// Recuperação de palavra-passe por e-mail
export async function requestReset(f: FormData) {
  const supabase = createClient()
  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(s(f, 'email').toLowerCase(), { redirectTo: `${origin}/auth/callback?next=/nova-senha` })
  redirect(error ? '/recuperar?erro=1' : '/recuperar?ok=1')
}
export async function setNewPassword(f: FormData) {
  const pw = s(f, 'password')
  if (pw.length < 6) redirect('/nova-senha?erro=curta')
  if (pw !== s(f, 'confirm')) redirect('/nova-senha?erro=diferente')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?erro=link')
  const { error } = await supabase.auth.updateUser({ password: pw })
  if (error) redirect('/nova-senha?erro=1')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  redirect(HOME[p?.role ?? 'candidate'])
}

export async function sendMessage(appId: string, f: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  const body = s(f, 'body').slice(0, 1000)
  if (!body) return
  const { error } = await supabase.from('messages').insert({ application_id: appId, sender_id: user.id, body })
  if (error) redirect(`/conversa/${appId}?erro=${/depressa/i.test(error.message) ? 'rapido' : '1'}`)
  revalidatePath(`/conversa/${appId}`)
}

export async function updateAccount(f: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  const raw = s(f, 'phone')
  const phone = raw ? normPhone(raw) : null
  if (raw && !phone) redirect('/candidato?erro=tel')
  const { error } = await supabase.from('profiles').update({ full_name: s(f, 'full_name'), phone }).eq('id', user.id)
  revalidatePath('/candidato')
  redirect(`/candidato?${error ? 'erro=1' : 'ok=dados'}`)
}
export async function withdrawApplication(id: string) {
  await createClient().from('applications').delete().eq('id', id)
  revalidatePath('/candidato')
}
export async function updateJob(id: string, f: FormData) {
  const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean)
  await createClient().from('jobs').update({
    title: s(f, 'title'), category: s(f, 'category'), type: s(f, 'type'), location: s(f, 'location') || 'Negage',
    salary: s(f, 'salary') || 'A combinar', description: s(f, 'description'),
    requirements: lines(s(f, 'requirements')), benefits: lines(s(f, 'benefits')),
    tags: s(f, 'tags').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5),
  }).eq('id', id)
  revalidatePath('/empresa'); revalidatePath('/'); revalidatePath(`/vagas/${id}`)
  redirect('/empresa')
}
