import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-black text-brand-blue mb-2">404</p>
      <h1 className="text-xl font-bold mb-2">Página não encontrada</h1>
      <p className="text-sm text-slate-600 mb-6">A página que procura não existe ou a vaga já foi removida.</p>
      <Link href="/" className="btn">Ver vagas disponíveis</Link>
    </div>
  )
}
