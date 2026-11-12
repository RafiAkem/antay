# PRD SummaPass: Ticketing dan Penukaran Tiket Summarecon Mall Bandung

| | |
|---|---|
| Versi | 2.0 (revisi setelah brief Summarecon 10 November 2026) |
| Status | Draf untuk dikerjakan tim |
| Pemilik | TeamNusa |
| Acuan | `BBC_2026_Kebutuhan_Ticketing_Summarecon.pdf`, diskusi tim 11 November 2026 |

---

## 1. Kenapa revisi ini ada

Versi 1 memposisikan SummaPass sebagai sistem **penukaran** tiket: e-ticket dibeli di
platform lain (Loket.com), lalu SummaPass mengatur jam datang ke loket. Brief dari
Mas Adit (PIC Summarecon, 10 November 2026) menunjukkan masalah utama mereka
justru ada di **proses beli**:

| # | Kebutuhan Summarecon | Status di versi 1 |
|---|---|---|
| 01 | Kategori (VIP A, VIP B, VIP C, Festival) dan paket (Single, Couple, Group) yang mudah dipahami | Belum ada |
| 02 | Pilih nomor kursi saat memesan | Belum ada |
| 03 | Atur diskon, harga setelah diskon dihitung otomatis | Belum ada, kolom harga pun belum ada |
| 04 | Alur sederhana, nyaman di ponsel | Sebagian, alur pengunjung sudah mobile |

Antre penukaran di lokasi tidak ada di brief, tapi tim menilainya masih jadi
masalah, misalnya saat Summaba jadi titik tukar gelang VIP Persib (Januari 2026).
Bagian ini jadi pembeda, bukan masalah utama yang diminta Summarecon.
Jadi SummaPass versi 2 mencakup perjalanan penuh dalam satu sistem milik mal:

> **Beli** (kategori, paket, kursi, diskon, bayar) → **e-ticket** → **pilih jam
> tukar** → **tukar di loket** → **data ke dasbor mal**

Bagian beli menjawab empat kebutuhan di atas. Bagian tukar adalah pembeda SummaPass
dari platform tiket biasa, dan sudah berjalan di versi 1.

## 2. Tujuan

1. Pembeli bisa memahami pilihan tiket dan menyelesaikan pembelian dari ponsel
   tanpa bingung, termasuk event dengan banyak kategori dan paket.
2. Penyelenggara bisa mengatur sendiri kategori, paket, harga, kursi, diskon, dan
   biaya layanan tanpa bantuan developer.
3. Pembayaran berjalan sungguhan lewat payment gateway, dan harga yang ditampilkan
   selalu sama dengan yang ditagih.
4. Penukaran di lokasi tetap tertib: kedatangan tersebar per slot jam, petugas cek
   tiket dalam hitungan detik.
5. Mal punya data penjualan dan kehadiran dari setiap event di satu dasbor.

### Ukuran keberhasilan

| Ukuran | Target |
|---|---|
| Langkah dari halaman event sampai halaman bayar | Paling banyak 4 layar |
| Lebar layar minimum yang tetap nyaman dipakai | 360 px |
| Kursi atau kuota terjual ganda | 0, dijamin oleh kunci di database |
| Selisih harga di layar dengan tagihan gateway | 0 |
| Waktu cek satu tiket di loket | Di bawah 10 detik |

### Di luar cakupan versi 2

- Refund otomatis lewat gateway. Refund dicatat manual oleh admin.
- Pencairan dana (payout) ke penyelenggara. Dasbor hanya menampilkan laporan.
- Denah kursi bentuk bebas seperti gambar venue. Versi 2 memakai denah grid.
- Login dengan Google atau nomor HP (OTP).
- Pengiriman e-ticket lewat WhatsApp. Versi 2 lewat email dan halaman akun.
- Kamera AI penghitung antrean. Masih di prototipe lama, dipindahkan di fase
  terpisah.

## 3. Pengguna dan peran

