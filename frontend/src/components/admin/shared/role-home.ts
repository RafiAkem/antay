import type { Role } from '@/types/api'

// Halaman pertama tiap peran setelah masuk. Penyelenggara tidak punya loket,
// jadi langsung ke daftar event miliknya.
const HOME: Record<Role, string> = {
  organizer: '/manage/events',
  staff: '/counter',
  admin: '/dashboard',
}

export function homeForRole(role: Role): string {
  return HOME[role]
}

// Hanya jalur di dalam situs ini. "//evil.com" juga diawali garis miring,
// makanya ditolak terpisah supaya ?next= tidak bisa dipakai melempar orang keluar.
export function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  return raw
}
