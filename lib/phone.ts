// O telefone é apenas um contacto opcional (usado no botão de WhatsApp). O login é por e-mail.
export function normPhone(v: string): string | null {
  const d = v.replace(/\D/g, '')
  const n = d.startsWith('244') ? d.slice(3) : d
  return /^9\d{8}$/.test(n) ? '244' + n : null
}
