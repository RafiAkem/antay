// Hitungan keranjang: jumlah orang, subtotal, batas stepper, dan pemegang tiket.
// Dipisah dari checkout-state.ts supaya berkas itu tetap ringkas; semua yang
// di sini juga diekspor ulang dari sana, jadi pemakai cukup impor satu tempat.
import type { CatalogCategory, CatalogPackage, QuoteItemInput } from '@/types/catalog'
import type { CheckoutState } from './checkout-state'

export const MAX_PAX_PER_ORDER = 10

type Cart = Pick<CheckoutState, 'quantities'>

export function totalPax(state: Cart, category: CatalogCategory | null): number {
  return (category?.packages ?? []).reduce((sum, pkg) => sum + pkg.pax * (state.quantities[pkg.id] ?? 0), 0)
}

// Angka sementara sebelum quote server datang. Diskon dan biaya layanan hanya
// dihitung server, jadi ini cuma subtotal mentah.
export function localSubtotal(state: Cart, category: CatalogCategory | null): number {
  return (category?.packages ?? []).reduce((sum, pkg) => sum + pkg.price * (state.quantities[pkg.id] ?? 0), 0)
}

export function cartItems(state: Cart, category: CatalogCategory | null): QuoteItemInput[] {
  return (category?.packages ?? [])
    .filter((pkg) => (state.quantities[pkg.id] ?? 0) > 0)
    .map((pkg) => ({ packageId: pkg.id, quantity: state.quantities[pkg.id] }))
}

// Batas atas stepper. Kuota kategori dihitung dalam orang, kuota paket dalam
// jumlah paket, dan null di paket artinya cuma ikut kuota kategori.
export function maxQuantity(state: Cart, category: CatalogCategory, pkg: CatalogPackage): number {
  const pax = Math.max(1, pkg.pax)
  const others = totalPax(state, category) - (state.quantities[pkg.id] ?? 0) * pkg.pax
  const room = Math.min(MAX_PAX_PER_ORDER, category.left) - others
  return Math.max(0, Math.min(Math.floor(room / pax), pkg.left ?? Number.POSITIVE_INFINITY))
}

export function resizeHolders(holders: string[], count: number, buyerName: string): string[] {
  if (holders.length === count) return holders
  const next = holders.slice(0, count)
  while (next.length < count) next.push('')
  // Nama pembeli cuma diisikan saat daftar baru terbentuk, supaya kalau pembeli
  // sengaja mengosongkannya, mengubah jumlah paket tidak mengisinya lagi.
  if (holders.length === 0 && count > 0 && buyerName) next[0] = buyerName
  return next
}

// Jumlah selalu dipotong ke batas yang berlaku, jadi state tidak pernah memuat
// lebih dari 10 orang lewat stepper. Kursi dan pemegang ikut menyesuaikan.
export function applyQuantity(state: CheckoutState, category: CatalogCategory, pkg: CatalogPackage, quantity: number, buyerName: string): CheckoutState {
  const wanted = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0
  const next = Math.min(wanted, maxQuantity(state, category, pkg))
  if (next === (state.quantities[pkg.id] ?? 0)) return state
  const quantities = { ...state.quantities }
  if (next > 0) quantities[pkg.id] = next
  else delete quantities[pkg.id]
  const pax = totalPax({ quantities }, category)
  return { ...state, quantities, seatCodes: state.seatCodes.slice(0, pax), holders: resizeHolders(state.holders, pax, buyerName) }
}
