// Nilai form Info event. Aturan jadwal disalin dari form v1 di components/dashboard
// (bukan diimpor) karena folder itu milik dasbor dan bisa hilang kapan saja.
import type { EventPayload, FeeBearer, ManagedEvent } from '@/types/manage'
import { parseDay } from '../../shared/manage-labels'

// Kode event (codePrefix) tidak ada di sini: backend membuatnya dari nama event.
export type InfoValues = {
  name: string
  place: string
  eventDate: string
  description: string
  item: string
  requirement: string
  openTime: string
  closeTime: string
  slotMinutes: string
  slotCapacity: string
  counterCount: string
  serviceSeconds: string
  saleStartDate: string
  saleStartTime: string
  saleEndDate: string
  saleEndTime: string
  feeBearer: FeeBearer
  feePercent: string
  feeFlat: string
  organizerId: string
}

export type InfoKey = keyof InfoValues

// Urutan tampil di form, dipakai untuk memilih field salah pertama yang difokuskan.
export const FIELD_ORDER: InfoKey[] = [
  'name', 'place', 'eventDate', 'organizerId', 'description', 'item', 'requirement',
  'openTime', 'closeTime', 'slotMinutes', 'slotCapacity', 'counterCount', 'serviceSeconds',
  'saleStartDate', 'saleStartTime', 'saleEndDate', 'saleEndTime', 'feeBearer', 'feePercent', 'feeFlat',
]

export const EMPTY_VALUES: InfoValues = {
  name: '', place: '', eventDate: '', description: '',
  item: 'Gelang masuk', requirement: 'E-ticket + KTP sesuai nama',
  openTime: '10:00', closeTime: '18:00', slotMinutes: '30', slotCapacity: '40', counterCount: '2', serviceSeconds: '90',
  saleStartDate: '', saleStartTime: '10:00', saleEndDate: '', saleEndTime: '23:59',
  feeBearer: 'customer', feePercent: '0', feeFlat: '0', organizerId: '',
}

// Mal ada di Bandung, jadi semua jam jual dibaca dan ditulis dalam WIB.
const WIB_OFFSET = '+07:00'
const WIB_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function splitWib(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const part = (type: string) => WIB_PARTS.formatToParts(date).find((item) => item.type === type)?.value ?? ''
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}

function toInstant(date: string, time: string): number {
  return new Date(`${date.trim()}T${time.trim()}:00${WIB_OFFSET}`).getTime()
}

export function toMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export function slotCount(open: string, close: string, slotMinutes: number): number {
  const start = toMinutes(open)
  const end = toMinutes(close)
  if (start === null || end === null || slotMinutes <= 0) return 0
  return Math.floor((end - start) / slotMinutes)
}

