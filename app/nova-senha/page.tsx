import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { setNewPassword } from '../actions'
const MSG: Record<string, string> = { curta: 'A palavra-passe deve ter pelo menos 6 caracteres.', diferente: 'As duas palavras-passe não coincidem.', '1': 'Não foi possível guardar. Tente novamente.' }
export default async function NovaSenha({ searchParams }: { searchParams: { erro?: string } }) {
  const { user } = await getSession()
  if (!user) redirect('/entrar?erro=link')
  return (
    <div className="max-w-sm mx-auto px-4 py-14">
      <h1 className="text-2xl font-extrabold mb-1">Nova palavra-passe</h1>
      <p className="text-sm text-slate-600 mb-6">Escolha uma palavra-passe nova para a sua conta.</p>
      {searchParams.erro && <p className="text-sm text-red-600 mb-4">{MSG[searchParams.erro] ?? MSG['1']}</p>}
      <form action={setNewPassword} className="card space-y-3">
        <div><label className="label">Nova palavra-passe (mín. 6)</label><input name="password" type="password" minLength={6} required autoComplete="new-password" className="input" /></div>
        <div><label className="label">Repetir palavra-passe</label><input name="confirm" type="password" minLength={6} required autoComplete="new-password" className="input" /></div>
        <button className="btn-green w-full">Guardar</button>
      </form>
    </div>
  )
}
