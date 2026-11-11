// Aturan isian akun pembeli. Angkanya ikut kontrak backend /customer/v1/auth,
// jadi kalau backend mengubah batas, ubah di sini saja.
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type FieldErrors<F extends string> = Partial<Record<F, string>>

// Hanya jalur relatif di situs ini. "//evil.com" juga diawali "/", makanya ditolak
// terpisah, supaya ?next= tidak bisa dipakai melempar orang ke situs lain.
export function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : null
}

export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path
}

export function checkEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Email wajib diisi.'
  if (!EMAIL_PATTERN.test(email)) return 'Tulis email yang lengkap, misalnya nama@email.com.'
  return undefined
}

export function checkNewPassword(value: string): string | undefined {
  if (!value) return 'Kata sandi wajib diisi.'
  if (value.length < PASSWORD_MIN) return `Kata sandi minimal ${PASSWORD_MIN} karakter.`
  if (value.length > PASSWORD_MAX) return `Kata sandi maksimal ${PASSWORD_MAX} karakter.`
  return undefined
}

export function checkName(value: string): string | undefined {
  return value.trim() ? undefined : 'Nama wajib diisi.'
}

// Orang suka menulis nomor dengan spasi atau strip ("0812-3456-7890"), jadi
// pemisahnya dibuang dulu sebelum dicek dan sebelum dikirim.
export function cleanPhone(value: string): string {
  return value.replace(/[\s\-().]/g, '')
}

export function checkPhone(value: string): string | undefined {
  const phone = cleanPhone(value)
  if (!phone) return 'Nomor WhatsApp wajib diisi.'
  const digits = phone.replace(/^\+/, '')
  const prefixOk = phone.startsWith('08') || phone.startsWith('+62') || phone.startsWith('62')
  if (!prefixOk || !/^\d+$/.test(digits) || digits.length < 10 || digits.length > 15) {
    return 'Tulis nomor yang diawali 08, 62, atau +62, sepanjang 10 sampai 15 angka.'
  }
  return undefined
}

// Petunjuk kata sandi cuma soal panjang. Meter kekuatan palsu lebih menyesatkan
// daripada membantu, karena backend memang hanya mengecek panjang.
export function passwordHint(value: string): string {
  if (!value) return `Minimal ${PASSWORD_MIN} karakter.`
  if (value.length < PASSWORD_MIN) return `Kurang ${PASSWORD_MIN - value.length} karakter lagi.`
  if (value.length > PASSWORD_MAX) return `Kelebihan ${value.length - PASSWORD_MAX} karakter. Maksimal ${PASSWORD_MAX}.`
  if (value.length < 12) return 'Sudah cukup. Makin panjang makin sulit ditebak.'
  return 'Panjangnya sudah bagus.'
}

export function firstName(name: string, email: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first || email.split('@')[0] || 'Akun'
}

export function initialOf(name: string, email: string): string {
  return firstName(name, email).charAt(0).toUpperCase()
}

export function collectErrors<F extends string>(checks: Record<F, string | undefined>): FieldErrors<F> {
  const errors: FieldErrors<F> = {}
  for (const key of Object.keys(checks) as F[]) {
    const message = checks[key]
    if (message !== undefined) errors[key] = message
  }
  return errors
}

// Tujuan setelah masuk atau daftar. Halaman masuk dan daftar sendiri ditolak
// sebagai tujuan, karena orang yang sudah masuk langsung dialihkan dari sana
// dan hasilnya putaran pengalihan tanpa ujung.
export function nextAfterAuth(raw: string | null): string | null {
  const next = safeNext(raw)
  if (!next) return null
  const path = next.split(/[?#]/)[0]
  return path === '/account/login' || path === '/account/register' ? null : next
}
