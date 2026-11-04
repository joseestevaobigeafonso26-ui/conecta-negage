import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { ArrowLeft, MapPin, Clock, Building2, CheckCircle2, Send, Share2 } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { applyToJob } from '../../actions'
import { STATUS, TYPE_CLS } from '@/lib/constants'
import { ago } from '@/lib/utils'

export default async function JobPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string> }) {
  const { supabase, user, profile } = await getSession()
  const { data: job } = await supabase.from('jobs').select('*, companies(name, sector, description, address)').eq('id', params.id).single()
  if (!job) notFound()
  const { data: app } = user && profile?.role === 'candidate'
    ? await supabase.from('applications').select('status').eq('job_id', job.id).eq('candidate_id', user.id).maybeSingle()
    : { data: null }
  const { data: me } = user && profile?.role === 'candidate'
    ? await supabase.from('candidates').select('area, cv_path').eq('id', user.id).maybeSingle()
    : { data: null }
  const complete = !!(me?.cv_path && me?.area)
  const host = headers().get('host') ?? 'localhost:3000'
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`
  const share = `https://wa.me/?text=${encodeURIComponent(`${job.title} — ${job.companies?.name}, Negage. Veja a vaga: ${site}/vagas/${job.id}`)}`
  const co = job.companies

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-5">
        <Link href="/#vagas" className="inline-flex items-center gap-1.5 text-sm text-brand-blue font-medium"><ArrowLeft size={14} />Voltar às vagas</Link>
        <a href={share} target="_blank" rel="noopener" className="btn-ghost gap-1.5"><Share2 size={13} />Partilhar no WhatsApp</a>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] items-start">
        <div className="space-y-6">
          <div className="card space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center font-bold text-xl text-brand-blue">{co?.name?.[0]}</div>
              <div className="flex-1">
                <h1 className="text-2xl font-extrabold text-slate-900">{job.title}</h1>
                <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mt-0.5"><Building2 size={14} className="text-slate-400" />{co?.name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${TYPE_CLS[job.type] ?? ''}`}>{job.type}</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><MapPin size={13} className="text-brand-emerald" />{job.location}</span>
              <span className="flex items-center gap-1"><Clock size={13} />{ago(job.created_at)}</span>
              <span className="font-semibold text-brand-green">{job.salary}</span>
            </div>
            {!!job.tags?.length && <div className="flex flex-wrap gap-1.5">{job.tags.map((t: string) => <span key={t} className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-md font-medium">{t}</span>)}</div>}
            <p className="text-slate-700 leading-relaxed">{job.description}</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {!!job.requirements?.length && <div><h3 className="font-bold text-sm text-slate-900 mb-2">Requisitos</h3><ul className="space-y-1.5 text-sm text-slate-600">{job.requirements.map((r: string) => <li key={r} className="flex gap-2"><CheckCircle2 size={15} className="text-brand-emerald mt-0.5 shrink-0" />{r}</li>)}</ul></div>}
              {!!job.benefits?.length && <div><h3 className="font-bold text-sm text-slate-900 mb-2">Benefícios</h3><ul className="space-y-1.5 text-sm text-slate-600">{job.benefits.map((r: string) => <li key={r} className="flex gap-2"><CheckCircle2 size={15} className="text-brand-amber mt-0.5 shrink-0" />{r}</li>)}</ul></div>}
            </div>
          </div>
          {(co?.description || co?.address) && (
            <div className="card">
              <h2 className="font-bold mb-2">Sobre {co.name}</h2>
              {co.description && <p className="text-sm text-slate-600 leading-relaxed">{co.description}</p>}
              {co.address && <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5"><MapPin size={13} className="text-brand-emerald" />{co.address}</p>}
            </div>
          )}
        </div>

        <aside className="card bg-blue-50/60 border-blue-100 lg:sticky lg:top-24">
          <h2 className="font-bold text-brand-blue mb-3 flex items-center gap-2"><Send size={16} />Candidatura</h2>
          {searchParams.ok && <p className="text-emerald-700 font-semibold text-sm mb-3">Candidatura enviada! Acompanhe o estado no seu painel.</p>}
          {searchParams.erro && <p className="text-red-600 mb-3 text-sm">Não foi possível enviar. Tente novamente.</p>}
          {!user ? (
            <p className="text-sm text-slate-700">Para se candidatar, <Link href="/entrar" className="text-brand-blue font-semibold">entre</Link> ou <Link href="/registar?tipo=candidato" className="text-brand-blue font-semibold">crie a sua conta</Link> com o seu e-mail.</p>
          ) : profile?.role !== 'candidate' ? (
            <p className="text-sm text-slate-600">Só contas de candidato se podem candidatar.</p>
          ) : app ? (
            <p className="text-sm">Já se candidatou. Estado: <span className={`ml-1 px-2 py-1 rounded-full text-xs font-semibold ${STATUS[app.status].cls}`}>{STATUS[app.status].label}</span></p>
          ) : job.status !== 'open' ? (
            <p className="text-sm text-slate-600">Esta vaga já está fechada.</p>
          ) : !complete ? (
            <div className="space-y-3">
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">Para se candidatar, complete primeiro o seu perfil: área de estudo e currículo em PDF.</p>
              <Link href="/candidato" className="btn w-full">Completar o meu perfil</Link>
            </div>
          ) : (
            <form action={applyToJob.bind(null, job.id)} className="space-y-3">
              <p className="text-xs text-slate-600">Será enviado o seu perfil e currículo. Pode acrescentar uma mensagem.</p>
              <textarea name="message" rows={4} className="input" placeholder="Porque se interessa por esta vaga? (opcional)" />
              <button className="btn-green w-full">Enviar candidatura</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  )
}
