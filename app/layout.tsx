import './globals.css'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { Menu, MapPin, Mail, Phone, Heart, Plus } from 'lucide-react'
import { getSession } from '@/lib/auth'
import TopProgress from './components/TopProgress'
import { signOut } from './actions'
import { HOME, ZONES } from '@/lib/constants'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
export const metadata: Metadata = { title: 'Conecta Negage — Oportunidades de Emprego e Estágio', description: 'Vagas, candidaturas e entrevistas para os jovens do Negage.' }

const NAV = [['Início', '/'], ['Vagas Disponíveis', '/#vagas'], ['Para Empresas', '/#empresas'], ['Sobre o Negage', '/#sobre']]

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession()
  const role = profile?.role
  // "Publicar Vaga" só para visitantes (vão registar a empresa) e para empresas; nunca para candidatos ou admin.
  const canPublish = !role || role === 'company'
  const publish = role === 'company' ? '/empresa' : '/registar?tipo=empresa'
  return (
    <html lang="pt-AO" className={inter.variable}>
      <body className="bg-slate-50 text-slate-800 min-h-screen flex flex-col font-sans">
        <TopProgress />
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-green text-white font-bold text-xl grid place-items-center shadow-md">CN</span>
              <span>
                <span className="block text-xl font-extrabold text-brand-blue tracking-tight leading-5">Conecta<span className="text-brand-green">Negage</span></span>
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Oportunidades para Jovens</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              {NAV.map(([l, h]) => <Link key={h} href={h} className="hover:text-brand-blue transition-colors">{l}</Link>)}
            </nav>
            <div className="flex items-center gap-2">
              {canPublish && <Link href={publish} className="btn-green hidden sm:inline-flex shadow-md"><Plus size={16} />Publicar Vaga</Link>}
              {profile ? (
                <>
                  <Link href={HOME[profile.role]} className="btn-ghost">O meu painel</Link>
                  <form action={signOut}><button className="btn-ghost">Sair</button></form>
                </>
              ) : <Link href="/entrar" className="btn-ghost">Entrar</Link>}
              <details className="md:hidden relative">
                <summary className="btn-ghost list-none cursor-pointer" aria-label="Menu"><Menu size={18} /></summary>
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-2">
                  {NAV.map(([l, h]) => <Link key={h} href={h} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">{l}</Link>)}
                  {canPublish && <Link href={publish} className="btn-green w-full mt-2"><Plus size={16} />Publicar Vaga</Link>}
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-lg font-bold text-white mb-3">Conecta<span className="text-brand-emerald">Negage</span></p>
              <p className="leading-relaxed">Promovendo o emprego e a capacitação dos jovens no município do Negage, Província do Uíge, Angola.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Links Rápidos</h4>
              <ul className="space-y-2">{NAV.map(([l, h]) => <li key={h}><Link href={h} className="hover:text-white">{l}</Link></li>)}</ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Zonas do Negage</h4>
              <ul className="space-y-2">{ZONES.map((z) => <li key={z}>{z}</li>)}</ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Contacto e Suporte</h4>
              <p className="flex items-center gap-2 mb-2"><MapPin size={14} className="text-brand-emerald" />Negage, Província do Uíge — Angola</p>
              <p className="flex items-center gap-2 mb-2"><Mail size={14} className="text-brand-emerald" />contacto@conectanegage.ao</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-brand-emerald" />+244 923 000 000</p>
            </div>
          </div>
          <div className="border-t border-slate-800 py-5 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto sm:px-6 lg:px-8">
            <p>© 2026 Conecta Negage. Todos os direitos reservados. · <Link href="/termos" className="hover:text-white">Termos</Link> · <Link href="/privacidade" className="hover:text-white">Privacidade</Link></p>
            <p className="flex items-center gap-1.5">Feito com <Heart size={12} className="text-red-500 fill-red-500" /> para a juventude do Negage.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
