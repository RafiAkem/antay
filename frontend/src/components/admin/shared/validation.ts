import { ApiError } from '@/lib/api'

// Aturan di sini sengaja meniru domain/contact di backend, supaya kesalahan
// yang jelas ketahuan sebelum dikirim. Server tetap yang memutuskan; pesannya
// dipakai kalau ternyata ada yang lolos dari sini.

export type FieldErrors = Record<string, string>

export function nameIssue(raw: string, min: number, max: number): string | null {
  const name = raw.trim()
  if (!name) return 'Wajib diisi.'
  const length = [...name].length
  if (length < min || length > max) return `Harus ${min} sampai ${max} karakter.`
  return null
}

export function emailIssue(raw: string): string | null {
  const email = raw.trim()
  if (!email) return 'Wajib diisi.'
  const at = email.indexOf('@')
  const domain = email.slice(at + 1)
  const dot = domain.lastIndexOf('.')
  if (/\s/.test(email) || at <= 0 || domain.includes('@') || dot <= 0 || dot === domain.length - 1 || domain.includes('..')) {
    return 'Format email belum benar, contoh: nama@domain.id.'
  }
  return null
}

// Nomor kontak boleh kosong. Kalau diisi, harus nomor Indonesia.
export function phoneIssue(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-.()]/g, '')
  if (!cleaned) return null
  let digits = cleaned
  if (digits.startsWith('+62')) digits = digits.slice(1)
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  else if (!digits.startsWith('62')) return 'Harus nomor Indonesia, diawali 08, 62, atau +62.'
  if (!/^\d+$/.test(digits)) return 'Hanya boleh berisi angka.'
  if (digits.length < 10 || digits.length > 15) return 'Harus 10 sampai 15 digit.'
  return null
}

// bcrypt diam-diam memotong setelah 72 byte, jadi batasnya dihitung dalam
// byte, bukan huruf. Emoji di kata sandi bisa memakan 4 byte sekaligus.
export function passwordIssue(raw: string): string | null {
  if (!raw) return 'Wajib diisi.'
  if (raw.length < 8) return 'Minimal 8 karakter.'
  if (new TextEncoder().encode(raw).length > 72) return 'Terlalu panjang, maksimal 72 byte.'
  return null
}

function sentence(issue: string): string {
  const text = issue.trim()
  if (!text) return 'Periksa isian ini.'
  const capital = text.charAt(0).toUpperCase() + text.slice(1)
  return /[.!?]$/.test(capital) ? capital : `${capital}.`
}

// Detail galat server ("format email tidak valid") dijadikan kalimat di bawah
// field yang bersangkutan, bukan ditumpuk jadi satu toast panjang.
export function serverFieldErrors(cause: unknown): FieldErrors {
  if (!(cause instanceof ApiError)) return {}
  const errors: FieldErrors = {}
  for (const [field, issue] of Object.entries(cause.field)) errors[field] = sentence(issue)
  return errors
}

// Fokus ke field salah yang paling atas di form, mengikuti urutan order.
// Select dari components/ui tidak menerima id, jadi id-nya dipasang di
// pembungkus dan yang difokus tombol pemicu di dalamnya.
export function focusFirstError(errors: FieldErrors, order: ReadonlyArray<{ key: string; id: string }>) {
  const first = order.find((entry) => errors[entry.key])
  if (!first) return
  const node = document.getElementById(first.id)
  const target = node?.matches('input, button, textarea') ? node : node?.querySelector<HTMLElement>('input, button, textarea')
  target?.focus()
}

export function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback
}