| Peran | Siapa | Akun |
|---|---|---|
| `customer` | Pembeli dan pemegang tiket | Wajib punya akun |
| `organizer` | Penyelenggara event (EO, klub bola, promotor) | Dibuatkan admin mal |
| `admin` | Manajemen Summarecon Mall Bandung | Dibuat lewat seed |
| `staff` | Petugas loket penukaran | Dibuatkan admin mal |

Akun pembeli disimpan terpisah dari akun internal (`customers` dan `users`),
dengan cookie sesi yang berbeda. Alasannya: pembeli mendaftar sendiri dari
internet, sedangkan akun internal dibuat oleh mal. Kalau dipisah, celah di satu
sisi tidak otomatis membuka sisi lainnya.

### Siapa boleh apa

| Aksi | customer | organizer | staff | admin |
|---|:-:|:-:|:-:|:-:|
| Lihat dan beli tiket event yang sudah tayang | ✓ | | | |
| Lihat pesanan dan tiket milik sendiri | ✓ | | | |
| Buat dan ubah event, kategori, paket, kursi, diskon | | ✓ event sendiri | | ✓ semua |
| Ajukan event untuk tayang | | ✓ | | ✓ |
| Setujui atau tolak event tayang | | | | ✓ |
| Lihat penjualan event | | ✓ event sendiri | | ✓ semua |
| Cek dan tukar tiket di loket, koreksi antrean | | | ✓ | ✓ |
| Kelola akun organizer dan staff | | | | ✓ |

## 4. Alur utama

### 4.1 Pembeli

1. **Masuk atau daftar.** Email, kata sandi, nama, nomor WhatsApp. Pembeli boleh
   melihat event tanpa login. Login diminta saat menekan tombol beli, lalu pembeli
   dikembalikan ke halaman yang sama.
2. **Pilih event** dari daftar event yang sedang dijual.
3. **Pilih kategori.** Kategori tampil sebagai kartu: nama, harga mulai dari, sisa
   kuota, dan label "Pakai kursi" bila berlaku. Kategori yang habis tetap terlihat
   dengan label habis, tidak disembunyikan.
4. **Pilih paket di dalam kategori.** Single, Couple, Group, masing-masing dengan
   jumlah orang dan harganya. Pembeli bisa mengambil lebih dari satu paket.
5. **Pilih kursi** bila kategori pakai kursi. Jumlah kursi yang harus dipilih sama
   dengan total orang di paket yang diambil. Kursi tidak harus bersebelahan.
6. **Isi nama pemegang tiket** per orang, sesuai KTP. Nama pertama otomatis diisi
   nama pembeli.
7. **Ringkasan harga.** Harga per paket, diskon otomatis yang berlaku, kolom kode
   promo, biaya layanan bila dibebankan ke pembeli, lalu total.
8. **Bayar** lewat payment gateway (QRIS, Virtual Account, e-wallet, kartu).
   Selama menunggu bayar, kursi dan kuota ditahan dan ada hitung mundur.
9. **E-ticket terbit** setelah pembayaran terkonfirmasi: satu kode dan QR per
   orang, dikirim ke email dan tampil di halaman akun.
10. **Pilih jam tukar** di loket, dari slot berkuota. Default satu jam untuk
    semua tiket di pesanan; bisa diubah per tiket.
11. **Datang dan tukar** di loket pada slot yang dipilih.

Langkah 3 sampai 7 ada di satu halaman checkout yang bertahap, bukan lima halaman
terpisah, supaya pembeli selalu melihat total yang sedang dibangunnya.

### 4.2 Penyelenggara

1. Buat event: nama, deskripsi, poster, tempat, tanggal, periode penjualan.
2. Tambah kategori. Untuk tiap kategori: nama, deskripsi singkat, urutan tampil,
   pakai kursi atau tidak, kuota bila tanpa kursi.
3. Tambah paket per kategori: nama, jumlah orang, harga, kuota paket (opsional).
4. Buat denah kursi untuk kategori yang pakai kursi (lihat 5.4).
5. Buat diskon (lihat 5.5).
6. Atur biaya layanan: dibebankan ke pembeli atau ditanggung penyelenggara.
7. Atur penukaran: item yang ditukar, syarat bawaan, jam buka loket, durasi slot,
   kuota per slot, jumlah loket. Ini pengaturan event versi 1.
