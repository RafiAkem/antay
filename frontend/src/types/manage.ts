// Bentuk data kelola event untuk penyelenggara dan admin mal.
// Mengikuti kontrak /operational/v1/manage yang dibangun paralel di backend.
// Field yang bisa kosong di database ditandai null supaya halaman tidak kaget.

export type EventStatus = 'draft' | 'review' | 'published' | 'closed' | 'cancelled'

export type FeeBearer = 'customer' | 'organizer'

export type ManagedPackage = {
  id: string
  name: string
  pax: number
  price: number
  // null berarti tanpa batas sendiri, ikut kuota kategori
  quota: number | null
  sortOrder: number
  isActive: boolean
}

export type ManagedCategory = {
  id: string
  name: string
  description: string
  sortOrder: number
  isSeated: boolean
  // hanya untuk kategori tanpa kursi; kategori berkursi dihitung dari denah
  quota: number | null
  seatCount: number
  packages: ManagedPackage[]
}

export type ManagedEvent = {
  id: string
  codePrefix: string
  name: string
  place: string
  item: string
  requirement: string
  eventDate: string
  openTime: string
  closeTime: string
  slotMinutes: number
  slotCapacity: number
  counterCount: number
  serviceSeconds: number
  status: EventStatus
  organizerId: string | null
  description: string
  posterUrl: string
  saleStartsAt: string | null
  saleEndsAt: string | null
  feeBearer: FeeBearer
  feePercentBp: number
  feeFlat: number
  rejectionReason: string | null
  submittedAt: string | null
  publishedAt: string | null
  categories: ManagedCategory[]
}

// Daftar /manage/events berbentuk ringkas: tanpa field penukaran, biaya, dan kategori.
// Kategori diambil terpisah lewat /events/{id}/categories bila diperlukan.
export type ManagedEventSummary = Pick<
  ManagedEvent,
  | 'id'
  | 'codePrefix'
  | 'name'
  | 'place'
  | 'eventDate'
  | 'openTime'
  | 'closeTime'
  | 'status'
  | 'organizerId'
  | 'posterUrl'
  | 'saleStartsAt'
  | 'saleEndsAt'
  | 'rejectionReason'
  | 'submittedAt'
  | 'publishedAt'
> & { organizerName?: string }

// codePrefix tidak dikirim: backend membuatnya sendiri dari nama event dan
// menolak key yang tidak dikenal dengan 400.
export type EventPayload = {
  name: string
  place: string
  item: string
  requirement: string
  eventDate: string
  openTime: string
  closeTime: string
  slotMinutes: number
  slotCapacity: number
  counterCount: number
  serviceSeconds: number
  description: string
  // null = periode jual belum ditentukan; baru wajib saat diajukan
  saleStartsAt: string | null
  saleEndsAt: string | null
  feeBearer: FeeBearer
  feePercentBp: number
  feeFlat: number
  organizerId?: string
}

export type CategoryPayload = {
  name: string
  description: string
  sortOrder: number
  isSeated: boolean
  // null untuk kategori berkursi; backend menolak kuota di kategori berkursi
  quota: number | null
}

export type PackagePayload = {
  name: string
  pax: number
  price: number
  quota?: number | null
  sortOrder: number
  isActive: boolean
}

export type ImageKind = 'poster' | 'gallery'

export type EventImage = {
  id: string
  kind: ImageKind
  url: string
  width: number
  height: number
  alt: string
  sortOrder: number
}
