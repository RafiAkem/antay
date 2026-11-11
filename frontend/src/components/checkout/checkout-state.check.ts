// Cek kecil tanpa test runner. Jalankan manual, misalnya:
//   npx tsx -e "import('./src/components/checkout/checkout-state.check.ts').then(m=>console.log(m.runCheckoutChecks()))"
// Hasilnya daftar kegagalan; array kosong artinya semua lolos. Tidak dipasang ke aplikasi.
import type { CatalogCategory, CatalogEventDetail, CatalogPackage } from '@/types/catalog'
import { promoRejectionText } from './checkout-labels'
import { buildCtaLabel, canProceed, createCheckoutReducer, createInitialState, stepsFor, totalPax, type CheckoutAction, type CheckoutState } from './checkout-state'
import { sanitizeCheckoutState } from './checkout-storage'
import { formatRupiah } from './format-rupiah'

function pkg(id: string, pax: number, price: number, left: number | null = null): CatalogPackage {
  return { id, name: id, pax, price, pricePerPax: Math.round(price / pax), left }
}

function category(id: string, isSeated: boolean, packages: CatalogPackage[], left = 100): CatalogCategory {
  return { id, name: id, description: '', sortOrder: 0, isSeated, priceFrom: null, left, soldOut: left <= 0, packages }
}

// Event contoh dibuat lewat cast karena field event v1 tidak relevan untuk state checkout.
function sampleEvent(): CatalogEventDetail {
  const base = { id: 'evt-1', onSale: true, categories: [
    category('festival', false, [pkg('fes-single', 1, 250_000), pkg('fes-group', 4, 900_000, 1)]),
    category('vip', true, [pkg('vip-single', 1, 500_000), pkg('vip-couple', 2, 900_000)]),
  ] }
  return base as unknown as CatalogEventDetail
}

function run(event: CatalogEventDetail, actions: CheckoutAction[], buyerName = 'Budi'): CheckoutState {
  const reducer = createCheckoutReducer(event, buyerName)
  return actions.reduce(reducer, createInitialState(event.id))
}

