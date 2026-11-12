// Urutan tab jangkar sama dengan urutan bagian di halaman. id dipakai sebagai
// anchor (#tiket) dan sebagai kunci IntersectionObserver.
export const DETAIL_TABS = [
  { id: 'tentang', label: 'Tentang' },
  { id: 'tiket', label: 'Tiket' },
  { id: 'penukaran', label: 'Penukaran' },
  { id: 'lokasi', label: 'Lokasi' },
  { id: 'faq', label: 'FAQ' },
] as const

export type DetailTabId = (typeof DETAIL_TABS)[number]['id']

// Dibuat sekali di sini supaya referensinya stabil untuk dependency effect.
export const DETAIL_TAB_IDS: readonly DetailTabId[] = DETAIL_TABS.map((tab) => tab.id)

// Tinggi header publik + tab jangkar yang menempel. Dipakai scroll-margin tiap
// bagian supaya judulnya tidak tertutup saat tab diklik.
export const SECTION_SCROLL_MARGIN = 'scroll-mt-[calc(var(--spacing-header)+56px)]'

export const VENUE = {
  name: 'Summarecon Mall Bandung',
  address: 'Jl. Gedebage Selatan, Bandung',
  mapsUrl: 'https://maps.google.com/?q=Summarecon+Mall+Bandung',
}

// Jawaban diturunkan dari docs/prd.md (5.7, 5.8, dan batas pesanan di lampiran).
// Kalau aturan di PRD berubah, teks di sini ikut diubah, jangan dibiarkan beda.
export const FAQ_ITEMS = [
  {
    question: 'Bisakah tiket yang sudah dibayar dibatalkan?',
    answer:
      'Untuk saat ini belum bisa. Pesanan yang sudah dibayar tidak bisa dibatalkan sendiri. Selama pesanan masih menunggu pembayaran, kamu masih bisa membatalkannya dari halaman pesanan.',
  },
  {
    question: 'Apakah setiap orang harus membawa KTP?',
    answer:
      'Ya. Satu tiket untuk satu orang, dan di loket petugas mencocokkan nama di tiket dengan KTP pemegangnya. Nomor KTP tidak diminta saat membeli dan tidak disimpan.',
  },
  {
    question: 'Kategori pakai kursi, nomor kursinya ada di mana?',
    answer:
      'Untuk kategori berlabel Pakai kursi, kamu memilih kursi di denah saat checkout. Nomor kursinya, misalnya C12, tertulis di e-ticket tiap orang.',
  },
  {
    question: 'Berapa orang paling banyak dalam satu pesanan?',
    answer:
      'Paling banyak 10 orang per pesanan. Yang dihitung jumlah orangnya, jadi satu paket Couple terhitung 2 orang.',
  },
  {
    question: 'Bagaimana kalau saya terlewat jam tukar yang dipilih?',
    answer:
      'Tiket tetap bisa ditukar. Kamu masuk antrean umum di loket, jadi mungkin menunggu lebih lama dibanding yang datang sesuai slotnya. Begitu juga kalau lupa memilih jam tukar.',
  },
] as const
