// Semua tanggal event dihitung di Asia/Jakarta (PRD bagian zona waktu), bukan
// zona waktu perangkat. Pembeli yang membuka dari luar negeri tetap melihat
// "Hari ini" yang sama dengan orang yang berdiri di mal.
const ZONE = 'Asia/Jakarta'

const ISO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const SHORT_DAY = new Intl.DateTimeFormat('id-ID', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short' })
const SHORT_DAY_YEAR = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export type WhenFilter = 'all' | 'today' | 'week' | 'month'

export const WHEN_OPTIONS: Array<{ value: WhenFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'today', label: 'Hari ini' },
  { value: 'week', label: 'Minggu ini' },
  { value: 'month', label: 'Bulan ini' },
]

export function parseWhen(raw: string | null): WhenFilter {
  return raw === 'today' || raw === 'week' || raw === 'month' ? raw : 'all'
}

// en-CA kebetulan memformat tanggal sebagai YYYY-MM-DD, jadi hasilnya bisa
// langsung dibandingkan sebagai string dengan eventDate dari backend.
export function jakartaToday(now = new Date()): string {
  return ISO_DAY.format(now)
}

// eventDate kadang datang sebagai tanggal polos, kadang ISO lengkap. Sepuluh
// karakter pertama selalu YYYY-MM-DD.
export function dayOf(eventDate: string): string {
  return eventDate.slice(0, 10)
}

// Jam 12 siang WIB supaya tanggalnya tidak bergeser ke hari sebelah saat dibaca
// sebagai UTC.
function noonOf(day: string): Date {
  return new Date(`${day}T12:00:00+07:00`)
}

function addDays(day: string, amount: number): string {
  const date = noonOf(day)
  date.setUTCDate(date.getUTCDate() + amount)
  return ISO_DAY.format(date)
}

export function isUpcoming(eventDate: string, today = jakartaToday()): boolean {
  return dayOf(eventDate) >= today
}

// "Minggu ini" = sisa minggu kalender sampai Minggu, mengikuti kebiasaan
// kalender di sini yang mulai hari Senin. Hari Minggu berarti hanya hari itu.
export function matchesWhen(eventDate: string, when: WhenFilter, today = jakartaToday()): boolean {
  const day = dayOf(eventDate)
  if (day < today) return false
  if (when === 'all') return true
  if (when === 'today') return day === today
  if (when === 'month') return day.slice(0, 7) === today.slice(0, 7)
  const weekday = noonOf(today).getUTCDay()
  const sunday = addDays(today, (7 - weekday) % 7)
  return day <= sunday
}

// "Sab, 31 Des · 18.00". Tahun baru ditulis kalau event-nya bukan tahun ini.
export function formatEventWhen(eventDate: string, openTime: string, today = jakartaToday()): string {
  const day = dayOf(eventDate)
  const formatter = day.slice(0, 4) === today.slice(0, 4) ? SHORT_DAY : SHORT_DAY_YEAR
  const time = openTime.slice(0, 5).replace(':', '.')
  return `${formatter.format(noonOf(day))} · ${time}`
}
