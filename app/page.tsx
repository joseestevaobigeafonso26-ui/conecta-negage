import Link from 'next/link'
import { Search, MapPin, Clock, Building2, ArrowRight, Briefcase, CheckCircle2, Megaphone, Wheat, GraduationCap, Store } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { CATEGORIES, TYPES, TYPE_CLS } from '@/lib/constants'
import { ago } from '@/lib/utils'

type P = { q?: string; cat?: string; tipo?: string; pagina?: string }
const PAGE = 12
const href = (p: P, patch: Partial<P>) => {
  const m: any = { ...p, ...patch }
  const qs = new URLSearchParams(Object.entries(m).filter(([, v]) => v) as [string, string][]).toString()
  return `/${qs ? `?${qs}` : ''}#vagas`
}
const POPULAR = [['🌾 Agropecuária', 'Agricultura / Agropecuária'], ['🛒 Comércio', 'Comércio e Serviços'], ['💻 Tecnologia', 'Tecnologia e Informática'], ['📚 Educação', 'Educação']]

export default async function Home({ searchParams }: { searchParams: P }) {
  const { supabase, profile } = await getSession()
  const page = Math.max(1, parseInt(searchParams.pagina ?? '1') || 1)
  let query = supabase.from('jobs').select('*, companies(name)', { count: 'exact' }).eq('status', 'open').order('created_at', { ascending: false })
  if (searchParams.q) query = query.ilike('title', `%${searchParams.q}%`)
  if (searchParams.cat) query = query.eq('category', searchParams.cat)
  if (searchParams.tipo) query = query.eq('type', searchParams.tipo)
  const [{ data: jobs, count: found }, { data: st }, { count: total }] = await Promise.all([
    query.range((page - 1) * PAGE, page * PAGE - 1), supabase.rpc('public_stats'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ])
  const stats = [
    [st?.jobs ?? 0, 'Vagas activas no Negage', 'text-brand-blue'], [st?.candidates ?? 0, 'Jovens registados', 'text-brand-emerald'],
    [st?.companies ?? 0, 'Empresas parceiras', 'text-brand-amber'], [st?.hired ?? 0, 'Jovens inseridos', 'text-indigo-600'],
  ]

  return (
    <>
      <section id="inicio" className="relative bg-gradient-to-b from-blue-900 via-brand-blue to-slate-900 text-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-lightBlue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-brand-emerald/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-brand-amber border border-white/20 text-xs font-semibold mb-6 backdrop-blur-md">
            <MapPin size={14} />Município do Negage • Província do Uíge
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
            Impulsionando o Futuro dos <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300">Jovens do Negage</span>
          </h1>
          <p className="text-slate-200 sm:text-lg mb-10 font-light leading-relaxed">A ponte directa entre o talento jovem e as oportunidades de emprego, estágio e capacitação no nosso município.</p>
          <form action="/#vagas" className="bg-white p-3 sm:p-4 rounded-2xl shadow-2xl text-slate-800 grid gap-3 sm:grid-cols-[1fr_11rem_auto]">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={searchParams.q} placeholder="Cargo ou palavra-chave..." className="input pl-11 bg-slate-50 py-3" />
            </div>
            <select name="tipo" defaultValue={searchParams.tipo ?? ''} className="input bg-slate-50 py-3 font-medium"><option value="">Todos os Tipos</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            <button className="btn py-3 px-6 shadow-md">Buscar</button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center items-center gap-2 text-xs">
            <span className="text-slate-300 mr-2">Populares:</span>
            {POPULAR.map(([l, c]) => <Link key={c} href={href({}, { cat: c })} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-slate-200 transition-colors">{l}</Link>)}
          </div>
        </div>
      </section>

      <section className="py-10 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(([n, l, c]) => (
            <div key={l as string} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className={`text-3xl font-extrabold mb-1 ${c}`}>{n}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="vagas" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Oportunidades em Destaque</h2>
              <p className="text-slate-500 text-sm mt-1">Explore as melhores vagas de emprego e estágio activas no município.</p>
            </div>
            <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 self-start md:self-auto">
              A mostrar <b className="text-brand-blue">{jobs?.length ?? 0}</b> de <b className="text-slate-700">{total ?? 0}</b> vagas disponíveis
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
            {[['', 'Todas as Categorias'], ...CATEGORIES.map((c) => [c, c])].map(([c, l]) => (
              <Link key={c} href={href(searchParams, { cat: c, pagina: '' })} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${(searchParams.cat ?? '') === c ? 'bg-brand-blue text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>{l}</Link>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs?.map((j: any) => (
              <article key={j.id} className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-brand-lightBlue/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center font-bold text-lg text-slate-700 group-hover:bg-blue-50 group-hover:text-brand-blue transition-colors">{j.companies?.name?.[0]}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${TYPE_CLS[j.type] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{j.type}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-brand-blue transition-colors">{j.title}</h3>
                  <p className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" />{j.companies?.name}</p>
                  <div className="flex flex-wrap gap-y-1 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1 mr-4"><MapPin size={13} className="text-brand-emerald" />{j.location}</span>
                    <span className="flex items-center gap-1"><Clock size={13} />{ago(j.created_at)}</span>
                  </div>
                  <p className="text-slate-600 text-xs line-clamp-2 mb-4 leading-relaxed">{j.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-6">{j.tags?.map((t: string) => <span key={t} className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-md font-medium">{t}</span>)}</div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{j.salary || 'A combinar'}</span>
                  <Link href={`/vagas/${j.id}`} className="bg-slate-900 hover:bg-brand-blue text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center gap-1.5">Ver detalhes<ArrowRight size={12} /></Link>
                </div>
              </article>
            ))}
          </div>

          {(found ?? 0) > PAGE && (
            <div className="flex items-center justify-center gap-3 mt-10 text-sm">
              {page > 1 ? <Link href={href(searchParams, { pagina: String(page - 1) })} className="btn-ghost py-2.5">← Anterior</Link> : <span />}
              <span className="text-slate-500">Página {page} de {Math.ceil((found ?? 0) / PAGE)}</span>
              {page * PAGE < (found ?? 0) ? <Link href={href(searchParams, { pagina: String(page + 1) })} className="btn-ghost py-2.5">Seguinte →</Link> : <span />}
            </div>
          )}

          {!jobs?.length && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-lg mx-auto my-8">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full grid place-items-center mx-auto mb-4"><Briefcase size={26} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhuma vaga encontrada</h3>
              <p className="text-slate-500 text-sm mb-6">Não encontrámos nenhuma oportunidade com os filtros seleccionados.</p>
              <Link href="/#vagas" className="btn">Limpar filtros de pesquisa</Link>
            </div>
          )}
        </div>
      </section>

      <section id="empresas" className="py-16 bg-gradient-to-r from-slate-900 to-brand-dark text-white relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-brand-amber font-semibold text-xs uppercase tracking-wider">Espaço do Empregador</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 mb-4 leading-tight">Representa uma Empresa ou Negócio no Negage?</h2>
            <p className="text-slate-300 mb-6 leading-relaxed">Ajude a impulsionar o desenvolvimento local contratando jovens talentos, estagiários ou trabalhadores qualificados da nossa região. Divulgar uma vaga é rápido, simples e 100% gratuito.</p>
            <ul className="space-y-3 mb-8 text-sm text-slate-300">
              {['Acesso directo aos talentos do município', 'Candidaturas, entrevistas e contratações num só painel', 'Contribuição directa para o crescimento do Negage'].map((t) => <li key={t} className="flex items-center gap-3"><CheckCircle2 size={18} className="text-brand-emerald shrink-0" />{t}</li>)}
            </ul>
            {(!profile || profile.role === 'company') && <Link href={profile ? '/empresa' : '/registar?tipo=empresa'} className="btn-green px-6 py-3 shadow-lg"><Megaphone size={16} />Anunciar Vaga Gratuitamente</Link>}
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 sm:p-8 backdrop-blur">
            <h3 className="text-xl font-bold mb-1">Como começar</h3>
            <p className="text-xs text-slate-400 mb-6">A nossa equipa valida cada empresa antes de poder publicar vagas.</p>
            <ol className="space-y-5">
              {[['Registe a empresa', 'Nome, sector e o e-mail do responsável.'], ['Aguarde a validação', 'Confirmamos o perfil empresarial.'], ['Publique e acompanhe', 'Receba candidaturas, marque entrevistas e contacte por WhatsApp.']].map(([t, d], i) => (
                <li key={t} className="flex gap-4"><span className="w-8 h-8 rounded-full bg-brand-emerald/20 text-brand-emerald font-bold text-sm grid place-items-center shrink-0">{i + 1}</span><div><p className="font-semibold text-sm">{t}</p><p className="text-xs text-slate-400">{d}</p></div></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="sobre" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <span className="text-brand-blue font-semibold text-xs uppercase tracking-wider">Desenvolvimento Local</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Sobre o Município do Negage</h2>
            <p className="text-slate-600 mt-3 leading-relaxed">Localizado na província do Uíge, o Negage é um importante pólo agrícola, comercial e educacional. A plataforma <b>Conecta Negage</b> surge como uma iniciativa comunitária digital para diminuir o desemprego juvenil e facilitar o acesso ao primeiro emprego no município.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[[Wheat, 'bg-emerald-50 text-emerald-600', 'Potencial Agrícola', 'Oportunidades em agropecuária, produção de café, milho, mandioca e gestão de cooperativas rurais.'],
              [GraduationCap, 'bg-blue-50 text-blue-600', 'Formação e Estágios', 'Ligação com estudantes das escolas técnicas e institutos locais para estágios práticos.'],
              [Store, 'bg-amber-50 text-amber-600', 'Comércio Dinâmico', 'Vagas em lojas, supermercados, serviços de logística e apoio administrativo na vila do Negage.']].map(([Icon, cls, t, d]: any) => (
              <div key={t} className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                <div className={`w-12 h-12 rounded-xl grid place-items-center mb-4 ${cls}`}><Icon size={22} /></div>
                <h3 className="font-bold text-slate-900 mb-2">{t}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
