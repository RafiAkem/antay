// Bentuk data katalog publik dan akun pembeli (PRD fase 0 dan 1).
// Mengikuti kontrak endpoint yang sedang dibangun di backend; kalau backend
// berubah, berkas ini ikut diubah di commit yang sama.
import type { EventDetail } from './api'

export type Customer = {
  id: string
  email: string
  name: string
  phone: string
}

export type RegisterPayload = {
  email: string
  password: string
  name: string
  phone: string
}

export type CatalogPackage = {
  id: string
  name: string
  pax: number
  price: number
  pricePerPax: number
  // null berarti paket tanpa batas sendiri, ikut kuota kategori
  left: number | null
}

export type CatalogCategory = {
  id: string
  name: string
  description: string
  sortOrder: number
  isSeated: boolean
  priceFrom: number | null
  left: number
  soldOut: boolean
  packages: CatalogPackage[]
}

// Event publik v2 = event v1 ditambah data jualan.
export type CatalogEvent = EventDetail & {
  description: string
  posterUrl: string
  saleStartsAt: string | null
  saleEndsAt: string | null
  onSale: boolean
  priceFrom: number | null
  left: number
}

export type GalleryImage = {
  url: string
  width: number
  height: number
  alt: string
}

export type CatalogEventDetail = CatalogEvent & {
  categories: CatalogCategory[]
  gallery: GalleryImage[]
}

export type QuoteItemInput = {
  packageId: string
  quantity: number
}

export type QuotePayload = {
  eventId: string
  items: QuoteItemInput[]
  promoCode?: string
}

export type QuoteLine = {
  packageId: string
  packageName: string
  categoryId: string
  categoryName: string
  pax: number
  quantity: number
  unitPrice: number
  lineTotal: number
  discountAmount: number
}

export type AppliedDiscount = {
  discountId: string
  name: string
  kind: 'auto' | 'code'
  code: string
  amount: number
}

export type Quote = {
  eventId: string
  items: QuoteLine[]
  totalPax: number
  subtotal: number
  discountTotal: number
  fee: number
  total: number
  appliedDiscounts: AppliedDiscount[]
  // alasan kode promo ditolak, null kalau tidak ada kode atau kodenya terpakai
  promoRejection: string | null
}

// Denah kursi publik. Kursi yang ditahan dan yang terjual sama-sama "taken"
// supaya pembeli tidak bisa menebak pesanan orang lain.
export type SeatStatus = 'available' | 'taken' | 'disabled'

export type SeatMapStage = {
  x: number
  y: number
  width: number
  height: number
  label: string
}

export type SeatMapLayout = {
  canvasWidth: number
  canvasHeight: number
  stage: SeatMapStage
}

export type SeatMapBlock = {
  id: string
  code: string
  name: string
  categoryId: string
  categoryName: string
}

export type SeatMapSeat = {
  id: string
  label: string
  row: string
  number: number
  x: number
  y: number
  blockId: string
  categoryId: string
  status: SeatStatus
}

export type SeatMap = {
  layout: SeatMapLayout
  blocks: SeatMapBlock[]
  seats: SeatMapSeat[]
}
