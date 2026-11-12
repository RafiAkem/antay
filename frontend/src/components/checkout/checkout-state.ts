// State checkout bertahap: kategori, paket, kursi, pemegang tiket, ringkasan.
// Sengaja murni tanpa React supaya bisa dicek dengan skrip biasa dan dipakai
// ulang saat memulihkan keranjang dari sessionStorage.
import type { CatalogCategory, CatalogEventDetail } from '@/types/catalog'
import { MAX_PAX_PER_ORDER, applyQuantity, totalPax } from './checkout-cart'
import { formatRupiah } from './format-rupiah'

export { MAX_PAX_PER_ORDER, applyQuantity, cartItems, localSubtotal, maxQuantity, resizeHolders, totalPax } from './checkout-cart'

export const CHECKOUT_STEPS = ['category', 'package', 'seats', 'holders', 'summary'] as const
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]

export type CheckoutState = {
  eventId: string
  step: CheckoutStep
  categoryId: string | null
  // Kategori yang mau dipilih padahal keranjang masih berisi. UI menanyakan
  // dulu, baru confirmSwitchCategory yang benar-benar mengosongkan keranjang.
  pendingCategoryId: string | null
  // Kursi yang diketuk di denah kategori bersamaan dengan pendingCategoryId.
  // Begitu pergantian kategori dikonfirmasi, kursi ini langsung jadi pilihan.
  pendingSeatCode: string | null
  quantities: Record<string, number>
  seatCodes: string[]
  holders: string[]
  promoCode: string
}

export type CheckoutAction =
  | { type: 'selectCategory'; categoryId: string }
  | { type: 'pickSeat'; categoryId: string; seatCode: string }
  | { type: 'confirmSwitchCategory'; confirm: boolean }
  | { type: 'setQuantity'; packageId: string; quantity: number }
  | { type: 'setSeats'; seatCodes: string[] }
  | { type: 'toggleSeat'; seatCode: string }
  | { type: 'setHolder'; index: number; name: string }
  | { type: 'applyBuyerName'; name: string }
  | { type: 'setPromoCode'; code: string }
  | { type: 'goTo'; step: CheckoutStep }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' }

export type ProceedCheck = { ok: true; reason: null } | { ok: false; reason: string }

export function createInitialState(eventId: string): CheckoutState {
  return { eventId, step: 'category', categoryId: null, pendingCategoryId: null, pendingSeatCode: null, quantities: {}, seatCodes: [], holders: [], promoCode: '' }
}

export function findCategory(event: CatalogEventDetail, categoryId: string | null): CatalogCategory | null {
  return categoryId ? (event.categories.find((item) => item.id === categoryId) ?? null) : null
}

export function stepsFor(category: CatalogCategory | null): CheckoutStep[] {
  return CHECKOUT_STEPS.filter((step) => step !== 'seats' || category?.isSeated === true)
}

function stepProblem(state: CheckoutState, event: CatalogEventDetail, category: CatalogCategory | null, step: CheckoutStep): string | null {
  const pax = totalPax(state, category)
  switch (step) {
    case 'category':
      if (!event.onSale) return 'Penjualan tiket event ini sedang tidak dibuka.'
      if (!category) return 'Pilih kategori dulu.'
      return category.soldOut || category.left <= 0 ? `Kategori ${category.name} sudah habis.` : null
    case 'package': {
      if (pax === 0) return 'Pilih minimal satu paket.'
      if (pax > MAX_PAX_PER_ORDER) return `Maksimal ${MAX_PAX_PER_ORDER} orang per pesanan.`
      if (category && pax > category.left) return `Sisa kuota kategori ini ${category.left} orang.`
      for (const pkg of category?.packages ?? []) {
        if (pkg.left !== null && (state.quantities[pkg.id] ?? 0) > pkg.left) return `Paket ${pkg.name} tinggal ${pkg.left}.`
      }
      return null
    }
    case 'seats': {
      if (!category?.isSeated) return null
      const missing = pax - state.seatCodes.length
      if (missing > 0) return `Pilih ${missing} kursi lagi.`
      return missing < 0 ? `Kursi kelebihan ${-missing}. Lepas sebagian pilihan.` : null
    }
    case 'holders': {
      const index = state.holders.findIndex((name) => name.trim() === '')
      return index >= 0 ? `Isi nama pemegang tiket ke-${index + 1}.` : null
    }
    case 'summary':
      return null
  }
}

// Langkah pertama yang masih bermasalah. Dipakai untuk membatasi lompatan maju
// dan untuk menaruh pembeli di langkah yang benar setelah keranjang dipulihkan.
export function firstBlockedStep(state: CheckoutState, event: CatalogEventDetail): CheckoutStep {
  const category = findCategory(event, state.categoryId)
  return stepsFor(category).find((step) => stepProblem(state, event, category, step) !== null) ?? 'summary'
}

// Cek dari langkah pertama sampai langkah sekarang, bukan cuma langkah ini,
// karena data event bisa berubah (kuota menipis) setelah langkah awal lewat.
export function canProceed(state: CheckoutState, event: CatalogEventDetail): ProceedCheck {
  const category = findCategory(event, state.categoryId)
  const steps = stepsFor(category)
  const index = steps.indexOf(state.step)
  for (const step of steps.slice(0, index < 0 ? steps.length : index + 1)) {
    const reason = stepProblem(state, event, category, step)
    if (reason) return { ok: false, reason }
  }
  return { ok: true, reason: null }
}

