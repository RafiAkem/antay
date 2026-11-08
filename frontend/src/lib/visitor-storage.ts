// Pengunjung tidak punya akun, jadi kode tiketnya disimpan di perangkat ini saja.
// Isinya cuma kode dan id event, bukan data pribadi.
const KEY = 'antay-visitor-tickets'

export type SavedTicket = { code: string; eventId: string }

export function listTicketsByCode(): SavedTicket[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedTicket[]
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.code === 'string') : []
  } catch {
    return []
  }
}

export function rememberTicket(code: string, eventId: string): void {
  const list = listTicketsByCode().filter((entry) => entry.code !== code)
  list.push({ code, eventId })
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-10)))
  } catch {
    // penyimpanan penuh atau diblokir: tiket tetap tampil di sesi ini
  }
}

export function forgetTicket(code: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listTicketsByCode().filter((entry) => entry.code !== code)))
  } catch {
    // abaikan
  }
}
