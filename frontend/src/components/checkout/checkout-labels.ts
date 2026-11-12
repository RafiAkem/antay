// Teks dan pemetaan kecil untuk halaman checkout. Dipisah dari komponen supaya
// berkas .tsx hanya mengekspor komponen (fast refresh oxlint).
import type { CheckoutStep } from './checkout-state'

export const STEP_TITLES: Record<CheckoutStep, string> = {
  category: 'Kategori',
  package: 'Paket',
  seats: 'Kursi',
  holders: 'Pemegang tiket',
  summary: 'Ringkasan',
}

export const STEP_HEADINGS: Record<CheckoutStep, string> = {
  category: 'Pilih kategori tiket',
  package: 'Pilih paket',
  seats: 'Pilih kursi',
  holders: 'Nama pemegang tiket',
  summary: 'Ringkasan pesanan',
}

export function stepProgress(steps: CheckoutStep[], step: CheckoutStep): string {
  const index = steps.indexOf(step)
  return `Langkah ${index + 1} dari ${steps.length}`
}

// Kode alasan dari server stabil dan snake_case (backend domain/pricing).
// Kode baru yang belum dikenal ditampilkan apa adanya daripada disembunyikan.
const PROMO_REJECTIONS: Record<string, string> = {
  unknown_code: 'Kode promo tidak dikenal.',
  inactive: 'Kode promo belum berlaku.',
  not_started: 'Kode promo belum berlaku.',
  expired: 'Kode promo sudah kedaluwarsa.',
  quota_exhausted: 'Kuota kode promo sudah habis.',
  customer_limit: 'Kamu sudah memakai kode ini.',
  not_applicable: 'Kode ini tidak berlaku untuk tiket yang dipilih.',
  min_subtotal: 'Belum mencapai minimal belanja kode ini.',
  not_combinable: 'Kode ini tidak bisa digabung dengan diskon yang sedang berlaku.',
  no_effect: 'Kode ini tidak mengubah total.',
}

export function promoRejectionText(code: string): string {
  return PROMO_REJECTIONS[code] ?? code
}

export function loginPath(next: string): string {
  return `/account/login?next=${encodeURIComponent(next)}`
}