// "2,5" atau "2.5" persen jadi 250 basis poin. null bila bukan angka atau lebih dari 2 desimal.
export function percentToBp(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

function bpToPercent(bp: number): string {
  return String(bp / 100).replace('.', ',')
}

export function fromEvent(event: ManagedEvent): InfoValues {
  const start = splitWib(event.saleStartsAt)
  const end = splitWib(event.saleEndsAt)
  return {
    name: event.name, place: event.place, eventDate: event.eventDate,
    description: event.description ?? '', item: event.item, requirement: event.requirement,
    openTime: event.openTime, closeTime: event.closeTime,
    slotMinutes: String(event.slotMinutes), slotCapacity: String(event.slotCapacity),
    counterCount: String(event.counterCount), serviceSeconds: String(event.serviceSeconds),
    saleStartDate: start?.date ?? '', saleStartTime: start?.time ?? EMPTY_VALUES.saleStartTime,
    saleEndDate: end?.date ?? '', saleEndTime: end?.time ?? EMPTY_VALUES.saleEndTime,
    feeBearer: event.feeBearer, feePercent: bpToPercent(event.feePercentBp ?? 0), feeFlat: String(event.feeFlat ?? 0),
    organizerId: event.organizerId ?? '',
  }
}

function intIn(value: string, min: number, max: number): boolean {
  const number = Number(value)
  return value.trim() !== '' && Number.isInteger(number) && number >= min && number <= max
}

export function validateInfo(values: InfoValues): Partial<Record<InfoKey, string>> {
  const errors: Partial<Record<InfoKey, string>> = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Nama event wajib diisi.'
  else if (name.length < 3) errors.name = 'Nama event minimal 3 karakter.'
  if (!values.place.trim()) errors.place = 'Lokasi loket wajib diisi.'
  if (!parseDay(values.eventDate)) errors.eventDate = 'Tanggal event berformat TTTT-BB-HH, misal 2026-12-31.'
  if (!values.item.trim()) errors.item = 'Item yang ditukar wajib diisi.'
  if (!values.requirement.trim()) errors.requirement = 'Syarat penukaran wajib diisi.'
  if (toMinutes(values.openTime) === null) errors.openTime = 'Jam buka harus berformat HH:MM.'
  if (toMinutes(values.closeTime) === null) errors.closeTime = 'Jam tutup harus berformat HH:MM.'
  if (!intIn(values.slotMinutes, 10, 120)) errors.slotMinutes = 'Durasi slot 10 sampai 120 menit.'
  if (!intIn(values.slotCapacity, 1, 500)) errors.slotCapacity = 'Kuota per slot 1 sampai 500 orang.'
  if (!intIn(values.counterCount, 1, 20)) errors.counterCount = 'Jumlah loket 1 sampai 20.'
  if (!intIn(values.serviceSeconds, 30, 600)) errors.serviceSeconds = 'Detik per orang 30 sampai 600.'
  if (!errors.slotMinutes && !errors.closeTime && slotCount(values.openTime, values.closeTime, Number(values.slotMinutes)) < 1) {
    errors.closeTime = 'Jam tutup harus lebih lambat dari jam buka, minimal satu slot.'
  }

  // Periode jual boleh kosong selama masih draf; baru wajib saat diajukan.
  const hasStart = values.saleStartDate.trim() !== ''
  const hasEnd = values.saleEndDate.trim() !== ''
  if (hasStart && !parseDay(values.saleStartDate)) errors.saleStartDate = 'Tanggal mulai jual berformat TTTT-BB-HH.'
  if (hasStart && toMinutes(values.saleStartTime) === null) errors.saleStartTime = 'Jam mulai jual harus berformat HH:MM.'
  if (hasEnd && !parseDay(values.saleEndDate)) errors.saleEndDate = 'Tanggal akhir jual berformat TTTT-BB-HH.'
  if (hasEnd && toMinutes(values.saleEndTime) === null) errors.saleEndTime = 'Jam akhir jual harus berformat HH:MM.'
  const saleFieldsOk = !errors.saleStartDate && !errors.saleStartTime && !errors.saleEndDate && !errors.saleEndTime
  if (hasStart && hasEnd && saleFieldsOk && toInstant(values.saleEndDate, values.saleEndTime) <= toInstant(values.saleStartDate, values.saleStartTime)) {
    errors.saleEndDate = 'Akhir penjualan harus setelah mulai penjualan.'
  }

  const bp = percentToBp(values.feePercent)
  if (bp === null || bp > 10000) errors.feePercent = 'Persen biaya 0 sampai 100, paling banyak dua angka di belakang koma.'
  if (!intIn(values.feeFlat, 0, 100_000_000)) errors.feeFlat = 'Biaya tetap berupa rupiah bulat, boleh 0.'
  return errors
}

function toRfc3339(date: string, time: string): string | null {
  return date.trim() ? `${date.trim()}T${time.trim()}:00${WIB_OFFSET}` : null
}

export function toPayload(values: InfoValues, withOrganizer: boolean): EventPayload {
  const payload: EventPayload = {
    name: values.name.trim(), place: values.place.trim(), item: values.item.trim(),
    requirement: values.requirement.trim(), eventDate: values.eventDate.trim(),
    openTime: values.openTime.trim(), closeTime: values.closeTime.trim(),
    slotMinutes: Number(values.slotMinutes), slotCapacity: Number(values.slotCapacity),
    counterCount: Number(values.counterCount), serviceSeconds: Number(values.serviceSeconds),
    description: values.description.trim(),
    saleStartsAt: toRfc3339(values.saleStartDate, values.saleStartTime),
    saleEndsAt: toRfc3339(values.saleEndDate, values.saleEndTime),
    feeBearer: values.feeBearer, feePercentBp: percentToBp(values.feePercent) ?? 0, feeFlat: Number(values.feeFlat),
  }
  if (withOrganizer && values.organizerId.trim()) payload.organizerId = values.organizerId.trim()
  return payload
}

// Nama field dari server ke kunci form. Yang tidak ada di sini cukup tampil di toast.
export const SERVER_FIELD: Record<string, InfoKey> = {
  saleStartsAt: 'saleStartDate', saleEndsAt: 'saleEndDate', feePercentBp: 'feePercent',
}

// Isu dari server berupa potongan ("wajib diisi"), jadi toast diberi nama field-nya.
export const FIELD_LABEL: Record<InfoKey, string> = {
  name: 'Nama event', place: 'Lokasi loket', eventDate: 'Tanggal event', description: 'Deskripsi',
  item: 'Item yang ditukar', requirement: 'Syarat penukaran', openTime: 'Jam buka', closeTime: 'Jam tutup',
  slotMinutes: 'Durasi slot', slotCapacity: 'Kuota per slot', counterCount: 'Jumlah loket', serviceSeconds: 'Detik per orang',
  saleStartDate: 'Mulai jual', saleStartTime: 'Jam mulai jual', saleEndDate: 'Akhir jual', saleEndTime: 'Jam akhir jual',
  feeBearer: 'Penanggung biaya', feePercent: 'Persen biaya', feeFlat: 'Biaya tetap', organizerId: 'ID penyelenggara',
}