export function buildCtaLabel(step: CheckoutStep, amount: number): string {
  if (step === 'summary') return `Bayar ${formatRupiah(amount)}`
  return amount > 0 ? `${formatRupiah(amount)} · Lanjut` : 'Lanjut'
}

function switchCategory(state: CheckoutState, categoryId: string): CheckoutState {
  return { ...state, categoryId, pendingCategoryId: null, pendingSeatCode: null, step: 'package', quantities: {}, seatCodes: [], holders: [] }
}

function moveStep(state: CheckoutState, category: CatalogCategory | null, offset: 1 | -1): CheckoutState {
  const steps = stepsFor(category)
  const step = steps[steps.indexOf(state.step) + offset]
  return step && steps.includes(state.step) ? { ...state, step, pendingCategoryId: null, pendingSeatCode: null } : state
}

// Pembeli mengetuk kursi di denah kategori sebelum memilih paket. Kategorinya
// ikut terpilih dan kursi itu langsung tercentang. Jumlah orang belum ada di
// langkah ini, jadi selama paket kosong satu kursi dulu yang disimpan; sisanya
// dipilih di langkah Kursi setelah paketnya jelas.
function pickSeat(state: CheckoutState, event: CatalogEventDetail, current: CatalogCategory | null, categoryId: string, seatCode: string): CheckoutState {
  const target = findCategory(event, categoryId)
  if (!target || target.soldOut || !target.isSeated || !seatCode) return state
  if (target.id !== state.categoryId) {
    if (totalPax(state, current) > 0) return { ...state, pendingCategoryId: target.id, pendingSeatCode: seatCode }
    return { ...switchCategory(state, target.id), seatCodes: [seatCode] }
  }
  const pax = totalPax(state, current)
  let seatCodes = state.seatCodes
  if (pax === 0) seatCodes = [seatCode]
  else if (!seatCodes.includes(seatCode) && seatCodes.length < pax) seatCodes = [...seatCodes, seatCode]
  return { ...state, seatCodes, step: 'package', pendingCategoryId: null, pendingSeatCode: null }
}

export function createCheckoutReducer(event: CatalogEventDetail, buyerName = '') {
  return function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
    const category = findCategory(event, state.categoryId)
    switch (action.type) {
      case 'selectCategory': {
        const target = findCategory(event, action.categoryId)
        if (!target || target.soldOut) return state
        if (target.id === state.categoryId) return { ...state, step: 'package', pendingCategoryId: null, pendingSeatCode: null }
        return totalPax(state, category) > 0 ? { ...state, pendingCategoryId: target.id, pendingSeatCode: null } : switchCategory(state, target.id)
      }
      case 'pickSeat':
        return pickSeat(state, event, category, action.categoryId, action.seatCode)
      case 'confirmSwitchCategory': {
        if (!state.pendingCategoryId) return state
        if (!action.confirm) return { ...state, pendingCategoryId: null, pendingSeatCode: null }
        const switched = switchCategory(state, state.pendingCategoryId)
        return state.pendingSeatCode ? { ...switched, seatCodes: [state.pendingSeatCode] } : switched
      }
      case 'setQuantity': {
        const pkg = category?.packages.find((item) => item.id === action.packageId)
        return category && pkg ? applyQuantity(state, category, pkg, action.quantity, buyerName) : state
      }
      case 'setSeats':
        if (!category?.isSeated) return state
        return { ...state, seatCodes: [...new Set(action.seatCodes)].slice(0, totalPax(state, category)) }
      case 'toggleSeat': {
        if (!category?.isSeated) return state
        const picked = state.seatCodes.includes(action.seatCode)
        if (!picked && state.seatCodes.length >= totalPax(state, category)) return state
        const seatCodes = picked ? state.seatCodes.filter((code) => code !== action.seatCode) : [...state.seatCodes, action.seatCode]
        return { ...state, seatCodes }
      }
      case 'setHolder': {
        if (action.index < 0 || action.index >= state.holders.length) return state
        return { ...state, holders: state.holders.map((name, index) => (index === action.index ? action.name : name)) }
      }
      case 'applyBuyerName':
        if (!action.name || state.holders.length === 0 || state.holders[0] !== '') return state
        return { ...state, holders: [action.name, ...state.holders.slice(1)] }
      case 'setPromoCode':
        return { ...state, promoCode: action.code }
      case 'goTo': {
        const steps = stepsFor(category)
        const target = steps.indexOf(action.step)
        // Mundur selalu boleh, maju cuma sampai langkah pertama yang belum beres.
        return target >= 0 && target <= steps.indexOf(firstBlockedStep(state, event)) ? { ...state, step: action.step, pendingCategoryId: null, pendingSeatCode: null } : state
      }
      case 'next':
        return state.step !== 'summary' && canProceed(state, event).ok ? moveStep(state, category, 1) : state
      case 'back':
        return moveStep(state, category, -1)
      case 'reset':
        return createInitialState(state.eventId)
    }
  }
}
