// Denah versi kelola (penyelenggara). Bedanya dengan SeatMap di catalog.ts:
// status held dan sold masih dipisah, dan blok membawa semua parameter bentuk
// yang dipakai generator di server.

export type SeatNumbering = 'ltr' | 'rtl'

export type ManageSeatStatus = 'available' | 'held' | 'sold' | 'disabled'

export type SeatStage = {
  x: number
  y: number
  width: number
  height: number
  label: string
}

export type SeatLayout = {
  canvasWidth: number
  canvasHeight: number
  stage: SeatStage
}

// x dan y adalah titik tengah baris terdepan (yang paling dekat panggung).
// rotation searah jarum jam di layar, berporos di titik itu.
export type SeatBlockSpec = {
  categoryId: string
  code: string
  name: string
  x: number
  y: number
  rotation: number
  rowCount: number
  seatsPerRow: number
  curve: number
  seatSpacing: number
  rowSpacing: number
  firstRowLabel: string
  numbering: SeatNumbering
  aisleAfter: number[]
  sortOrder: number
}

export type SeatBlock = SeatBlockSpec & {
  id: string
  categoryName: string
  seatCount: number
}

export type ManageSeat = {
  id: string
  label: string
  row: string
  number: number
  x: number
  y: number
  blockId: string
  categoryId: string
  status: ManageSeatStatus
}

export type ManageSeatMap = {
  layout: SeatLayout
  blocks: SeatBlock[]
  seats: ManageSeat[]
}

export type SeatBlockResult = {
  block: SeatBlock
  seatCount: number
  warnings: string[]
}

export type PreviewSeat = {
  label: string
  row: string
  number: number
  x: number
  y: number
}

export type SeatBlockPreview = {
  seats: PreviewSeat[]
  warnings: string[]
}

export type SeatStatusChange = {
  disable: string[]
  enable: string[]
}
