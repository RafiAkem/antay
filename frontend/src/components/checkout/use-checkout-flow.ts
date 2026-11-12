// Lapisan di atas useCheckout yang tahu soal halaman: akun pembeli, redirect
// login, dan modal pembayaran. useCheckout sendiri tetap tidak tahu router.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCustomer } from '@/lib/customer-session'
import type { CatalogEventDetail } from '@/types/catalog'
import { loginPath } from './checkout-labels'
import { useCheckout } from './use-checkout'

export function useCheckoutFlow(event: CatalogEventDetail, initialCategoryId: string | null, initialSeatCode: string | null = null) {
  const { customer, loading: customerLoading } = useCustomer()
  const checkout = useCheckout(event, customer?.name ?? '', customer !== null, initialCategoryId, initialSeatCode)
  const navigate = useNavigate()
  const location = useLocation()
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { state, steps, quote, quoteFresh, quoteLoading, quoteError } = checkout
  // Melihat kategori dan paket boleh tanpa akun. Begitu mau lewat langkah
  // paket, pembeli harus masuk dulu; keranjangnya sudah aman di sessionStorage.
  const needsLogin = customer === null && steps.indexOf(state.step) >= steps.indexOf('package')

  let blockReason = checkout.blockReason
  if (!blockReason && needsLogin && customerLoading) blockReason = 'Memeriksa akunmu sebentar.'
  if (!blockReason && state.step === 'summary' && customer) {
    if (quoteError) blockReason = quoteError
    else if (quoteLoading || !quoteFresh) blockReason = 'Menghitung total pesanan.'
  }

  const total = quoteFresh && quote ? quote.total : checkout.subtotal
  // Angka lokal belum memuat diskon dan biaya layanan. Pembeli perlu tahu itu
  // supaya tidak kaget saat total di ringkasan berbeda.
  const totalNote = quoteFresh && quote ? null : customer ? (quoteLoading ? 'Menghitung diskon' : null) : 'Belum termasuk diskon dan biaya layanan'

  const onPrimary = () => {
    if (blockReason) return
    if (needsLogin) {
      navigate(loginPath(`${location.pathname}${location.search}`))
      return
    }
    if (state.step === 'summary') {
      setPaymentOpen(true)
      return
    }
    checkout.next()
  }

  return {
    checkout,
    customer,
    needsLogin,
    blockReason,
    total,
    totalNote,
    onPrimary,
    paymentOpen,
    closePayment: () => setPaymentOpen(false),
  }
}

export type CheckoutFlow = ReturnType<typeof useCheckoutFlow>
