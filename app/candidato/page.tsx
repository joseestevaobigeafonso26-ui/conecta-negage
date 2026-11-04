import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { uploadProfile, markRead, updateAccount, withdrawApplication } from '../actions'
import { STATUS } from '@/lib/constants'
import { fmt } from '@/lib/utils'

export default async function Candidato({ searchParams }: { searchParams: { erro?: string; ok?: string } }) {
  const { supabase, user, profile } = await requireRole('candidate')
  const [{ data: me }, { data: apps }, { data: notes }] = await Promise.all([
    supabase.from('candidates').select('*').eq('id', user!.id).single(),
    supabase.from('applications').select('*, jobs(id, title, companies(name))').eq('candidate_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
  ])
  const unread = notes?.filter((n: any) => !n.read).length ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold">Olá, {profile.full_name}</h1>
        {!(me?.area && me?.cv_path) && <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4">Complete o seu perfil (área de estudo e currículo em PDF) para poder candidatar-se às vagas.</div>}
        <p className="text-xs"><Link href="/nova-senha" className="text-brand-blue font-semibold">Alterar palavra-passe</Link></p>
        <section className="card">
          <h2 className="font-bold mb-3">As minhas candidaturas</h2>
          {!apps?.length && <p className="text-sm text-slate-500">Ainda não se candidatou. <Link href="/" className="text-brand-blue font-semibold">Ver vagas</Link></p>}
          <ul className="divide-y divide-slate-100">
            {apps?.map((a: any) => (
              <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <Link href={`/vagas/${a.jobs.id}`} className="font-semibold hover:text-brand-blue">{a.jobs.title}</Link>
                  <p className="text-xs text-slate-500">{a.jobs.companies?.name} · enviada a {fmt(a.created_at)}</p>
                  {a.status === 'interview' && a.interview_at && <p className="text-xs text-blue-700 mt-1">Entrevista: {fmt(a.interview_at)}{a.note ? ` — ${a.note}` : ''}</p>}
                  {a.status !== 'interview' && a.note && <p className="text-xs text-slate-600 mt-1">Nota da empresa: {a.note}</p>}
                </div>
                <div className="flex flex-col items-end gap-2"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span><Link href={`/conversa/${a.id}`} className="btn-ghost">Mensagens</Link>
                  {['submitted', 'in_review'].includes(a.status) && (
                    <details className="text-right">
                      <summary className="text-xs text-red-600 font-semibold cursor-pointer list-none">Retirar</summary>
                      <form action={withdrawApplication.bind(null, a.id)} className="mt-1"><button className="text-xs bg-red-600 text-white rounded-lg px-2.5 py-1.5">Confirmar retirada</button></form>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="font-bold mb-3">Dados pessoais</h2>
          {searchParams.ok === 'dados' && <p className="text-sm text-emerald-700 mb-2">Dados guardados.</p>}
          {searchParams.erro === 'tel' && <p className="text-sm text-red-600 mb-2">Telefone inválido. Use 9XX XXX XXX ou deixe em branco.</p>}
          <form action={updateAccount} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div><label className="label">Nome completo</label><input name="full_name" defaultValue={profile.full_name} required className="input" /></div>
            <div><label className="label">Telefone / WhatsApp (opcional)</label><input name="phone" defaultValue={profile.phone ?? ''} inputMode="tel" placeholder="9XX XXX XXX" className="input" /></div>
            <button className="btn">Guardar</button>
          </form>
          <p className="text-xs text-slate-500 mt-2">E-mail da conta: {profile.email}</p>
        </section>

        <section className="card">
          <h2 className="font-bold mb-3">O meu perfil e currículo</h2>
          {searchParams.erro && <p className="text-sm text-red-600 mb-2">O currículo deve ser um PDF até 3 MB.</p>}
          <form action={uploadProfile} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Área de estudo</label><input name="area" defaultValue={me?.area ?? ''} required className="input" /></div>
              <div><label className="label">Formação</label><input name="education" defaultValue={me?.education ?? ''} placeholder="Ex: Ensino Médio concluído" className="input" /></div>
            </div>
            <div><label className="label">Currículo (PDF) {me?.cv_path && <span className="text-emerald-600">— já carregado</span>}</label><input name="cv" type="file" accept="application/pdf" required={!me?.cv_path} className="input" /></div>
            <button className="btn">Guardar</button>
          </form>
        </section>
      </div>

      <aside className="card h-fit">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Notificações {unread > 0 && <span className="ml-1 bg-brand-emerald text-white text-xs rounded-full px-2 py-0.5">{unread}</span>}</h2>
          {unread > 0 && <form action={markRead}><button className="text-xs text-brand-blue">Marcar lidas</button></form>}
        </div>
        <ul className="space-y-3">
          {notes?.map((n: any) => (
            <li key={n.id} className={`text-sm ${n.read ? 'text-slate-500' : 'text-slate-900'}`}>
              <p className="font-semibold">{n.title}</p><p>{n.body}</p><p className="text-[11px] text-slate-400">{fmt(n.created_at)}</p>{n.link && <Link href={n.link} className="text-xs text-brand-blue font-semibold">Abrir</Link>}
            </li>
          ))}
          {!notes?.length && <p className="text-sm text-slate-500">Sem notificações.</p>}
        </ul>
      </aside>
    </div>
  )
}