8. Pratinjau halaman beli seperti yang dilihat pembeli, lalu ajukan untuk tayang.

### 4.3 Admin mal

Menyetujui atau menolak event yang diajukan (dengan alasan bila ditolak), mengelola
akun organizer dan staff, melihat dasbor semua event, mencatat refund manual.

### 4.4 Petugas loket

Sama dengan versi 1, ditambah **scan QR** dari kamera perangkat. Hasil cek
sekarang juga menampilkan kategori, paket, dan nomor kursi.

## 5. Kebutuhan fungsional

Setiap bagian ditutup dengan kriteria terima. Fitur dianggap selesai bila semua
kriterianya lolos.

### 5.1 Akun pembeli

- Daftar dengan email, kata sandi (minimal 8 karakter), nama, nomor WhatsApp.
- Email unik, disimpan dalam huruf kecil.
- Login, logout, lihat profil, ubah nama dan nomor WhatsApp.
- Lupa kata sandi lewat tautan email (fase 1 boleh menyusul di akhir fase).

**Kriteria terima**
- Daftar dengan email yang sudah ada ditolak dengan pesan yang tidak membocorkan
  apakah email itu terdaftar atau tidak saat login.
- Login gagal 10 kali dari satu IP dalam 10 menit memicu `429`.
- Pembeli tidak bisa membuka pesanan atau tiket milik pembeli lain (`404`).

### 5.2 Event dan status tayang

Status event: `draft` → `review` → `published` → `closed`. Admin bisa menolak
`review` kembali ke `draft` dengan alasan. Event `published` bisa dibatalkan admin
menjadi `cancelled`.

- Hanya event `published` yang tampil di halaman publik.
- Penjualan hanya terbuka di antara `saleStartsAt` dan `saleEndsAt`.
- Setelah ada pesanan yang dibayar, harga paket dan denah kursi yang sudah terjual
  tidak boleh diubah. Kuota boleh ditambah, tidak boleh dikurangi di bawah yang
  sudah terjual.

**Kriteria terima**
- Organizer tidak bisa melihat atau mengubah event organizer lain (`404`).
- Event `draft` tidak bisa dibeli walau id-nya diketahui.

### 5.3 Kategori dan paket (kebutuhan 01)

- Kategori punya urutan tampil yang diatur penyelenggara.
- Harga ditentukan per **kombinasi kategori dan paket**, bukan dihitung dari harga
  per orang. Contoh: VIP A Single Rp500.000, VIP A Couple Rp900.000.
- Jumlah orang per paket 1 sampai 10.
- Kuota kategori tanpa kursi dihitung dalam **orang**, bukan jumlah paket. Satu
  paket Couple memakai 2 kuota.
- Kuota kategori dengan kursi sama dengan jumlah kursi aktif di denahnya.
- Paket bisa dinonaktifkan tanpa dihapus.

**Tampilan pembeli**
- Kategori dulu, baru paket. Tidak pernah menampilkan semua kombinasi dalam satu
  daftar panjang. Ini jawaban langsung untuk keluhan "daftar pilihan panjang dan
  membingungkan".
- Di kartu kategori: "Mulai Rp450.000", sisa kuota, label kursi.
- Di pilihan paket: nama, ikon jumlah orang, harga, dan harga per orang sebagai
  keterangan kecil supaya pembeli bisa membandingkan.

**Kriteria terima**
- Event Tahun Baru dengan 4 kategori × 3 paket tampil sebagai 4 kartu kategori,
  dan setiap kartu membuka 3 paket.
- Kategori yang kuotanya habis tetap tampil dengan label "Habis" dan tidak bisa
  dipilih.

### 5.4 Kursi (kebutuhan 02)

**Membuat denah (penyelenggara)**
- Generator grid per kategori: label baris (misal A sampai J) dan jumlah kursi per
  baris.
- Klik kursi untuk menandai **tidak dipakai** (lorong, tiang, kursi teknis).
- Baris boleh punya jumlah kursi berbeda.
- Kode kursi: `{baris}{nomor}`, misal `C12`.

