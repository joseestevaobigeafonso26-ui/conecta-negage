'use client'
import Link from 'next/link'
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <h1 className="text-xl font-bold mb-2">Algo correu mal</h1>
      <p className="text-sm text-slate-600 mb-6">Não conseguimos carregar esta página. Verifique a ligação à internet e tente outra vez.</p>
      <div className="flex gap-2 justify-center">
        <button onClick={() => reset()} className="btn">Tentar novamente</button>
        <Link href="/" className="btn-ghost py-2.5">Ir para o início</Link>
      </div>
    </div>
  )
}
