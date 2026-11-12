# Arah UI SummaPass v2: marketplace event

Dokumen ini kontrak visual untuk semua yang mengerjakan frontend. Kalau ragu,
ikuti dokumen ini; kalau dokumen ini salah, ubah dokumennya dulu baru kodenya.

Acuan gayanya marketplace event modern: beranda per kota, kartu bergambar,
halaman event panjang, dan alur beli yang pendek. Yang diambil adalah susunan
dan cara kerjanya; identitas visual tetap milik SummaPass.

## Prinsip

1. **Foto dulu.** Event dijual lewat gambarnya. Kartu dan halaman detail dibuka
   dengan foto besar, teks di bawahnya.
2. **Harga selalu kelihatan.** "Mulai Rp450.000" di kartu, harga per baris di
   pilihan tiket, total berjalan di tombol utama.
3. **Satu langkah, satu keputusan.** Kategori, lalu paket, lalu kursi, lalu
   nama pemegang, lalu bayar. Tidak ada layar yang menanyakan dua hal sekaligus.
4. **Ponsel adalah layar utama.** Desain mulai di 360 px. Tombol beli menempel
   di bawah layar di ponsel.
5. **Datar dan rapat.** Hampir tanpa bayangan, garis tipis, metadata kecil.
   Informasinya rapat, bukan landing page penuh ruang kosong.

## Token

Token tetap tinggal di `frontend/src/styles/tokens.css`. Perubahan dari v1:

| Token | Nilai | Catatan |
|---|---|---|
| `--color-ground` | `#fafbfb` | Latar halaman, hampir putih netral |
| `--color-surface` | `#ffffff` | |
| `--color-ink` | `#0b1620` | Teks utama |
| `--color-muted` | `#536b75` | Metadata, tanggal, tempat |
| `--color-faint` | `#8a99a3` | Placeholder, teks nonaktif |
| `--color-border-soft` | `#e4e8eb` | Garis kartu dan pemisah |
| `--color-control` | `#ccd2d8` | Garis input |
| `--color-accent` | `#1747e6` | **Tetap biru SummaPass**, satu-satunya aksen |
| `--color-accent-ink` | `#0f2e99` | Teks di atas tint |
| `--color-tint-50/100/200` | tetap | Latar terpilih, stepper |
| `--color-promo` | `#d6004c` | Diskon dan harga promo. Hanya untuk diskon |
| `--color-promo-bg` | `#fff0f4` | |
| `--color-scarce` | `#b85c00` | Sisa sedikit, rating |
| `--color-scarce-bg` | `#fff4e5` | |
| `--color-positive` dkk | tetap | Sukses, kursi dipilih berhasil |
| `--color-negative` dkk | tetap | Galat |
| `--color-night` | `#08131b` | Hero gelap, layar papan, ticket stub |
| `--font-sans` | `"Plus Jakarta Sans", system-ui, sans-serif` | Satu keluarga, bobot 400/600/700 |
| `--font-mono` | tetap IBM Plex Mono | Kode tiket, nomor kursi, angka |
| `--radius-tag` | `4px` | Badge |
| `--radius-control` | `8px` | Tombol, input |
| `--radius-card` | `10px` | Kartu, foto |
| `--radius-sheet` | `16px` | Sudut atas bottom sheet |
| `--radius-pill` | `999px` | Chip filter |

Tidak ada gradien kecuali scrim gelap di atas foto untuk keterbacaan. Tidak ada
em dash di teks UI.

## Pola komponen

### Kartu event (`EventCard`)

```
┌──────────────┐
│ -20%         │  ← tab promo di kiri atas, hanya bila ada diskon auto
│    FOTO 1:1  │
│┌──────────┐  │
││★ Atrium  │  │  ← tab potongan warna ground: lokasi (pin) atau "Baru"
└┴──────────┴──┘
Judul event dua baris maksimal
Sab, 31 Des · 19.00
Mulai Rp450.000   (harga coret bila diskon)
```

Grid: 2 kolom di ponsel, 3 di tablet, 4 di desktop. Carousel horizontal untuk
baris bertema di beranda, dengan "Lihat semua".

### Halaman event