**Memilih kursi (pembeli)**
- Denah tampil dengan warna status: tersedia, dipilih, terjual atau ditahan, tidak
  dipakai. Warna tidak boleh jadi satu-satunya pembeda; kursi terjual juga diberi
  tanda silang supaya terbaca oleh pengguna buta warna.
- Di ponsel denah bisa digeser dan diperbesar; kursi minimal 32 px saat diperbesar.
- Jumlah kursi yang bisa dipilih dibatasi total orang di paket yang diambil.
- Kursi tidak harus bersebelahan.

**Penahanan kursi**
- Kursi berpindah ke status `held` saat pesanan dibuat, bukan saat diklik. Klik
  hanya pilihan sementara di perangkat pembeli.
- Saat pesanan dibuat, server mengunci baris kursi (`SELECT ... FOR UPDATE`).
  Bila salah satu kursi sudah tidak tersedia, seluruh pesanan ditolak dengan
  `409 SEAT_TAKEN` dan daftar kursi yang bentrok, lalu denah dimuat ulang.
- Penahanan berakhir bersamaan dengan batas bayar pesanan (15 menit).

**Kriteria terima**
- Dua pembeli yang mengirim pesanan untuk kursi yang sama pada saat bersamaan:
  tepat satu berhasil, satunya `409 SEAT_TAKEN`. Dibuktikan dengan tes konkuren.
- Pesanan kedaluwarsa melepaskan kursinya dan kursi itu bisa dibeli lagi.

### 5.5 Harga dan diskon (kebutuhan 03)

**Jenis diskon**

| Atribut | Pilihan |
|---|---|
| Cara berlaku | `auto` (langsung terpasang, misal early bird) atau `code` (pembeli mengetik kode promo) |
| Bentuk potongan | `percent` (persen) atau `amount` (nominal rupiah) |
| Cakupan | Seluruh event, satu kategori, atau satu paket |
| Batasan opsional | Periode berlaku, kuota pemakaian total, batas per pembeli, minimal belanja, potongan maksimal (untuk persen) |
| Bisa digabung | `stackable` ya atau tidak |

Early bird adalah diskon `auto` dengan periode berlaku dan, bila perlu, kuota
pemakaian (misal "100 pembeli pertama").

**Urutan perhitungan** (selalu di server, dalam rupiah bulat)

1. `subtotal` = jumlah harga paket × jumlah.
2. Kumpulkan diskon yang berlaku: semua `auto` yang lolos syarat, ditambah kode
   promo bila diisi dan valid.
3. Diskon `auto` dipasang lebih dulu, lalu kode promo. Di dalam tiap kelompok,
   diurutkan dari yang dibuat paling awal.
4. Diskon persen dihitung dari **sisa harga baris yang tercakup** setelah diskon
   sebelumnya, lalu dibulatkan ke bawah ke rupiah dan dipotong batas maksimalnya.
5. Bila ada diskon yang `stackable = false`, server membandingkan dua kemungkinan:
   diskon itu sendirian, atau gabungan semua diskon yang `stackable`. Yang dipakai
   adalah yang membuat total paling murah untuk pembeli.
6. Total diskon tidak pernah melebihi subtotal.
7. Biaya layanan dihitung dari harga setelah diskon (lihat 5.6).
8. `total` = subtotal − diskon + biaya layanan bila dibebankan ke pembeli.

**Contoh**

| Baris | Nilai |
|---|---|
| VIP A Couple × 1 | Rp900.000 |
| Festival Single × 2 | Rp500.000 |
| **Subtotal** | **Rp1.400.000** |
| Early bird 10%, maks Rp100.000 (auto) | −Rp100.000 (10% = Rp140.000, dipotong batas) |
| Kode `BOBOTOH` Rp50.000, min belanja Rp500.000 | −Rp50.000 |
| Setelah diskon | Rp1.250.000 |
| Biaya layanan 2%, dibebankan ke pembeli | +Rp25.000 |
| **Total dibayar** | **Rp1.275.000** |

