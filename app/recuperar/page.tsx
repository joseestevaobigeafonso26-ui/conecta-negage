import Link from 'next/link'
import { requestReset } from '../actions'
export default function Recuperar({ searchParams }: { searchParams: { ok?: string; erro?: string } }) {
  return (
    <div className="max-w-sm mx-auto px-4 py-14">
      <h1 className="text-2xl font-extrabold mb-1">Recuperar palavra-passe</h1>
      <p className="text-sm text-slate-600 mb-6">Indique o e-mail da sua conta e enviamos uma ligação para criar uma palavra-passe nova.</p>
      {searchParams.ok && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">Se existir uma conta com esse e-mail, enviámos a ligação. Verifique também a pasta de spam.</p>}
      {searchParams.erro && <p className="text-sm text-red-600 mb-4">Não foi possível enviar agora. Tente novamente daqui a pouco.</p>}
      <form action={requestReset} className="card space-y-3">
        <div><label className="label">E-mail</label><input name="email" type="email" required autoComplete="email" className="input" /></div>
        <button className="btn w-full">Enviar ligação</button>
      </form>
      <p className="text-sm mt-4"><Link className="text-brand-blue font-semibold" href="/entrar">← Voltar a entrar</Link></p>
    </div>
  )
}
