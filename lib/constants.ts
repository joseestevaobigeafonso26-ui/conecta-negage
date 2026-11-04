export const CATEGORIES = ['Tecnologia e Informática','Agricultura / Agropecuária','Comércio e Serviços','Educação','Administração e Finanças','Saúde e Farmácia']
export const TYPES = ['Estágio','Tempo Integral','Primeiro Emprego','Meio Período']
export const SECTORS = ['Comércio / Loja','Agricultura / Pecuária','Educação / Escola','Saúde / Farmácia','Prestação de Serviços','Outro']
export const STATUS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Recebida', cls: 'bg-slate-100 text-slate-700' },
  in_review: { label: 'Em análise', cls: 'bg-amber-100 text-amber-800' },
  interview: { label: 'Entrevista agendada', cls: 'bg-blue-100 text-blue-800' },
  hired: { label: 'Seleccionado', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Não seleccionado', cls: 'bg-red-100 text-red-800' },
}
export const HOME: Record<string, string> = { candidate: '/candidato', company: '/empresa', admin: '/admin' }
export const TYPE_CLS: Record<string, string> = {
  'Estágio': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Tempo Integral': 'bg-blue-50 text-blue-700 border-blue-200',
  'Primeiro Emprego': 'bg-amber-50 text-amber-700 border-amber-200',
  'Meio Período': 'bg-purple-50 text-purple-700 border-purple-200',
}
export const ZONES = ['Centro da Vila', 'Bairro Popular', 'Bairro Canawani', 'Zona Industrial']
