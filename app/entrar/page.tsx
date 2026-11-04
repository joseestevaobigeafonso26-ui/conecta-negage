import Link from 'next/link'
import { signIn } from '../actions'
export default function Entrar({ searchParams }: { searchParams: { erro?: string; msg?: string } }) {
  return (
    <div className="max-w-sm mx-auto px-4 py-14">
      <h1 className="text-2xl font-extrabold mb-1">Entrar</h1>
      <p className="text-sm text-slate-600 mb-6">Use o e-mail e a palavra-passe da sua conta.</p>
      {searchParams.msg && <p className="text-sm text-emerald-700 mb-4">Conta criada. Confirme o seu e-mail e depois entre.</p>}
      {searchParams.erro === 'link' && <p className="text-sm text-red-600 mb-4">Esta ligação é inválida ou já expirou. Peça uma nova.</p>}
      {searchParams.erro === '1' && <p className="text-sm text-red-600 mb-4">E-mail ou palavra-passe incorrectos.</p>}
      <form action={signIn} className="card space-y-3">
        <div><label className="label">E-mail</label><input name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label">Palavra-passe</label><input name="password" type="password" required autoComplete="current-password" className="input" /></div>
        <button className="btn w-full">Entrar</button>
      </form>
      <p className="text-sm mt-4"><Link className="text-brand-blue font-semibold" href="/recuperar">Esqueci a palavra-passe</Link></p>
      <p className="text-sm text-slate-600 mt-2">Ainda não tem conta? <Link className="text-brand-blue font-semibold" href="/registar?tipo=candidato">Sou candidato</Link> · <Link className="text-brand-blue font-semibold" href="/registar?tipo=empresa">Sou empresa</Link></p>
    </div>
  )
}
