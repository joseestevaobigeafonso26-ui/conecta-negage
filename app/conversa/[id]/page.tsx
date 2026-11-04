import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { sendMessage } from '../../actions'
import { STATUS } from '@/lib/constants'
import { fmt } from '@/lib/utils'

export default async function Conversa({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string } }) {
  const { supabase, user, profile } = await getSession()
  if (!user) redirect('/entrar')
  const { data: app } = await supabase.from('applications')
    .select('id, status, interview_at, note, candidate_id, jobs(title, companies(name)), candidates(profiles(full_name))')
    .eq('id', params.id).maybeSingle()
  if (!app) notFound()   // quem não participa na candidatura não a consegue ler (regras da base de dados)

  const isCandidate = app.candidate_id === user.id
  const { data: msgs } = await supabase.from('messages').select('id, sender_id, body, created_at')
    .eq('application_id', app.id).order('created_at', { ascending: false }).limit(100)
  const list = (msgs ?? []).reverse()
  const job: any = app.jobs
  const other = isCandidate ? (job?.companies?.name ?? 'Empresa') : ((app as any).candidates?.profiles?.full_name ?? 'Candidato')
  const back = profile?.role === 'company' ? '/empresa' : '/candidato'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-brand-blue font-medium mb-4"><ArrowLeft size={14} />Voltar ao painel</Link>
      <div className="card mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold">{other}</h1>
            <p className="text-sm text-slate-600">Candidatura: {job?.title}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS[app.status].cls}`}>{STATUS[app.status].label}</span>
        </div>
        {app.status === 'interview' && app.interview_at && <p className="text-sm text-blue-700 mt-3">Entrevista: {fmt(app.interview_at)}{app.note ? ` — ${app.note}` : ''}</p>}
      </div>

      <div className="card space-y-3 min-h-[12rem]">
        {!list.length && <p className="text-sm text-slate-500 text-center py-8">Ainda não há mensagens. Escreva a primeira.</p>}
        {list.map((m: any) => {
          const mine = m.sender_id === user.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${mine ? 'bg-brand-blue text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                {m.body}
                <p className={`text-[10px] mt-1 ${mine ? 'text-blue-200' : 'text-slate-400'}`}>{fmt(m.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {searchParams.erro && <p className="text-sm text-red-600 mt-3">{searchParams.erro === 'rapido' ? 'Está a enviar mensagens depressa demais. Aguarde um momento.' : 'Não foi possível enviar a mensagem. Tente novamente.'}</p>}
      <form key={list.length} action={sendMessage.bind(null, app.id)} className="mt-4 flex gap-2 items-end">
        <textarea name="body" rows={2} maxLength={1000} required placeholder="Escreva a sua mensagem..." className="input resize-none" />
        <button className="btn-green">Enviar</button>
      </form>
      <Link href={`/conversa/${app.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-3 hover:text-brand-blue"><RefreshCw size={12} />Ver novas mensagens</Link>
    </div>
  )
}
