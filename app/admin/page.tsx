import Notifications from '../components/Notifications'
import { requireRole } from '@/lib/auth'
import { setCompanyStatus, setJobStatus, resetPassword } from '../actions'
import { fmt } from '@/lib/utils'

export default async function Admin({ searchParams }: { searchParams: { q?: string; ok?: string; erro?: string } }) {
  const { supabase, user } = await requireRole('admin')
  const { data: notes } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(8)
  const { data: st } = await supabase.rpc('public_stats')
  const { data: companies } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
  const { data: jobs } = await supabase.from('jobs').select('*, companies(name)').order('created_at', { ascending: false }).limit(30)
  let uq = supabase.from('profiles').select('id, full_name, phone, email, role').neq('role', 'admin').order('created_at', { ascending: false }).limit(20)
  if (searchParams.q) uq = uq.or(`full_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%,phone.ilike.%${searchParams.q}%`)
  const { data: users } = await uq
  const stats = [['Candidatos', st?.candidates], ['Vagas abertas', st?.jobs], ['Empresas aprovadas', st?.companies], ['Contratados', st?.hired]]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-extrabold">Administração</h1>
      <Notifications notes={notes ?? []} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(([l, v]) => <div key={l as string} className="card"><p className="text-3xl font-black text-brand-blue">{v ?? 0}</p><p className="text-xs text-slate-500">{l}</p></div>)}
      </div>

      <section className="card">
        <h2 className="font-bold mb-3">Empresas</h2>
        <ul className="divide-y divide-slate-100">
          {companies?.map((c: any) => (
            <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{c.name}</p><p className="text-xs text-slate-500">{c.sector} · {c.phone} · {fmt(c.created_at)} · <b>{c.status}</b></p></div>
              <div className="flex gap-2">
                {c.status !== 'approved' && <form action={setCompanyStatus.bind(null, c.id, 'approved')}><button className="btn-green">Aprovar</button></form>}
                {c.status !== 'suspended' && <form action={setCompanyStatus.bind(null, c.id, 'suspended')}><button className="btn-ghost">Suspender</button></form>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-bold mb-3">Utilizadores e recuperação de conta</h2>
        {searchParams.ok && <p className="text-sm text-emerald-700 mb-2">Palavra-passe redefinida. Entregue-a ao utilizador.</p>}
        {searchParams.erro && <p className="text-sm text-red-600 mb-2">Não foi possível redefinir (mínimo 6 caracteres).</p>}
        <form className="flex gap-2 mb-3"><input name="q" defaultValue={searchParams.q} placeholder="Procurar por nome, e-mail ou telefone" className="input" /><button className="btn">Procurar</button></form>
        <ul className="divide-y divide-slate-100">
          {users?.map((u: any) => (
            <li key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold text-sm">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ''} · {u.role === 'company' ? 'empresa' : 'candidato'}</p></div>
              <form action={resetPassword.bind(null, u.id)} className="flex gap-2">
                <input name="password" minLength={6} required placeholder="Nova palavra-passe" className="input w-44 py-1.5" />
                <button className="btn-ghost">Redefinir</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-bold mb-3">Vagas recentes</h2>
        <ul className="divide-y divide-slate-100">
          {jobs?.map((j: any) => (
            <li key={j.id} className="py-3 flex items-center justify-between gap-2">
              <div><p className="font-semibold">{j.title}</p><p className="text-xs text-slate-500">{j.companies?.name} · {j.status}</p></div>
              <form action={setJobStatus.bind(null, j.id, j.status === 'hidden' ? 'open' : 'hidden')}><button className="btn-ghost">{j.status === 'hidden' ? 'Repor' : 'Ocultar'}</button></form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