**Tampilan pembeli**
- Harga coret dan harga setelah diskon di kartu paket bila ada diskon `auto`.
- Rincian di ringkasan: nama tiap diskon dan potongannya, bukan cuma satu angka.
- Kode promo yang ditolak menyebut alasannya: kedaluwarsa, kuota habis, belum
  mencapai minimal belanja, atau tidak berlaku untuk kategori ini.

**Penyelenggara**
- Saat membuat diskon, ada pratinjau: "Paket VIP A Couple Rp900.000 menjadi
  Rp810.000".

**Kriteria terima**
- Contoh di atas menghasilkan angka yang sama persis lewat `POST .../quote` dan
  di tagihan gateway. Dibuktikan dengan unit test perhitungan.
- Kuota pemakaian diskon tidak bisa terlampaui oleh pesanan bersamaan.
- Kuota pemakaian dihitung saat pesanan **dibayar**, dan dikembalikan bila
  pesanan kedaluwarsa. Selama menunggu bayar, pemakaian ditahan seperti kursi.

### 5.6 Biaya layanan

- Diatur per event: `feeBearer` = `buyer` atau `organizer`.
- Besarnya: persen dari harga setelah diskon, nominal per pesanan, atau keduanya.
- Bila `buyer`, biaya tampil sebagai baris terpisah di ringkasan dan masuk total.
- Bila `organizer`, pembeli tidak melihatnya; laporan penyelenggara menampilkan
  pendapatan kotor, biaya layanan, dan pendapatan bersih.

### 5.7 Checkout dan pembayaran

**Gateway**: Midtrans Snap, mode sandbox selama pengembangan dan lomba. Mode
produksi butuh akun merchant atas nama badan usaha; ini disiapkan Summarecon.
Kode gateway ditaruh di belakang satu interface `PaymentGateway`, supaya bisa
diganti ke Xendit tanpa menyentuh logika pesanan.

**Status pesanan**

```
pending ──bayar──▶ paid
   │                 │
   ├─lewat batas───▶ expired
   ├─dibatalkan────▶ cancelled
   │
   └─bayar setelah expired, kursi sudah diambil orang─▶ paid_unfulfilled ──▶ refunded (manual)
paid ──refund manual──▶ refunded
```

**Aturan**
- Membuat pesanan wajib mengirim header `Idempotency-Key`. Kiriman ulang dengan
  kunci yang sama mengembalikan pesanan yang sama, bukan membuat pesanan baru.
- Batas bayar 15 menit. Job berkala menandai pesanan lewat batas sebagai `expired`
  dan melepas kursi, kuota, dan pemakaian diskon.
- **Webhook** dari gateway:
  - Tanda tangan diverifikasi sebelum apa pun dibaca.
  - Status pembayaran selalu dikonfirmasi ulang ke API gateway, tidak hanya
    dipercaya dari isi webhook.
  - Webhook yang sama datang dua kali tetap hanya menerbitkan tiket sekali.
  - Setiap notifikasi disimpan mentah di tabel `payments` untuk audit.
- Pembayaran yang datang setelah pesanan `expired`: bila kursi dan kuota masih
  tersedia, pesanan langsung jadi `paid`. Bila tidak, jadi `paid_unfulfilled` dan
  muncul di daftar tindakan admin untuk direfund.
- Pesanan dengan total Rp0 (gratis atau diskon penuh) langsung `paid` tanpa ke
  gateway. Event gratis versi 1 tetap bisa berjalan lewat jalur ini.
- Pembeli bisa membatalkan pesanan yang masih `pending`. Pesanan `paid` tidak bisa
  dibatalkan sendiri di versi 2.

**Kriteria terima**
- Simulasi pembayaran sandbox sukses menerbitkan tiket dalam 5 detik setelah
  webhook diterima.
- Webhook dengan tanda tangan salah ditolak `401` dan tidak mengubah apa pun.
- Pesanan yang tidak dibayar melepaskan kursinya paling lambat 1 menit setelah
  batas bayar.

### 5.8 E-ticket dan penukaran

- Satu tiket per orang. Paket Couple menghasilkan 2 tiket, masing-masing dengan
  kode, QR, nama pemegang, kategori, paket, dan nomor kursi bila ada.
