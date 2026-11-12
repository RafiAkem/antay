// Hook checkout untuk halaman beli: membungkus reducer murni, menyimpan
// keranjang ke sessionStorage, dan meminta quote ke server dengan debounce.
// Halaman sebaiknya memberi key={event.id} supaya pindah event mulai dari nol.
import { useEffect, useMemo, useReducer, useState } from 'react'
import { ApiError } from '@/lib/api'
import { quoteOrder } from '@/lib/catalog-api'
import type { CatalogEventDetail, CatalogPackage, Quote, QuoteItemInput } from '@/types/catalog'
import {
  buildCtaLabel,
  canProceed as checkProceed,
  cartItems,
  createCheckoutReducer,
  createInitialState,
  findCategory,
  localSubtotal,
  maxQuantity as packageMax,
  stepsFor,
  totalPax as countPax,
  type CheckoutStep,
} from './checkout-state'
import { clearCheckout, loadCheckout, saveCheckout } from './checkout-storage'

const QUOTE_DEBOUNCE_MS = 300

export type CartLine = { pkg: CatalogPackage; quantity: number; lineTotal: number }

type QuoteResult = { key: string; quote: Quote | null; error: string | null }

function quoteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Total harga belum bisa dihitung. Coba lagi sebentar.'
}

// Quote dianggap segar hanya kalau isinya persis keranjang yang sekarang.
function quoteMatches(quote: Quote, items: QuoteItemInput[]): boolean {
  if (quote.items.length !== items.length) return false
  return items.every((item) => quote.items.some((line) => line.packageId === item.packageId && line.quantity === item.quantity))
}

// initialCategoryId datang dari ?category= di URL, initialSeatCode dari ?seat=
// (kursi yang diketuk di denah halaman event). Cuma dipakai kalau tidak ada
// keranjang tersimpan, supaya tautan dari halaman event tidak menghapus pilihan lama.
export function useCheckout(
  event: CatalogEventDetail,
  buyerName = '',
  isLoggedIn = false,
  initialCategoryId: string | null = null,
  initialSeatCode: string | null = null,
) {
  const reducer = useMemo(() => createCheckoutReducer(event, buyerName), [event, buyerName])
  const [state, dispatch] = useReducer(reducer, event, (initial) => {
    const restored = loadCheckout(initial, buyerName)
    if (restored?.categoryId) return restored
    const base = restored ?? createInitialState(initial.id)
    if (!initialCategoryId) return base
    return reducer(
      base,
      initialSeatCode
        ? { type: 'pickSeat', categoryId: initialCategoryId, seatCode: initialSeatCode }
        : { type: 'selectCategory', categoryId: initialCategoryId },
    )
  })

  // Nama pembeli sering baru datang setelah sesi selesai dimuat.
  useEffect(() => {
    if (buyerName) dispatch({ type: 'applyBuyerName', name: buyerName })
  }, [buyerName])

  useEffect(() => {
    saveCheckout(state)
  }, [state])

  const category = useMemo(() => findCategory(event, state.categoryId), [event, state.categoryId])
  const pendingCategory = useMemo(() => findCategory(event, state.pendingCategoryId), [event, state.pendingCategoryId])
  const steps = useMemo(() => stepsFor(category), [category])
  const items = useMemo(() => cartItems({ quantities: state.quantities }, category), [state.quantities, category])
  const packagesInCart = useMemo<CartLine[]>(
    () =>
      (category?.packages ?? [])
        .filter((pkg) => (state.quantities[pkg.id] ?? 0) > 0)
        .map((pkg) => ({ pkg, quantity: state.quantities[pkg.id], lineTotal: pkg.price * state.quantities[pkg.id] })),
    [state.quantities, category],
  )
  const totalPax = countPax(state, category)
  const subtotal = localSubtotal(state, category)

  // Kunci permintaan kosong artinya memang tidak perlu quote (belum masuk atau
  // keranjang kosong). Status loading diturunkan dari kunci, bukan disimpan,
  // supaya tidak ada setState sinkron di dalam effect.
  // Kode promo ikut kunci, tapi yang dikirim hanya kode yang sudah ditekan
  // "Pakai" (state.promoCode), bukan isi kolom yang sedang diketik.
  const promoCode = state.promoCode.trim()
  const requestKey = isLoggedIn && items.length > 0 ? JSON.stringify({ items, promoCode }) : ''
  const [result, setResult] = useState<QuoteResult>({ key: '', quote: null, error: null })

  useEffect(() => {
    if (!requestKey) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      quoteOrder({ eventId: event.id, items, ...(promoCode ? { promoCode } : {}) }, controller.signal).then(
        (quote) => setResult({ key: requestKey, quote, error: null }),
        (error: unknown) => {
          if (controller.signal.aborted) return
          setResult({ key: requestKey, quote: null, error: quoteErrorMessage(error) })
        },
      )
    }, QUOTE_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [event.id, items, promoCode, requestKey])

  const settled = requestKey !== '' && result.key === requestKey
  const quote = requestKey === '' ? null : result.quote
  const quoteLoading = requestKey !== '' && !settled
  const quoteError = settled ? result.error : null
  const quoteFresh = settled && quote !== null && quoteMatches(quote, items)
  const check = checkProceed(state, event)
  const ctaLabel = buildCtaLabel(state.step, quoteFresh && quote ? quote.total : subtotal)

  const actions = useMemo(
    () => ({
      selectCategory: (categoryId: string) => dispatch({ type: 'selectCategory', categoryId }),
      pickSeat: (categoryId: string, seatCode: string) => dispatch({ type: 'pickSeat', categoryId, seatCode }),
      confirmSwitchCategory: () => dispatch({ type: 'confirmSwitchCategory', confirm: true }),
      cancelSwitchCategory: () => dispatch({ type: 'confirmSwitchCategory', confirm: false }),
      setQuantity: (packageId: string, quantity: number) => dispatch({ type: 'setQuantity', packageId, quantity }),
      setSeats: (seatCodes: string[]) => dispatch({ type: 'setSeats', seatCodes }),
      toggleSeat: (seatCode: string) => dispatch({ type: 'toggleSeat', seatCode }),
      setHolder: (index: number, name: string) => dispatch({ type: 'setHolder', index, name }),
      setPromoCode: (code: string) => dispatch({ type: 'setPromoCode', code }),
      goTo: (step: CheckoutStep) => dispatch({ type: 'goTo', step }),
      next: () => dispatch({ type: 'next' }),
      back: () => dispatch({ type: 'back' }),
      // Dipanggil juga setelah pesanan berhasil dibuat supaya keranjang lama
      // tidak muncul lagi saat pembeli membuka event yang sama.
      reset: () => {
        clearCheckout(event.id)
        dispatch({ type: 'reset' })
      },
    }),
    [event.id],
  )

  const maxQuantity = (packageId: string): number => {
    const pkg = category?.packages.find((item) => item.id === packageId)
    return category && pkg ? packageMax(state, category, pkg) : 0
  }

  return {
    state,
    ...actions,
    category,
    pendingCategory,
    needsSwitchConfirm: pendingCategory !== null,
    steps,
    items,
    packagesInCart,
    totalPax,
    subtotal,
    seatsRemaining: category?.isSeated ? Math.max(0, totalPax - state.seatCodes.length) : 0,
    maxQuantity,
    quote,
    quoteLoading,
    quoteError,
    quoteFresh,
    canProceed: check.ok,
    blockReason: check.reason,
    ctaLabel,
  }
}

export type CheckoutController = ReturnType<typeof useCheckout>
