import type { CreateEventPayload } from '@/types/api'

export type EventFormValues = {
  name: string
  place: string
  item: string
  requirement: string
  openTime: string
  closeTime: string
  slotMinutes: string
  slotCapacity: string
  counterCount: string
  serviceSeconds: string
}

export const INITIAL_VALUES: EventFormValues = {
  name: '',
  place: '',
  item: 'Gelang masuk',
  requirement: 'E-ticket + KTP sesuai nama',
  openTime: '10:00',
  closeTime: '18:00',
  slotMinutes: '30',
  slotCapacity: '40',
  counterCount: '2',
  serviceSeconds: '90',
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

export function validateEvent(values: EventFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.name.trim()) errors.name = 'Nama event wajib diisi.'
  if (!values.place.trim()) errors.place = 'Lokasi loket wajib diisi.'
  if (!values.item.trim()) errors.item = 'Item yang ditukar wajib diisi.'
  if (toMinutes(values.openTime) === null) errors.openTime = 'Jam buka harus berformat HH:MM.'
  if (toMinutes(values.closeTime) === null) errors.closeTime = 'Jam tutup harus berformat HH:MM.'

  const slotMinutes = Number(values.slotMinutes)
  if (!Number.isInteger(slotMinutes) || slotMinutes < 10 || slotMinutes > 120) {
    errors.slotMinutes = 'Durasi slot 10 sampai 120 menit.'
  }
  const slotCapacity = Number(values.slotCapacity)
  if (!Number.isInteger(slotCapacity) || slotCapacity < 1 || slotCapacity > 500) {
    errors.slotCapacity = 'Kuota per slot 1 sampai 500 orang.'
  }
  const counterCount = Number(values.counterCount)
  if (!Number.isInteger(counterCount) || counterCount < 1 || counterCount > 20) {
    errors.counterCount = 'Jumlah loket 1 sampai 20.'
  }
  const serviceSeconds = Number(values.serviceSeconds)
  if (!Number.isInteger(serviceSeconds) || serviceSeconds < 30 || serviceSeconds > 600) {
    errors.serviceSeconds = 'Detik per orang 30 sampai 600.'
  }
  if (!values.requirement.trim()) errors.requirement = 'Syarat penukaran wajib diisi.'

  if (slotMinutes > 0 && slotCount(values.openTime, values.closeTime, slotMinutes) < 1) {
    errors.closeTime = 'Jam tutup harus lebih lambat dari jam buka, minimal satu slot.'
  }
  return errors
}

export function toEventPayload(values: EventFormValues): CreateEventPayload {
  return {
    name: values.name.trim(),
    place: values.place.trim(),
    item: values.item.trim(),
    requirement: values.requirement.trim(),
    openTime: values.openTime.trim(),
    closeTime: values.closeTime.trim(),
    slotMinutes: Number(values.slotMinutes),
    slotCapacity: Number(values.slotCapacity),
    counterCount: Number(values.counterCount),
    serviceSeconds: Number(values.serviceSeconds),
  }
}