- Kode tiket mengikuti format versi 1: prefix event dua huruf dan kode acak.
- Email konfirmasi berisi ringkasan pesanan dan tautan ke tiket. QR tidak
  dilampirkan sebagai gambar di email; pembeli membukanya di halaman akun.
- Pilih jam tukar: slot berkuota dari pengaturan penukaran event. Aturan slot
  versi 1 berlaku (slot penuh dan yang sudah lewat terkunci, saran slot paling
  sepi).
- Tiket yang belum memilih jam tukar tetap bisa ditukar, tapi masuk antrean umum
  di loket. Ini supaya tiket tidak hangus hanya karena pembeli lupa memilih jam.
- Di loket: scan QR atau ketik kode, cocokkan nama dengan KTP, serahkan item.
  Tiket dobel, tiket event lain, dan tiket dari pesanan yang belum dibayar ditolak.

**Kriteria terima**
- Scan QR tiket yang sudah ditukar menampilkan `409` dengan jam dan loket
  penukaran sebelumnya.

### 5.9 Papan antrean dan dasbor

- Papan antrean: sama dengan versi 1.
- Dasbor penyelenggara (event sendiri) dan admin (semua event):
  - Penjualan: tiket terjual per kategori dan paket, pendapatan kotor, total
    diskon, biaya layanan, pendapatan bersih.
  - Pemakaian diskon: berapa kali tiap diskon dipakai dan total potongannya.
  - Kursi: denah dengan status terjual.
  - Penukaran: terdaftar, sudah ditukar, belum datang per slot (versi 1).
- Unduh daftar pesanan sebagai xlsx.

## 6. Kebutuhan nonfungsional

| Area | Ketentuan |
|---|---|
| Uang | Selalu `bigint` rupiah di database dan integer di JSON. Tidak ada float di mana pun. |
| Zona waktu | Semua jam event dan slot dihitung di `Asia/Jakarta`, tidak bergantung zona waktu server. Ini juga memperbaiki event demo versi 1 yang jamnya tergeser di server. |
| Konkurensi | Kursi, kuota kategori, kuota paket, kuota slot, dan kuota diskon dikunci di transaksi database. |
| Keamanan | Sesi pembeli dan sesi internal memakai cookie berbeda, keduanya `HttpOnly; SameSite=Strict`, plus CSRF double submit seperti versi 1. Webhook dikecualikan dari CSRF tapi wajib lolos verifikasi tanda tangan. |
| Batas request | Daftar, login, buat pesanan, cek kode promo, dan batalkan pesanan dibatasi per IP. Cek kode promo juga dibatasi per akun supaya kode tidak bisa ditebak beruntun. |
| Data pribadi | Nomor KTP tidak pernah diminta atau disimpan. Nomor WhatsApp hanya dipakai untuk kontak pesanan. |
| Ponsel | Desain mulai dari lebar 360 px. Target sentuh minimal 44 px. Tombol utama checkout selalu terlihat di bawah layar. |
| Aksesibilitas | Status kursi tidak hanya dibedakan dengan warna. Semua form punya label. |
| Kontrak API | Mengikuti `docs/api-contract.md`: envelope, camelCase, kode error, UUID. |
| Observabilitas | Setiap perubahan status pesanan dan setiap webhook dicatat dengan `traceId`. |

## 7. Model data

