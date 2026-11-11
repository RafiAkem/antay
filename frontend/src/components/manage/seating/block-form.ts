import type { SeatBlock, SeatBlockSpec, SeatLayout, SeatNumbering } from '@/types/seating'

// Isian panel disimpan sebagai teks supaya orang bisa menghapus angka lalu
// mengetik ulang tanpa input melompat ke 0. Slider tetap angka.
export type BlockForm = {
  categoryId: string
  code: string
  name: string
  rowCount: string
  seatsPerRow: string
  curve: number
  rotation: number
  seatSpacing: string
  rowSpacing: string
  firstRowLabel: string
  numbering: SeatNumbering
  aisles: string
}

export type FormIssues = Partial<Record<keyof SeatBlockSpec, string>>

export type ParsedForm = { spec: SeatBlockSpec | null; issues: FormIssues }

// Batasnya sama dengan validasi di server (domain/seating), supaya kesalahan
// ketahuan sebelum dikirim.
export const LIMITS = {
  rowCount: [1, 50],
  seatsPerRow: [1, 80],
  spacing: [16, 80],
} as const

const DEFAULTS = {
  rowCount: 5,
  seatsPerRow: 10,
  curve: 0,
  rotation: 0,
  seatSpacing: 28,
  rowSpacing: 32,
  firstRowLabel: 'A',
  numbering: 'ltr' as SeatNumbering,
}

const SHAPE_KEYS = [
  'code',
  'x',
  'y',
  'rotation',
  'rowCount',
  'seatsPerRow',
  'curve',
  'seatSpacing',
  'rowSpacing',
  'firstRowLabel',
  'numbering',
] as const

const PATCH_KEYS = [...SHAPE_KEYS, 'categoryId', 'name', 'sortOrder'] as const

export function toForm(block: SeatBlock): BlockForm {
  return {
    categoryId: block.categoryId,
    code: block.code,
    name: block.name,
    rowCount: String(block.rowCount),
    seatsPerRow: String(block.seatsPerRow),
    curve: block.curve,
    rotation: block.rotation,
    seatSpacing: String(block.seatSpacing),
    rowSpacing: String(block.rowSpacing),
    firstRowLabel: block.firstRowLabel,
    numbering: block.numbering,
    aisles: block.aisleAfter.join(', '),
  }
}

function intIn(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const number = Number(value)
  return number >= min && number <= max ? number : null
}

function parseAisles(text: string, seatsPerRow: number | null): number[] | null {
  const parts = text.split(',').map((part) => part.trim()).filter(Boolean)
  const result: number[] = []
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const number = Number(part)
    if (number < 1 || (seatsPerRow !== null && number >= seatsPerRow) || result.includes(number)) return null
    result.push(number)
  }
  return result.sort((a, b) => a - b)
}

export function parseForm(form: BlockForm, block: SeatBlock): ParsedForm {
  const issues: FormIssues = {}
  const code = form.code.trim()
  const name = form.name.trim()
  const rowCount = intIn(form.rowCount, ...LIMITS.rowCount)
  const seatsPerRow = intIn(form.seatsPerRow, ...LIMITS.seatsPerRow)
  const seatSpacing = intIn(form.seatSpacing, ...LIMITS.spacing)
  const rowSpacing = intIn(form.rowSpacing, ...LIMITS.spacing)
  const aisleAfter = parseAisles(form.aisles, seatsPerRow)

  if (!form.categoryId) issues.categoryId = 'Pilih kategori untuk blok ini.'
  if (!/^[A-Z0-9]{1,3}$/.test(code)) issues.code = 'Kode 1 sampai 3 huruf kapital atau angka.'
  if (name.length < 1 || name.length > 40) issues.name = 'Nama blok 1 sampai 40 karakter.'
  if (rowCount === null) issues.rowCount = 'Jumlah baris 1 sampai 50.'
  if (seatsPerRow === null) issues.seatsPerRow = 'Kursi per baris 1 sampai 80.'
  if (seatSpacing === null) issues.seatSpacing = 'Jarak kursi 16 sampai 80.'
  if (rowSpacing === null) issues.rowSpacing = 'Jarak baris 16 sampai 80.'
  if (!/^[A-Z]$/.test(form.firstRowLabel)) issues.firstRowLabel = 'Satu huruf A sampai Z.'
  if (aisleAfter === null) {
    issues.aisleAfter = 'Isi nomor kursi dipisah koma, tiap nomor sekali, dan lebih kecil dari jumlah kursi per baris.'
  }

  if (Object.keys(issues).length > 0) return { spec: null, issues }
  return {
    issues,
    spec: {
      categoryId: form.categoryId,
      code,
      name,
      x: block.x,
      y: block.y,
      rotation: form.rotation,
      rowCount: rowCount as number,
      seatsPerRow: seatsPerRow as number,
      curve: form.curve,
      seatSpacing: seatSpacing as number,
      rowSpacing: rowSpacing as number,
      firstRowLabel: form.firstRowLabel,
      numbering: form.numbering,
      aisleAfter: aisleAfter as number[],
      sortOrder: block.sortOrder,
    },
  }
}

function sameAisles(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

// Kursi perlu dihitung ulang hanya bila salah satu parameter bentuk berubah.
// Nama dan kategori tidak menggeser kursi.
export function shapeChanged(spec: SeatBlockSpec, block: SeatBlock): boolean {
  return SHAPE_KEYS.some((key) => spec[key] !== block[key]) || !sameAisles(spec.aisleAfter, block.aisleAfter)
}

// PATCH hanya membawa field yang berubah. Ini penting untuk blok yang terkunci:
// mengganti nama saja tetap boleh walau kursinya sudah terjual.
export function changedFields(spec: SeatBlockSpec, block: SeatBlock): Partial<SeatBlockSpec> {
  const patch: Partial<SeatBlockSpec> = {}
  for (const key of PATCH_KEYS) {
    if (spec[key] !== block[key]) Object.assign(patch, { [key]: spec[key] })
  }
  if (!sameAisles(spec.aisleAfter, block.aisleAfter)) patch.aisleAfter = spec.aisleAfter
  return patch
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function nextFreeCode(blocks: SeatBlock[]): string {
  const taken = new Set(blocks.map((block) => block.code))
  for (const letter of LETTERS) if (!taken.has(letter)) return letter
  for (const letter of LETTERS) {
    for (let digit = 1; digit <= 9; digit += 1) {
      if (!taken.has(`${letter}${digit}`)) return `${letter}${digit}`
    }
  }
  return 'Z99'
}

// Blok baru ditaruh di tengah kanvas. y digeser ke atas setengah kedalaman blok
// karena titik poros ada di baris depan, bukan di tengah blok.
export function newBlockSpec(categoryId: string, blocks: SeatBlock[], layout: SeatLayout): SeatBlockSpec {
  const code = nextFreeCode(blocks)
  const depth = (DEFAULTS.rowCount - 1) * DEFAULTS.rowSpacing
  return {
    ...DEFAULTS,
    categoryId,
    code,
    name: `Blok ${code}`,
    x: Math.round(layout.canvasWidth / 2),
    y: Math.round(layout.canvasHeight / 2 - depth / 2),
    aisleAfter: [],
    sortOrder: blocks.reduce((max, block) => Math.max(max, block.sortOrder + 1), 0),
  }
}
