import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { updateCompany } from '../../actions'
import { SECTORS } from '@/lib/constants'

export default async function PerfilEmpresa({ searchParams }: { searchParams: { ok?: string; erro?: string } }) {
  const { supabase, user, profile } = await requireRole('company')
  const { data: c } = await supabase.from('companies').select('*').eq('owner_id', user!.id).single()
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/empresa" className="text-sm text-brand-blue">← Voltar ao painel</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-1">Perfil da empresa</h1>
      <p className="text-sm text-slate-600 mb-5">Estas informações aparecem aos candidatos nas suas vagas.</p>
      {searchParams.ok && <p className="text-sm text-emerald-700 mb-3">Perfil actualizado.</p>}
      {searchParams.erro && <p className="text-sm text-red-600 mb-3">{searchParams.erro === 'tel' ? 'Telefone inválido. Use o formato 9XX XXX XXX ou deixe em branco.' : 'Não foi possível guardar.'}</p>}
      <form action={updateCompany} className="card grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome da empresa</label><input name="name" defaultValue={c?.name} required className="input" /></div>
        <div><label className="label">Sector</label><select name="sector" defaultValue={c?.sector ?? ''} className="input">{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label">Bairro / endereço</label><input name="address" defaultValue={c?.address ?? ''} placeholder="Ex: Bairro Popular, junto ao mercado" className="input" /></div>
        <div><label className="label">Responsável</label><input name="full_name" defaultValue={profile.full_name} required className="input" /></div>
        <div><label className="label">Telefone / WhatsApp (opcional)</label><input name="phone" defaultValue={c?.phone ?? ''} inputMode="tel" placeholder="9XX XXX XXX" className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Sobre a empresa</label><textarea name="description" rows={4} defaultValue={c?.description ?? ''} placeholder="O que faz a sua empresa e porque é um bom lugar para começar." className="input" /></div>
        <button className="btn-green sm:col-span-2">Guardar alterações</button>
      </form>
    </div>
  )
}