Perubahan terhadap skema versi 1. Semua primary key UUID.

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `organizers` | `name`, `contact_email`, `contact_phone`, `is_active` | Baru |
| `users` | + `organizer_id` | Role bertambah `organizer`; wajib berisi `organizer_id` bila role `organizer` |
| `customers` | `email` (unik), `password_hash`, `name`, `phone`, `is_active` | Baru, terpisah dari `users` |
| `events` | + `organizer_id`, `description`, `poster_url`, `sale_starts_at`, `sale_ends_at`, `fee_bearer`, `fee_percent_bp`, `fee_flat`, `rejection_reason` | Status jadi `draft`, `review`, `published`, `closed`, `cancelled`. Persen disimpan dalam basis poin (`250` = 2,5%) supaya tetap integer |
| `ticket_categories` | `event_id`, `name`, `description`, `sort_order`, `is_seated`, `quota` | `quota` diisi bila tanpa kursi |
| `packages` | `category_id`, `name`, `pax`, `price`, `quota`, `sort_order`, `is_active` | `quota` opsional, dalam jumlah paket |
| `seats` | `category_id`, `row_label`, `number`, `status`, `held_by_order_id`, `held_until` | Unik per (`category_id`, `row_label`, `number`). Status `available`, `held`, `sold`, `disabled` |
| `discounts` | `event_id`, `name`, `kind`, `code`, `value_type`, `value`, `max_amount`, `min_subtotal`, `category_id`, `package_id`, `starts_at`, `ends_at`, `usage_limit`, `per_customer_limit`, `used_count`, `held_count`, `stackable`, `is_active` | `code` unik per event, tidak peka huruf besar-kecil |
| `orders` | `code`, `customer_id`, `event_id`, `status`, `subtotal`, `discount_total`, `fee`, `total`, `expires_at`, `paid_at`, `payment_method`, `gateway_order_id`, `idempotency_key` | Unik per (`customer_id`, `idempotency_key`) |
| `order_items` | `order_id`, `package_id`, `quantity`, `unit_price`, `discount_amount`, `line_total` | `unit_price` disalin saat pesan, tidak membaca ulang harga paket |
| `order_discounts` | `order_id`, `discount_id`, `amount` | Diskon apa saja yang terpasang |
| `payments` | `order_id`, `provider`, `provider_transaction_id`, `status`, `payload` (jsonb), `received_at` | Log mentah setiap notifikasi |
| `tickets` | + `order_id`, `order_item_id`, `category_id`, `seat_id`, `holder_name`; `slot_start` boleh kosong | `visitor_name` diganti `holder_name`. Status bertambah `void` untuk tiket dari pesanan yang direfund |

## 8. API

Konvensi mengikuti `docs/api-contract.md`. Yang baru ditulis lengkap di kontrak
saat endpoint-nya dibangun; daftar ini untuk perencanaan.

