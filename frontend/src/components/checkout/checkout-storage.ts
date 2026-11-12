// Simpan keranjang ke sessionStorage supaya redirect login di tengah checkout
// tidak membuat pembeli memilih ulang dari awal. Isi storage tidak dipercaya:
// setiap angka dicek ulang terhadap data event yang terbaru.
import type { CatalogEventDetail } from '@/types/catalog'
import {
  CHECKOUT_STEPS,
  applyQuantity,
  createInitialState,
  findCategory,
  firstBlockedStep,
  stepsFor,
  totalPax,
  type CheckoutState,
  type CheckoutStep,
} from './checkout-state'

const KEY_PREFIX = 'antay.checkout.'

export function checkoutStorageKey(eventId: string): string {
  return `${KEY_PREFIX}${eventId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStep(value: unknown): value is CheckoutStep {
  return typeof value === 'string' && (CHECKOUT_STEPS as readonly string[]).includes(value)
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function sanitizeCheckoutState(raw: unknown, event: CatalogEventDetail, buyerName = ''): CheckoutState | null {
  if (!isRecord(raw) || raw.eventId !== event.id) return null
  const base = createInitialState(event.id)
  const promoCode = typeof raw.promoCode === 'string' ? raw.promoCode : ''
  const category = findCategory(event, typeof raw.categoryId === 'string' ? raw.categoryId : null)
  if (!category || category.soldOut) return { ...base, promoCode }

  // Jumlah dimasukkan lewat applyQuantity supaya batas 10 orang dan kuota
  // terbaru ikut berlaku. Paket yang tidak ada di kategori ini otomatis gugur.
  let state: CheckoutState = { ...base, categoryId: category.id, step: 'package', promoCode }
  const quantities = isRecord(raw.quantities) ? raw.quantities : {}
  for (const pkg of category.packages) {
    const quantity = quantities[pkg.id]
    if (typeof quantity === 'number') state = applyQuantity(state, category, pkg, quantity, buyerName)
  }

  const pax = totalPax(state, category)
  const savedHolders = stringList(raw.holders)
  // Nama kosong di storage tidak menimpa nama pembeli yang baru saja terisi.
  const holders = state.holders.map((name, index) => savedHolders[index] || name)
  const seatCodes = category.isSeated ? [...new Set(stringList(raw.seatCodes))].slice(0, pax) : []
  state = { ...state, holders, seatCodes }

  // Langkah yang tersimpan tidak boleh melewati langkah pertama yang masih bermasalah.
  const steps = stepsFor(category)
  const wanted = isStep(raw.step) && steps.includes(raw.step) ? steps.indexOf(raw.step) : 1
  const allowed = steps.indexOf(firstBlockedStep(state, event))
  return { ...state, step: steps[Math.min(wanted, allowed)] }
}

export function loadCheckout(event: CatalogEventDetail, buyerName = ''): CheckoutState | null {
  try {
    const raw = sessionStorage.getItem(checkoutStorageKey(event.id))
    return raw ? sanitizeCheckoutState(JSON.parse(raw), event, buyerName) : null
  } catch {
    // Storage diblokir (mode privat) atau isinya rusak: mulai dari keranjang kosong.
    return null
  }
}

export function saveCheckout(state: CheckoutState): void {
  try {
    const key = checkoutStorageKey(state.eventId)
    if (state.categoryId === null && state.promoCode === '') sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify({ ...state, pendingCategoryId: null, pendingSeatCode: null }))
  } catch {
    // Gagal menyimpan bukan alasan untuk mengganggu pembeli, cukup diabaikan.
  }
}

export function clearCheckout(eventId: string): void {
  try {
    sessionStorage.removeItem(checkoutStorageKey(eventId))
  } catch {
    // sama seperti di atas
  }
}
