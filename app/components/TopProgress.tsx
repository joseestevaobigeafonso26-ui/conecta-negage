'use client'
import { useEffect, useRef } from 'react'

// Barra de progresso no topo (estilo Facebook/YouTube). Acompanha os pedidos reais do Next.js:
// navegação entre páginas e envio de formulários (server actions). Enquanto um formulário envia,
// os seus botões ficam esbatidos e não aceitam cliques repetidos.
export default function TopProgress() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bar.current!
    let inflight = 0, pct = 0
    let trickle: any = null, hide: any = null, safety: any = null

    const set = (p: number, o = 1) => { pct = p; el.style.opacity = String(o); el.style.transform = `scaleX(${p / 100})` }
    const clearPending = () => document.querySelectorAll('form[data-pending]').forEach((f) => f.removeAttribute('data-pending'))
    const start = () => {
      clearTimeout(hide)
      if (trickle) return
      el.style.transition = 'none'; set(0, 0); void el.offsetWidth
      el.style.transition = 'transform .3s ease, opacity .3s ease'
      set(12)
      trickle = setInterval(() => set(pct + (92 - pct) * 0.07), 300)
    }
    const done = () => {
      clearInterval(trickle); trickle = null; clearTimeout(safety)
      set(100)
      hide = setTimeout(() => { el.style.opacity = '0'; clearPending() }, 250)
    }

    const origFetch = window.fetch
    window.fetch = function (this: any, input: any, init?: any) {
      let tracked = false
      try {
        const h = new Headers(init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined))
        tracked = (h.has('next-action') || h.has('rsc')) && !h.has('next-router-prefetch')
      } catch {}
      if (!tracked) return origFetch.apply(this, arguments as any)
      inflight++; start()
      return origFetch.apply(this, arguments as any).finally(() => {
        inflight = Math.max(0, inflight - 1)
        if (!inflight) setTimeout(() => { if (!inflight) done() }, 250)
      })
    } as typeof window.fetch

    const onSubmit = (e: Event) => {
      const f = e.target as HTMLElement
      if (f?.tagName !== 'FORM') return
      f.setAttribute('data-pending', '')
      start()
      clearTimeout(safety)
      safety = setTimeout(() => { if (!inflight) done() }, 20000) // rede de segurança
    }
    document.addEventListener('submit', onSubmit, true)

    return () => {
      window.fetch = origFetch
      document.removeEventListener('submit', onSubmit, true)
      clearInterval(trickle); clearTimeout(hide); clearTimeout(safety)
    }
  }, [])

  return (
    <div aria-hidden className="fixed top-0 left-0 right-0 h-[3px] z-[100] pointer-events-none">
      <div ref={bar} style={{ transform: 'scaleX(0)', opacity: 0 }}
        className="h-full w-full origin-left bg-gradient-to-r from-brand-emerald via-brand-lightBlue to-brand-amber shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
    </div>
  )
}