Urutan: galeri/poster → judul → daftar fakta singkat (tanggal, jam, tempat,
syarat bawaan, item yang ditukar) → "Mulai Rp…" + Beli tiket → tab jangkar
(Tentang · Tiket · Penukaran · Lokasi · FAQ) → isi tiap tab → event serupa.
Di ponsel, bar bawah lengket berisi harga mulai dan tombol Beli tiket.

### Alur beli (bottom sheet di ponsel, panel kanan lengket di desktop)

1. **Kategori**: daftar baris, termurah di atas. Tiap baris: nama, satu baris
   keterangan, "Mulai Rp…", label "Pakai kursi", bar ketersediaan (`scarce`
   bila sisa < 20%), "Habis" bila kosong.
2. **Paket** di dalam kategori: baris Single/Couple/Group dengan ikon jumlah
   orang, harga, harga per orang kecil, stepper jumlah.
3. **Kursi** (bila kategori pakai kursi): denah grid, legenda di atas, jumlah
   kursi tersisa untuk dipilih di bar bawah.
4. **Pemegang tiket**: satu input nama per orang.
5. **Ringkasan**: baris paket, diskon otomatis (warna promo), kolom kode promo
   dengan tombol Pakai dan Hapus, biaya layanan bila ada, total.
6. **Bayar**: tombol utama berisi total, misal "Bayar Rp1.275.000".

Tombol utama selalu menampilkan total berjalan: "Rp900.000 · Lanjut".

### Status

- Loading: skeleton berbentuk kartu dan baris, bukan spinner.
- Kosong dan galat: kalimat spesifik plus satu aksi.

## Struktur folder (frontend)

Navigasi publik: Beranda, Event, Tiket saya, Akun. Folder mengikuti navigasi:

| Area | `pages/` | `components/` |
|---|---|---|
| Beranda | `home/` | `home/` |
| Event (daftar dan detail) | `events/`, `events/detail/` | `events/`, `events/detail/` |
| Checkout | `checkout/` | `checkout/` (`category/`, `package/`, `seat/`, `summary/`) |
| Tiket saya | `tickets/` | `tickets/` |
| Akun (masuk, daftar) | `account/` | `account/` |
| Loket, papan, dasbor | tetap | tetap |

## Primitives

Kontrak beku untuk semua yang membangun halaman. Semua di `frontend/src/components/ui/`,
named export, tanpa pengetahuan domain. Mau ubah tanda tangan? Ubah bagian ini dulu.

| Berkas | Tanda tangan |
|---|---|
| `cn.ts` | `cn(...parts: Array<string \| false \| null \| undefined>): string` (gabung saja, tanpa tailwind-merge) |
| `container.tsx` | `Container({ size?: 'narrow' \| 'default' \| 'wide', className?, children })` lebar 720/1200/1440, gutter `px-gutter` |
| `section.tsx` | `Section({ pad?: 'none' \| 'sm' \| 'default', id?, labelledBy?, className?, children })` |
| `text.tsx` | `Heading({ level: 1 \| 2 \| 3, size?: 'display' \| 'xl' \| 'lg' \| 'md', id?, className?, children })`; size bawaan per level: 1 = xl, 2 = lg, 3 = md |
| `text.tsx` | `Paragraph({ tone?: 'default' \| 'muted', size?: 'sm' \| 'md', className?, children })` |
| `text.tsx` | `Label({ htmlFor?, className?, children })` jadi `<label>` bila ada htmlFor, selain itu `<span>` |
| `badge.tsx` | `Badge({ tone: 'promo' \| 'scarce' \| 'accent' \| 'neutral' \| 'positive', className?, children })`; `type BadgeTone` |
| `chip.tsx` | `Chip({ selected?, onClick?, icon?: ReactNode, disabled?, className?, children })` tombol dengan `aria-pressed` |
| `stepper.tsx` | `Stepper({ value: number, min? = 0, max? = Infinity, onChange: (value: number) => void, label: string, className? })` |
| `skeleton.tsx` | `Skeleton({ className? })` |
| `sheet.tsx` | `Sheet({ open, onClose: () => void, title: string, footer?: ReactNode, className?, children })` |
| `price.tsx` | `Price({ amount: number, original?: number, prefix?: string, size?: 'sm' \| 'md' \| 'lg', className? })` |
| `format-rupiah.ts` | `formatRupiah(amount: number): string` menghasilkan `"Rp1.275.000"` |
| `carousel.tsx` | `Carousel({ title: string, action?: ReactNode, className?, children })` tiap anak jadi satu item |
| `sticky-cta.tsx` | `StickyCta({ className?, children })` |
| `use-overlay.ts` | `useOverlay(open, onClose, panelRef)` dipakai Modal dan Sheet (Esc, kunci gulir, fokus berputar) |

