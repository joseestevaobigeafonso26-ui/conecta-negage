import Link from 'next/link'
import { Bell } from 'lucide-react'
import { markRead } from '../actions'
import { fmt } from '@/lib/utils'

export default function Notifications({ notes }: { notes: any[] }) {
  if (!notes.length) return null
  const unread = notes.filter((n) => !n.read).length
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2"><Bell size={16} className="text-brand-blue" />Notificações
          {unread > 0 && <span className="bg-brand-emerald text-white text-xs rounded-full px-2 py-0.5">{unread}</span>}</h2>
        {unread > 0 && <form action={markRead}><button className="text-xs text-brand-blue font-semibold">Marcar como lidas</button></form>}
      </div>
      <ul className="space-y-2.5">
        {notes.map((n) => (
          <li key={n.id} className={`text-sm ${n.read ? 'text-slate-500' : 'text-slate-900'}`}>
            <span className="font-semibold">{n.title}</span> — {n.body} <span className="text-[11px] text-slate-400">{fmt(n.created_at)}</span>{n.link && <Link href={n.link} className="ml-2 text-xs text-brand-blue font-semibold">Abrir</Link>}
          </li>
        ))}
      </ul>
    </section>
  )
}
