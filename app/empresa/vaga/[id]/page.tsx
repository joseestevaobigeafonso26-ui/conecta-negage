import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { updateJob } from '../../../actions'
import { CATEGORIES, TYPES } from '@/lib/constants'

export default async function EditarVaga({ params }: { params: { id: string } }) {
  const { supabase } = await requireRole('company')
  const { data: j } = await supabase.from('jobs').select('*').eq('id', params.id).maybeSingle()
  if (!j) notFound()
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/empresa" className="text-sm text-brand-blue">← Voltar ao painel</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-5">Editar vaga</h1>
      <form action={updateJob.bind(null, j.id)} className="card grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Título</label><input name="title" defaultValue={j.title} required className="input" /></div>
        <div><label className="label">Área</label><select name="category" defaultValue={j.category ?? ''} className="input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">Tipo</label><select name="type" defaultValue={j.type ?? ''} className="input">{TYPES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">Local</label><input name="location" defaultValue={j.location ?? ''} className="input" /></div>
        <div><label className="label">Salário</label><input name="salary" defaultValue={j.salary ?? ''} className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Descrição</label><textarea name="description" rows={4} defaultValue={j.description ?? ''} required className="input" /></div>
        <div><label className="label">Requisitos (um por linha)</label><textarea name="requirements" rows={4} defaultValue={(j.requirements ?? []).join('\n')} className="input" /></div>
        <div><label className="label">Benefícios (um por linha)</label><textarea name="benefits" rows={4} defaultValue={(j.benefits ?? []).join('\n')} className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Etiquetas (separadas por vírgula, até 5)</label><input name="tags" defaultValue={(j.tags ?? []).join(', ')} className="input" /></div>
        <button className="btn-green sm:col-span-2">Guardar alterações</button>
      </form>
    </div>
  )
}
