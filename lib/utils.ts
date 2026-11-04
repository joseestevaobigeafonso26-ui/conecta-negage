// Ligação wa.me (gratuita, sem API): abre o WhatsApp do utilizador com a mensagem pronta.
export function wa(phone: string | null, text: string) {
  const d = (phone ?? '').replace(/\D/g, '')
  if (!d) return null
  return `https://wa.me/${d.length === 9 ? '244' + d : d}?text=${encodeURIComponent(text)}`
}
export const fmt = (d: string) => new Date(d).toLocaleString('pt-AO', { dateStyle: 'medium', timeStyle: 'short' })
export function ago(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5)
  return days <= 0 ? 'Hoje' : days === 1 ? 'Há 1 dia' : `Há ${days} dias`
}
// Mensagens de erro do Supabase em português
export function ptError(m: string) {
  const t = (m || '').toLowerCase()
  if (t.includes('rate limit')) return 'Limite de envio de e-mails atingido. Tente novamente mais tarde.'
  if (t.includes('signup')) return 'O registo de novas contas está temporariamente fechado.'
  if (t.includes('password')) return 'A palavra-passe deve ter pelo menos 6 caracteres.'
  if (t.includes('invalid') && t.includes('email')) return 'E-mail inválido.'
  return 'Não foi possível concluir. Tente novamente.'
}
