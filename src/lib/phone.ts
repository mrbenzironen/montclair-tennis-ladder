export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** E.164 for US numbers from typical user input; null if not a valid 10- or 11-digit US number. */
export function normalizeUsPhoneE164(input: string): string | null {
  const d = digitsOnly(input)
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
}