**Publik** (`/public/v1`, tanpa sesi)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/events` | Event `published`, dengan harga mulai dari dan sisa kuota |
| GET | `/events/{eventId}` | Detail, kategori, paket, harga, diskon `auto` yang aktif |
| GET | `/events/{eventId}/categories/{categoryId}/seats` | Denah dan status kursi |
| GET | `/events/{eventId}/board` | Papan antrean (versi 1) |

`POST /public/v1/tickets` dari versi 1 dihapus setelah alur pesanan jalan. Tiket
gratis lewat pesanan bertotal Rp0.

**Pembeli** (`/customer/v1`, sesi `antay_customer_session`)

| Method | Path | Fungsi |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Akun |
| GET, PATCH | `/me` | Profil |
| POST | `/orders/quote` | Hitung harga tanpa menahan apa pun |
| POST | `/orders` | Buat pesanan, tahan kursi dan kuota, minta transaksi gateway. Wajib `Idempotency-Key` |
| GET | `/orders`, `/orders/{orderId}` | Riwayat dan detail |
| POST | `/orders/{orderId}/cancellations` | Batalkan pesanan `pending` |
| GET | `/tickets`, `/tickets/{code}` | Tiket milik sendiri |
| PATCH | `/tickets/{code}/redemption-slot` | Pilih atau ganti jam tukar |

**Webhook** (`/webhooks/v1`, tanpa sesi, tanpa CSRF, wajib tanda tangan)

| Method | Path | Fungsi |
|---|---|---|
| POST | `/payments/midtrans` | Notifikasi pembayaran |

**Operasional** (`/operational/v1`, sesi internal)

| Method | Path | Peran |
|---|---|---|
| CRUD | `/events`, `/events/{eventId}/categories`, `/categories/{categoryId}/packages` | organizer, admin |
| PUT | `/categories/{categoryId}/seat-map` | organizer, admin |
| CRUD | `/events/{eventId}/discounts` | organizer, admin |
| POST | `/events/{eventId}/submissions` | organizer, admin |
| POST | `/events/{eventId}/approvals`, `/events/{eventId}/rejections` | admin |
| GET | `/events/{eventId}/orders` | organizer, admin |
| POST | `/orders/{orderId}/refunds` | admin (catat refund manual) |
| CRUD | `/organizers`, `/users` | admin |
| | Endpoint loket versi 1 | staff, admin |

**Analitik** (`/analytics/v1`): ringkasan penjualan, pemakaian diskon, dan
penukaran per event; ringkasan semua event untuk admin.

## 9. Urutan pengerjaan

Belum ada tenggat, jadi urutannya disusun supaya setiap fase bisa didemokan
sendiri dan fase berikutnya tidak membongkar fase sebelumnya.

| Fase | Isi | Menjawab | Bisa didemokan |
|---|---|---|---|
| 0. Fondasi | Zona waktu `Asia/Jakarta`, tabel `organizers`, role `organizer`, akun pembeli | | Daftar dan login pembeli |
| 1. Katalog | Kategori, paket, harga, status tayang, halaman beli mobile sampai ringkasan (tanpa bayar) | 01, 04 | Pilih kategori dan paket dari HP |
| 2. Kursi | Generator denah, pemilih kursi, penahanan kursi dengan tes konkuren | 02 | Pilih kursi, dua pembeli rebutan satu kursi |
| 3. Pembayaran | Pesanan, Midtrans sandbox, webhook, kedaluwarsa, e-ticket per orang, email | Bayar beneran | Beli sampai tiket terbit |
| 4. Diskon | Semua jenis diskon, aturan gabung, pratinjau penyelenggara, biaya layanan | 03 | Early bird + kode promo dalam satu pesanan |
| 5. Sambung ke penukaran | Pilih jam tukar per tiket, scan QR di loket, tampilan kursi di loket | Pembeda | Beli lalu tukar di loket |
| 6. Dasbor | Penjualan, diskon, kursi, unduh xlsx | Data untuk mal | Dasbor admin dan penyelenggara |
| 7. Presentasi | Data contoh event Tahun Baru (4 kategori × 3 paket), deck dan naskah baru | | Demo penuh |

Fase 4 bisa dikerjakan paralel dengan fase 2 karena perhitungan harga tidak
bergantung pada kursi. Fase 3 menunggu keduanya hanya di bagian pembuatan pesanan.

## 10. Keputusan yang sudah diambil

| Topik | Keputusan | Sumber |
|---|---|---|
| Arah produk | Ticketing penuh, penukaran di loket jadi pembeda | Diskusi tim |
| Pembayaran | Wajib sungguhan lewat gateway | Diskusi tim |
| Kursi | Pakai atau tidaknya diatur penyelenggara per kategori | Diskusi tim |
| Harga paket | Diatur per kombinasi kategori dan paket | Diskusi tim |
| Kursi paket | Tidak harus bersebelahan | Diskusi tim |
| Diskon | Semua jenis: early bird, kode promo, persen, nominal | Diskusi tim |
| Gabung diskon | Boleh, dengan aturan di 5.5 | Diskusi tim |
| Akun pembeli | Wajib | Diskusi tim |
| Penyelenggara | Peran sendiri | Diskusi tim |
| Biaya layanan | Diatur per event, dibebankan ke pembeli atau ditanggung penyelenggara | Diskusi tim |
| Antrean di lokasi | Masih masalah nyata, jadi pembeda | Penilaian tim, belum dikonfirmasi Summarecon |

## 11. Yang masih terbuka

| Pertanyaan | Usulan sementara |
|---|---|
| Gateway yang dipakai | Midtrans Snap, bisa diganti karena di belakang interface |
| Berapa besar biaya layanan default | 0, penyelenggara mengisi sendiri |
| Apakah event wajib disetujui admin mal sebelum tayang | Ya, karena mal bertanggung jawab atas atrium |
| Batas jumlah tiket per pesanan | 10 orang per pesanan |
| Apakah pembeli boleh memindahkan tiket ke orang lain | Belum di versi 2; nama pemegang bisa diubah sampai H-1 |
