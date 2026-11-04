import Link from 'next/link'
import Notifications from '../components/Notifications'
import { requireRole } from '@/lib/auth'
import { createJob, setJobStatus, updateApplication, markRead } from '../actions'
import { CATEGORIES, TYPES, STATUS } from '@/lib/constants'
import { wa, fmt } from '@/lib/utils'

export default async function Empresa() {
  const { supabase, user, profile } = await requireRole('company')
  const { data: company } = await supabase.from('companies').select('*').eq('owner_id', user!.id).single()

  if (company?.status !== 'approved') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold mb-2">{company?.status === 'suspended' ? 'Conta suspensa' : 'Conta em análise'}</h1>
        <Link href="/empresa/perfil" className="btn-ghost mb-4">Editar perfil</Link>
        <p className="text-slate-600">{company?.status === 'suspended' ? 'Contacte a equipa do Conecta Negage.' : 'A nossa equipa está a validar a sua empresa. Receberá acesso para publicar vagas assim que for aprovada.'}</p>
      </div>
    )
  }

  const { data: notes } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(8)
  const { data: jobs } = await supabase.from('jobs').select('*').eq('company_id', company.id).order('created_at', { ascending: false })
  const { data: apps } = await supabase.from('applications')
    .select('*, candidates(area, education, cv_path, profiles(full_name, phone, email))')
    .in('job_id', (jobs ?? []).map((j: any) => j.id)).order('created_at', { ascending: false })
  const cvUrls: Record<string, string> = {}
  await Promise.all((apps ?? []).map(async (a: any) => {
    const p = a.candidates?.cv_path
    if (p) { const { data } = await supabase.storage.from('cvs').createSignedUrl(p, 600); if (data) cvUrls[a.id] = data.signedUrl }
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">{company.name}</h1><Link href="/empresa/perfil" className="btn-ghost">Editar perfil</Link></div>

      <Notifications notes={notes ?? []} />

      <details className="card">
        <summary className="font-bold cursor-pointer">+ Publicar nova vaga</summary>
        <form action={createJob} className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="sm:col-span-2"><label className="label">Título</label><input name="title" required className="input" /></div>
          <div><label className="label">Área</label><select name="category" className="input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Tipo</label><select name="type" className="input">{TYPES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Local</label><input name="location" placeholder="Negage" className="input" /></div>
          <div><label className="label">Salário</label><input name="salary" placeholder="A combinar" className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Descrição</label><textarea name="description" rows={3} required className="input" /></div>
          <div><label className="label">Requisitos (um por linha)</label><textarea name="requirements" rows={3} className="input" /></div>
          <div><label className="label">Benefícios (um por linha)</label><textarea name="benefits" rows={3} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Etiquetas (separadas por vírgula, até 5)</label><input name="tags" placeholder="Excel, Atendimento, Inglês" className="input" /></div>
          <button className="btn-green sm:col-span-2">Publicar vaga</button>
        </form>
      </details>

      {jobs?.map((j: any) => {
        const list = (apps ?? []).filter((a: any) => a.job_id === j.id)
        return (
          <section key={j.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{j.title} <span className="text-xs font-normal text-slate-500">({list.length} candidaturas · {j.status === 'open' ? 'aberta' : j.status === 'closed' ? 'fechada' : 'oculta pelo admin'})</span></h2>
              <div className="flex gap-2"><Link href={`/empresa/vaga/${j.id}`} className="btn-ghost">Editar</Link>{j.status !== 'hidden' && <form action={setJobStatus.bind(null, j.id, j.status === 'open' ? 'closed' : 'open')}><button className="btn-ghost">{j.status === 'open' ? 'Fechar vaga' : 'Reabrir'}</button></form>}</div>
            </div>
            {list.map((a: any) => {
              const p = a.candidates?.profiles
              const link = wa(p?.phone, `Olá ${p?.full_name}, sou da ${company.name} (Conecta Negage) sobre a sua candidatura à vaga "${j.title}".`)
              return (
                <div key={a.id} className="card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p?.full_name} <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span></p>
                      <p className="text-xs text-slate-500">{[a.candidates?.area, a.candidates?.education, p?.email, p?.phone].filter(Boolean).join(' · ')}</p>
                      {a.message && <p className="text-sm text-slate-700 mt-1">“{a.message}”</p>}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/conversa/${a.id}`} className="btn-ghost">Mensagens</Link>
                      {cvUrls[a.id] && <a href={cvUrls[a.id]} target="_blank" className="btn-ghost">Ver CV</a>}
                      {p?.email && <a href={`mailto:${p.email}?subject=${encodeURIComponent('Candidatura: ' + j.title)}`} className="btn-ghost">E-mail</a>}
                      {link && <a href={link} target="_blank" className="btn-ghost text-emerald-700">WhatsApp</a>}
                    </div>
                  </div>
                  <form action={updateApplication.bind(null, a.id)} className="grid sm:grid-cols-[auto_auto_1fr_auto] gap-2 items-end">
                    <select name="status" defaultValue={a.status} className="input">{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                    <input name="interview_at" type="datetime-local" defaultValue={a.interview_at ? new Date(a.interview_at).toISOString().slice(0, 16) : ''} className="input" />
                    <input name="note" defaultValue={a.note ?? ''} placeholder="Local da entrevista / nota ao candidato" className="input" />
                    <button className="btn">Guardar</button>
                  </form>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
