export const metadata = { title: 'Política de Privacidade — Conecta Negage' }
export default function Privacidade() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 space-y-5 text-sm leading-relaxed text-slate-700">
      <h1 className="text-3xl font-extrabold text-slate-900">Política de Privacidade</h1>
      <p className="text-xs text-slate-500">Rascunho para revisão jurídica antes da publicação (incluindo conformidade com a lei angolana de protecção de dados pessoais). Última actualização: 2026.</p>
      <h2 className="font-bold text-slate-900 text-lg">Que dados recolhemos</h2>
      <p>Candidatos: nome, e-mail, telefone (opcional), área de estudo, formação e currículo em PDF. Empresas: nome da empresa, sector, responsável, e-mail, telefone (opcional) e descrição. Todos: mensagens trocadas nas candidaturas.</p>
      <h2 className="font-bold text-slate-900 text-lg">Para que usamos</h2>
      <p>Apenas para operar a plataforma: permitir candidaturas, mostrar candidatos às empresas a que se candidataram, enviar avisos e permitir a comunicação entre as partes.</p>
      <h2 className="font-bold text-slate-900 text-lg">Quem vê os seus dados</h2>
      <p>Uma empresa só vê o perfil e o currículo de quem se candidatou a uma das suas vagas. O seu currículo é guardado de forma privada e não é público. Os administradores da plataforma têm acesso aos dados de conta necessários para a gerir.</p>
      <h2 className="font-bold text-slate-900 text-lg">Onde guardamos</h2>
      <p>Os dados são guardados numa base de dados e armazenamento seguros fornecidos pela Supabase, com acesso restringido por regras de segurança.</p>
      <h2 className="font-bold text-slate-900 text-lg">Os seus direitos</h2>
      <p>Pode corrigir os seus dados no seu painel, retirar candidaturas enquanto estiverem em análise e pedir a eliminação da sua conta e dos seus dados através de contacto@conectanegage.ao.</p>
    </article>
  )
}