Primitif v1 yang tetap, dengan tambahan yang tidak memutus pemakaian lama:

- `Button` dari `button.tsx`: `variant?: 'primary' | 'tint' | 'ghost' | 'danger'`, `size?: 'small' | 'default' | 'large'`, `block?: boolean` (baru: `tint`, `large`, `block`).
- `Card`, `CardHead`, `Field`, `Input`, `Checkbox`, `Modal`, `Pill`, `Empty`, `Select`, `ToastProvider`, `useToast`: API sama.

Catatan pemakaian:

- `formatRupiah` diimpor dari `@/components/ui/format-rupiah`, bukan dari `price.tsx`.
  Berkas komponen yang ikut mengekspor fungsi memicu peringatan fast refresh di oxlint.
- `Price` memakai warna promo hanya bila `original > amount`. Harga coret dibacakan "Harga awal".
- `Carousel` membungkus tiap anak dengan lebar 2,15 / 3,2 / 4 kartu (ponsel / tablet / desktop)
  dan menembus gutter Container di ponsel. Taruh di dalam `Container`, jangan diberi lebar sendiri.
- `StickyCta` di ponsel menutupi tab bar (z-30 di atas z-20), jadi halaman event dan checkout
  tidak menampilkan tab bar saat bar beli ada. Di desktop isinya tampil di tempatnya.
- `Sheet` jadi bottom sheet di bawah 1024px dan panel kanan 440px di desktop. Bentuknya diatur CSS.

### Layout dan rute

- `PublicLayout({ hero?: boolean })`. Tidak memberi gutter atau padding ke `<main>`:
  halaman wajib menyusun `Section` + `Container`. `hero` membuat header fixed transparan
  di atas foto (dengan scrim) dan berubah putih saat digulir; halaman hero ditaruh di grup
  rute `<Route element={<PublicLayout hero />}>` di `app.tsx`.
- Menu publik ada di `components/navigation/menu-items.ts` (`PUBLIC_MENU`): Beranda `/`,
  Event `/events`, Tiket saya `/tickets`, Akun `/account` (Akun hanya di tab bar ponsel;
  di desktop diwakili tautan Masuk ke `/account/login`). Papan antrean dan masuk petugas ada di footer.
- Halaman v1 (`/`, `/events`, `/events/:eventId`, `/board`) sementara dibungkus `LegacyFrame`
  di `app.tsx` supaya tetap punya gutter. Lepas bungkusnya saat halaman sudah memakai `Section`.

| Rute | Halaman |
|---|---|
| `/events/:eventId/checkout` | `pages/checkout/checkout-page.tsx` (`CheckoutPage`) |
| `/tickets` | `pages/tickets/tickets-page.tsx` (`TicketsPage`) |
| `/orders/:orderId` | `pages/tickets/order-page.tsx` (`OrderPage`) |
| `/account` | `pages/account/account-page.tsx` (`AccountPage`) |
| `/account/login` | `pages/account/login-page.tsx` (`CustomerLoginPage`) |
| `/account/register` | `pages/account/register-page.tsx` (`RegisterPage`) |

### Token tambahan di luar tabel

| Token | Nilai | Kegunaan |
|---|---|---|
| `--spacing-gutter` | `clamp(16px, 4vw, 48px)` | `px-gutter`, satu-satunya gutter halaman |
| `--spacing-header` | `56px` | Tinggi header publik (`h-header`) |
| `--spacing-tabbar` | `56px` | Tinggi tab bar ponsel tanpa safe area |
| `--animate-sheet-up`, `--animate-sheet-side`, `--animate-fade-in` | 240ms / 160ms | Masuknya Sheet dan latar overlay |
| `--color-board` | `var(--color-night)` | Papan TV sekarang memakai warna malam |
