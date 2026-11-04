'use client'
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-AO"><body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '6rem 1rem' }}>
      <h1>Algo correu mal</h1>
      <p>Não conseguimos carregar a plataforma neste momento.</p>
      <button onClick={() => reset()} style={{ padding: '.6rem 1.2rem', borderRadius: 12, background: '#1E3A8A', color: '#fff', border: 0 }}>Tentar novamente</button>
    </body></html>
  )
}