export function runCheckoutChecks(): string[] {
  const failures: string[] = []
  const expect = (label: string, actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`${label}: dapat ${JSON.stringify(actual)}, harusnya ${JSON.stringify(expected)}`)
    }
  }
  const event = sampleEvent()
  const festival = event.categories[0]
  const vip = event.categories[1]

  // Batas 10 orang: stepper dipotong, dan state yang terlanjur lebih ditolak.
  const capped = run(event, [{ type: 'selectCategory', categoryId: 'festival' }, { type: 'setQuantity', packageId: 'fes-single', quantity: 15 }])
  expect('pax dipotong ke 10', totalPax(capped, festival), 10)
  const crowded = run(event, [{ type: 'selectCategory', categoryId: 'festival' }, { type: 'setQuantity', packageId: 'fes-single', quantity: 8 }, { type: 'setQuantity', packageId: 'fes-group', quantity: 1 }])
  expect('group tidak muat setelah 8 orang', crowded.quantities['fes-group'] ?? 0, 0)
  const forced: CheckoutState = { ...capped, step: 'package', quantities: { 'fes-single': 11 } }
  expect('alasan batas pax', canProceed(forced, event).reason, 'Maksimal 10 orang per pesanan.')
  const packageLeft = run(event, [{ type: 'selectCategory', categoryId: 'festival' }, { type: 'setQuantity', packageId: 'fes-group', quantity: 2 }])
  expect('kuota paket dihormati', packageLeft.quantities['fes-group'], 1)
  const empty = run(event, [{ type: 'selectCategory', categoryId: 'festival' }])
  expect('alasan keranjang kosong', canProceed(empty, event).reason, 'Pilih minimal satu paket.')

  // Langkah kursi hanya untuk kategori pakai kursi.
  expect('langkah tanpa kursi', stepsFor(festival), ['category', 'package', 'holders', 'summary'])
  expect('langkah dengan kursi', stepsFor(vip), ['category', 'package', 'seats', 'holders', 'summary'])
  const skipped = run(event, [{ type: 'selectCategory', categoryId: 'festival' }, { type: 'setQuantity', packageId: 'fes-single', quantity: 1 }, { type: 'next' }])
  expect('next melompati kursi', skipped.step, 'holders')
  const seated = run(event, [{ type: 'selectCategory', categoryId: 'vip' }, { type: 'setQuantity', packageId: 'vip-couple', quantity: 1 }, { type: 'next' }, { type: 'toggleSeat', seatCode: 'A1' }])
  expect('next ke kursi', seated.step, 'seats')
  expect('alasan kursi kurang', canProceed(seated, event).reason, 'Pilih 1 kursi lagi.')
  expect('next tertahan di kursi', run(event, [{ type: 'selectCategory', categoryId: 'vip' }, { type: 'setQuantity', packageId: 'vip-couple', quantity: 1 }, { type: 'next' }, { type: 'next' }]).step, 'seats')

  // Pemegang tiket ikut jumlah orang, nama pertama dari pembeli.
  const grown = run(event, [{ type: 'selectCategory', categoryId: 'vip' }, { type: 'setQuantity', packageId: 'vip-couple', quantity: 2 }])
  expect('holders tumbuh', grown.holders, ['Budi', '', '', ''])
  const shrunk = run(event, [{ type: 'selectCategory', categoryId: 'vip' }, { type: 'setQuantity', packageId: 'vip-couple', quantity: 2 }, { type: 'setHolder', index: 1, name: 'Sari' }, { type: 'setQuantity', packageId: 'vip-couple', quantity: 1 }])
  expect('holders menyusut dan nama tetap', shrunk.holders, ['Budi', 'Sari'])

  // Ganti kategori saat keranjang berisi harus dikonfirmasi dulu.
  const filled = run(event, [{ type: 'selectCategory', categoryId: 'festival' }, { type: 'setQuantity', packageId: 'fes-single', quantity: 2 }, { type: 'selectCategory', categoryId: 'vip' }])
  expect('ganti kategori ditahan', [filled.categoryId, filled.pendingCategoryId], ['festival', 'vip'])
  const reducer = createCheckoutReducer(event, 'Budi')
  const cancelled = reducer(filled, { type: 'confirmSwitchCategory', confirm: false })
  expect('batal ganti kategori', [cancelled.categoryId, cancelled.pendingCategoryId, cancelled.quantities], ['festival', null, { 'fes-single': 2 }])
  const switched = reducer(filled, { type: 'confirmSwitchCategory', confirm: true })
  expect('ganti kategori mengosongkan keranjang', [switched.categoryId, switched.quantities, switched.holders], ['vip', {}, []])

  // Pemulihan dari storage membuang paket yang tidak dikenal.
  const restored = sanitizeCheckoutState(
    { eventId: 'evt-1', step: 'summary', categoryId: 'vip', quantities: { 'vip-single': 1, 'hilang': 3, 'fes-single': 2 }, seatCodes: ['A1', 'A1', 'B2'], holders: ['', 'Lain'], promoCode: 'BOBOTOH' },
    event,
    'Budi',
  )
  expect('restore buang id asing', restored?.quantities, { 'vip-single': 1 })
  expect('restore rapikan kursi dan nama', [restored?.seatCodes, restored?.holders], [['A1'], ['Budi']])
  expect('restore langkah valid', restored?.step, 'summary')
  expect('restore event lain ditolak', sanitizeCheckoutState({ eventId: 'evt-2' }, event), null)
  expect('restore sampah ditolak', sanitizeCheckoutState('rusak', event), null)

  // Label tombol utama.
  expect('format rupiah', formatRupiah(1_275_000), 'Rp1.275.000')
  expect('cta lanjut', buildCtaLabel('package', 900_000), 'Rp900.000 · Lanjut')
  expect('cta bayar', buildCtaLabel('summary', 1_275_000), 'Bayar Rp1.275.000')
  expect('cta kosong', buildCtaLabel('category', 0), 'Lanjut')

  // Alasan kode promo: kode dikenal diterjemahkan, kode baru tampil apa adanya.
  expect('promo kedaluwarsa', promoRejectionText('expired'), 'Kode promo sudah kedaluwarsa.')
  expect('promo belum mulai', promoRejectionText('not_started'), 'Kode promo belum berlaku.')
  expect('promo kode baru', promoRejectionText('region_locked'), 'region_locked')

  return failures
}
