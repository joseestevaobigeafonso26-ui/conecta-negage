import Link from 'next/link'
import { signUp } from '../actions'
import { SECTORS } from '@/lib/constants'
export default function Registar({ searchParams }: { searchParams: { tipo?: string; erro?: string } }) {
  const empresa = searchParams.tipo === 'empresa'
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="flex gap-2 mb-6">
        <Link href="/registar?tipo=candidato" className={empresa ? 'btn-ghost' : 'btn'}>Sou candidato</Link>
        <Link href="/registar?tipo=empresa" className={empresa ? 'btn' : 'btn-ghost'}>Sou empresa</Link>
      </div>
      <h1 className="text-2xl font-extrabold mb-1">{empresa ? 'Registar a minha empresa' : 'Criar perfil de candidato'}</h1>
      {empresa && <p className="text-sm text-slate-600 mb-4">A conta é analisada pela nossa equipa antes de poder publicar vagas.</p>}
      {searchParams.erro && <p className="text-sm text-red-600 my-3">{searchParams.erro}</p>}
      <form action={signUp} className="card space-y-3 mt-4">
        <input type="hidden" name="role" value={empresa ? 'company' : 'candidate'} />
        {empresa && <>
          <div><label className="label">Nome da empresa</label><input name="company_name" required className="input" /></div>
          <div><label className="label">Sector</label><select name="sector" className="input">{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></div>
        </>}
        <div><label className="label">{empresa ? 'Nome do responsável' : 'Nome completo'}</label><input name="full_name" required className="input" /></div>
        <div><label className="label">E-mail</label><input name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label">Telefone / WhatsApp (opcional)</label><input name="phone" inputMode="tel" placeholder="9XX XXX XXX" className="input" /></div>
        <div><label className="label">Palavra-passe (mín. 6)</label><input name="password" type="password" minLength={6} required className="input" /></div>
        <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" name="terms" required className="mt-0.5" /><span>Li e aceito os <Link href="/termos" target="_blank" className="text-brand-blue font-semibold">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="text-brand-blue font-semibold">Política de Privacidade</Link>.</span></label>
        <button className="btn-green w-full">Criar conta</button>
      </form>
    </div>
  )
}
