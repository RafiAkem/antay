export function normalizeCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/\s+/g, '')
  if (clean.length > 2 && !clean.includes('-')) return `${clean.slice(0, 2)}-${clean.slice(2)}`
  return clean
}
