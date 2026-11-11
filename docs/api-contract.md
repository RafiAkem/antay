# Kontrak API Antay

Berlaku untuk backend Go (`backend/`) dan frontend React (`frontend/`). Kalau kode
dan dokumen ini berbeda, kode yang menang, lalu dokumen ini diperbarui di commit
yang sama.

## Aturan umum

- Base path per domain:

| Base path | Untuk | Sesi |
|---|---|---|
| `/public/v1` | halaman pengunjung, katalog, papan antrean, denah publik | tanpa sesi |
| `/customer/v1` | akun pembeli dan hitung harga | cookie `antay_customer_session` |
| `/operational/v1` | loket, kelola event, akun internal | cookie `antay_session` |
| `/analytics/v1` | dasbor manajemen | cookie `antay_session`, role admin |
| `/media/{fileName}` | berkas gambar unggahan | tanpa sesi, bukan JSON |

- Semua id adalah UUID string. Id di path yang bukan UUID dijawab `404`, sama
  seperti id yang tidak ada.
- Semua key JSON camelCase.
- Jam dikirim sebagai string `"HH:MM"` (24 jam). Di database disimpan sebagai
  menit sejak tengah malam.
- Tanggal dikirim `"YYYY-MM-DD"`.
- Titik waktu (periode jual, waktu pengajuan) dikirim RFC3339 dalam zona Jakarta,
  misalnya `"2026-12-01T10:00:00+07:00"`. Saat dikirim ke server boleh zona apa
  pun asal RFC3339.
- Uang dalam rupiah, bilangan bulat tanpa desimal. Persentase biaya dalam basis
  poin (`250` = 2,5%).
- Sukses:

```json
{
  "message": "Data retrieved",
  "data": {},
  "meta": { "timestamp": "2026-11-08T11:15:00+07:00", "version": "dev" }
}
```

- Gagal:

```json
{
  "error": {
    "message": "Slot itu sudah penuh.",
    "code": "SLOT_FULL",
    "traceId": "0f6b...",
    "details": [{ "field": "slotStart", "issue": "Sisa kuota 0" }]
  }
}
```

`details` opsional. `code` dipakai frontend untuk bercabang, `message` ditampilkan
apa adanya.

- `X-Request-ID` diterima dan dikembalikan. Semua respons memakai
  `Cache-Control: no-store`, kecuali `405` dari router dan berkas di `/media`.

## Status code

| Kode | Dipakai untuk |
|---|---|
| 200 | baca, update, aksi alur status, dan hapus kategori/paket/event (body berisi `id`) |
| 201 | tiket, event, kategori, paket, gambar, blok kursi, penyelenggara, akun, atau akun pembeli baru dibuat |
| 204 | logout, `GET /csrf`, hapus gambar, hapus blok kursi |
| 400 | body bukan JSON valid, key tidak dikenal, field kosong atau salah bentuk |
| 401 | tidak ada sesi / sesi kedaluwarsa, atau email dan kata sandi salah |
| 403 | sesi ada tapi role tidak cukup, atau token CSRF tidak cocok |
| 404 | event, kategori, paket, gambar, blok, akun, kode tiket, atau path tidak ada; juga data milik penyelenggara lain |
| 409 | tiket sudah ditukar, sudah dibatalkan, atau milik event lain; prefix event bentrok; email atau nama sudah dipakai; status event sudah berubah; kursi atau blok terkunci |
| 413 | `FILE_TOO_LARGE`, berkas unggahan melewati batas ukuran |
| 415 | `UNSUPPORTED_MEDIA_TYPE`, isi berkas bukan JPG, PNG, atau WebP |
| 422 | format benar tapi tidak lolos aturan bisnis (slot penuh, event sudah tutup, KTP belum dicentang, jam di luar slot, penjualan belum dibuka, event belum lengkap) |
| 429 | `RATE_LIMITED`, terlalu banyak request dari satu IP (IPv6 dihitung per /64); header `Retry-After` berisi detik tunggu |
| 500 | kesalahan tak terduga |
| 503 | database tidak siap (hanya endpoint health) |

Body JSON dibatasi 1 MB, harus berisi tepat satu objek JSON, dan tidak boleh
memuat `\u0000`. Unggahan gambar memakai `multipart/form-data` dengan batas sendiri
(lihat Gambar event).

### Kode error umum

| `code` | Status | Arti |
|---|---|---|
| `VALIDATION` | 400 | body tidak valid, key tidak dikenal, field wajib kosong atau salah bentuk |
| `UNAUTHORIZED` | 401 | tidak ada sesi atau sesi kedaluwarsa |
| `INVALID_CREDENTIALS` | 401 | email atau kata sandi salah saat login (internal maupun pembeli) |
| `FORBIDDEN` | 403 | role tidak cukup |
| `CSRF_MISSING` | 403 | header `X-CSRF-TOKEN` tidak ada atau tidak cocok dengan cookie |
| `NOT_FOUND` | 404 | data tidak ada, atau milik penyelenggara lain |
| `CONFLICT` | 409 | data bentrok dengan yang sudah ada (misalnya prefix event + tanggal) |
| `EMAIL_TAKEN` | 409 | email sudah dipakai akun lain (daftar pembeli, tambah akun internal) |
| `FILE_TOO_LARGE` | 413 | berkas unggahan melewati batas ukuran |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | isi berkas bukan JPG, PNG, atau WebP |
| `EVENT_NOT_EDITABLE` | 422 | status event tidak mengizinkan perubahan ini (kelola event, gambar, denah) |
| `ORGANIZER_INVALID` | 422 | penyelenggara tidak ada atau sudah nonaktif |
| `RATE_LIMITED` | 429 | terlalu banyak request dari satu IP |
| `INTERNAL` | 500 | kesalahan tak terduga; detailnya hanya di log server dengan `traceId` yang sama |

Kode khusus per endpoint ditulis di bagian masing-masing.

## Autentikasi

Ada dua sesi yang sengaja terpisah. Cookie-nya beda nama dan JWT-nya beda audiens
(`antay-internal` dan `antay-customer`), jadi menukar isi kedua cookie tetap
ditolak `401`.

### Sesi internal (petugas, admin, penyelenggara)

- `POST /operational/v1/auth/login` body `{ "email": "...", "password": "..." }`.
  Sukses `200` `{ "user": User }` + cookie `antay_session` (JWT RS256, HttpOnly,
  SameSite=Strict, umur sesuai `SESSION_TTL`). Akun organizer juga login di sini.
  - `400 VALIDATION` bila email atau kata sandi kosong (`details` per field)
  - `401 INVALID_CREDENTIALS` untuk email tidak dikenal, akun nonaktif, maupun
    kata sandi salah; pesan dan waktu responsnya sengaja sama supaya tidak
    membocorkan email yang terdaftar
  `429 RATE_LIMITED` setelah 10 percobaan dari satu IP dalam 10 menit.
- Batas per IP membaca `X-Real-IP` atau entri terakhir `X-Forwarded-For` hanya bila
  koneksi datang dari loopback atau jaringan privat (nginx di mesin yang sama atau
  di jaringan internal). Tanpa header itu di balik proxy, batas dilewati supaya
  semua pengunjung tidak berbagi satu kuota.
- `POST /operational/v1/auth/logout` → `204`, cookie dihapus. Butuh sesi.
- `GET /operational/v1/auth/me` → `200` `{ "user": User }`, `401` bila tanpa sesi
  atau akun sudah nonaktif. Logout dan me cukup sesi apa pun, termasuk organizer.
- Semua POST/PUT/PATCH/DELETE wajib mengirim header `X-CSRF-TOKEN` yang nilainya
  sama dengan cookie `antay_csrf`, termasuk login, unggah gambar, semua rute
  `/customer/v1`, dan `POST /public/v1/tickets`. Token diambil lewat `GET /csrf`
  (`204`). Bila tidak cocok, server menjawab `403 CSRF_MISSING` sebelum memeriksa
  sesi. Sesi pembeli memakai cookie CSRF yang sama.

Role: `staff`, `admin`, dan `organizer`. Admin lolos semua cek role. Organizer
tidak otomatis boleh membuka loket: rute loket mewajibkan role `staff`.

| Rute | Syarat |
|---|---|
| `POST /operational/v1/auth/login` | tanpa sesi |
| `POST /operational/v1/auth/logout`, `GET /operational/v1/auth/me` | sesi apa pun |
| `GET /operational/v1/events`, `/events/{eventId}/waiting`, `/events/{eventId}/queue`, `/tickets/...` | `staff` (atau admin) |
| `POST /operational/v1/events` | `admin` |
| `/operational/v1/manage/...` | `organizer` (atau admin) |
| `POST /operational/v1/manage/events/{eventId}/approvals`, `/rejections`, `/cancellations`, `/closures` | `admin` |
| `/operational/v1/organizers`, `/operational/v1/users` | `admin` |
| `/analytics/v1/...` | `admin` |

Organizer hanya melihat event yang `organizerId`-nya sama dengan miliknya. Event
penyelenggara lain, dan event lama tanpa penyelenggara, dijawab `404` (bukan `403`)
supaya keberadaannya tidak bocor. Admin melihat semua event.

```ts
type User = {
  id: string; email: string; name: string
  role: 'staff' | 'admin' | 'organizer'
  organizerId: string | null // selalu dikirim; null untuk staff dan admin
}
```

### Sesi pembeli

Lihat bagian Customer. Cookie `antay_customer_session` (JWT RS256, HttpOnly,
SameSite=Strict, umur sesuai `CUSTOMER_SESSION_TTL`, bawaan 24 jam). Rute yang
butuh sesi pembeli menjawab `401 UNAUTHORIZED` bila cookie tidak ada atau token
kedaluwarsa.

---

## Public (tanpa sesi)

### `GET /public/v1/events`

Sekarang dilayani katalog versi 2. Semua field `Event` versi 1 tetap ada (termasuk
`slots` dan `leftTotal`), lalu ditambah data jualan, jadi halaman lama tidak rusak.

Isinya event `published` yang tanggalnya hari ini atau nanti dan penjualannya
belum berakhir, urut tanggal lalu nama. Event yang penjualannya belum dibuka tetap
tampil dengan `onSale: false` supaya pembeli tahu kapan tiketnya dibuka.

```json
{ "events": [CatalogEvent] }
```

Perilaku yang berubah dari versi 1: daftar ini dulu hanya event `open` hari ini.
Sekarang event hari depan ikut tampil. Slot event hari depan tidak pernah
ditandai `past`. Memesan tiket versi 1 untuk event yang bukan hari ini tetap
ditolak `422 EVENT_CLOSED`.

### `GET /public/v1/events/{eventId}`

```json
{ "event": CatalogEventDetail }
```

Sama seperti daftar ditambah `categories` (urut `sortOrder` lalu nama) dan
`gallery` (urut urutan galeri). Hanya paket aktif yang dikirim. Event `published`
yang jualannya sudah selesai tetap bisa dibuka lewat tautan langsung, cuma
`onSale`-nya `false`.

`404 NOT_FOUND` bila event tidak ada atau tidak berstatus `published`.

### `GET /public/v1/events/{eventId}/seat-map`

Denah kursi untuk pembeli. Hanya event `published`; selain itu `404 NOT_FOUND`.
Event yang belum pernah menyimpan layout mendapat layout bawaan.

```json
{
  "layout": SeatLayout,
  "blocks": [{ "id": "uuid", "code": "A", "name": "Tribun Barat",
               "categoryId": "uuid", "categoryName": "VIP" }],
  "seats": [Seat]
}
```

`status` kursi di sini hanya `available`, `disabled`, atau `taken`. Kursi `held`
dan `sold` disatukan jadi `taken` supaya pembeli tidak bisa menebak kursi mana yang
cuma sedang ditahan. Respons tetap `no-store` karena status kursi berubah tiap ada
pesanan.

### `GET /public/v1/events/{eventId}/board`

Data untuk layar TV. `404` bila event tidak ada atau tidak `published`.

```json
{
  "event": {
    "id": "uuid", "name": "Pengambilan Race Pack Lari", "place": "Atrium utama",
    "item": "Race pack (BIB + jersey)", "requirement": "Bukti registrasi + KTP",
    "openTime": "10:00", "closeTime": "20:00", "slotMinutes": 30,
    "slotCapacity": 40, "counterCount": 3
  },
  "now": "11:15",
  "queue": Queue,
  "currentSlot": Slot | null,
  "nextOpenSlot": Slot | null,
  "upcoming": [Slot]
}
```

`upcoming` maksimal 4 slot yang belum lewat dan masih ada sisa, urut jam. Bila
semua slot tersisa sudah penuh, `upcoming` berisi 4 slot berikutnya meski penuh,
supaya pengunjung tahu jadwalnya. `nextOpenSlot` adalah slot pertama yang belum
lewat, bukan slot yang sedang berjalan, dan masih ada sisa.

### `POST /public/v1/tickets`

Body:

```json
{ "eventId": "uuid", "slotStart": "10:30", "visitorName": "Rizky Pratama" }
```

Aturan: `visitorName` 3 sampai 60 karakter setelah spasi dirapikan; `slotStart`
harus tepat di batas slot event dan belum lewat; kuota slot belum penuh.

Slot yang sedang berjalan masih boleh dipesan. Kode tiket `XX-XXXX`: prefix event
lalu 4 karakter dari `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (tanpa I, L, O, 0, 1).

- `201` `{ "ticket": Ticket }` dan header `Location: /public/v1/tickets/{code}`
- `400 VALIDATION` bila body tidak valid, `eventId`/`slotStart` kosong, atau nama
  di luar 3-60 karakter
- `404 NOT_FOUND` bila event tidak ada, `eventId` bukan UUID, atau event ditutup
  tepat saat memesan
- `422 EVENT_CLOSED` bila tanggal event bukan hari ini
- `422 SLOT_INVALID` bila `slotStart` bukan batas slot event
- `422 SLOT_PAST` bila slot sudah selesai
- `422 SLOT_FULL` bila kuota habis (`details` menunjuk `slotStart`)
- `429 RATE_LIMITED` bila satu IP sudah mengirim 30 request pesan, batal, atau
  quote dalam 10 menit, termasuk yang gagal

### `POST /public/v1/tickets/{code}/cancellations`

Membatalkan tiket yang masih `booked`. Tanpa body. Pengunjung tidak punya akun,
jadi memegang kode berarti pemilik tiket. Tempatnya langsung kembali ke kuota slot.

- `200` `{ "ticket": Ticket }` dengan `status: "cancelled"`
- `404 NOT_FOUND` bila kode tidak dikenal
- `409 CONFLICT` bila tiket sudah ditukar atau sudah dibatalkan
- `429 RATE_LIMITED`, berbagi batas dengan pemesanan

### `GET /public/v1/tickets/{code}`

```json
{ "ticket": Ticket }
```

`404 NOT_FOUND` bila kode tidak dikenal. Kode dinormalisasi supaya tahan salah
ketik: huruf besar, spasi dibuang, dan tanda hubung ditambahkan setelah 2 huruf
pertama bila lupa (`ab 3k` → `AB-3K`).

---

## Media (tanpa sesi)

### `GET /media/{fileName}`

Berkas gambar hasil unggah, bukan JSON. URL-nya didapat dari `posterUrl`,
`gallery[].url`, atau `images[].url`. Juga melayani `HEAD`.

- Nama berkas harus cocok `^[a-z0-9-]+\.(jpg|png|webp)$`; nama lain (termasuk
  `../`) selalu `404 NOT_FOUND` dalam format error JSON biasa.
- Header sukses: `Content-Type` sesuai ekstensi (`image/jpeg`, `image/png`,
  `image/webp`), `X-Content-Type-Options: nosniff`,
  `Cache-Control: public, max-age=31536000, immutable`, dan `Last-Modified`.
  Aman di-cache selamanya karena nama berkas acak dan ganti gambar selalu berarti
  nama baru.
- `Range` dan `If-Modified-Since` didukung (`206`, `304`).

---

## Customer (`/customer/v1`)

Akun pembeli. Tabelnya terpisah dari akun internal.

```ts
type Customer = { id: string; email: string; name: string; phone: string }
```

Aturan isian, sama dengan akun internal: email dirapikan jadi huruf kecil dan
dicek bentuknya; kata sandi 8 sampai 72 byte (dihitung byte karena batas bcrypt);
`name` 2 sampai 80 karakter setelah spasi dirapikan; `phone` nomor Indonesia yang
diawali `08`, `62`, atau `+62`, disimpan sebagai digit berawalan `62` dengan
panjang 10 sampai 15 digit (spasi, strip, titik, dan kurung dibuang). Masalah
isian dijawab `400 VALIDATION` dengan `details` per field.

### `POST /customer/v1/auth/register`

```json
{ "email": "budi@contoh.id", "password": "rahasia123", "name": "Budi", "phone": "0812-3456-7890" }
```

Semua field wajib.

- `201` `{ "customer": Customer }` + cookie `antay_customer_session` (langsung login)
- `400 VALIDATION` dengan `details` per field
- `409 EMAIL_TAKEN` bila email sudah terdaftar
- `429 RATE_LIMITED` setelah 10 pendaftaran dari satu IP dalam 10 menit

### `POST /customer/v1/auth/login`

```json
{ "email": "budi@contoh.id", "password": "rahasia123" }
```

- `200` `{ "customer": Customer }` + cookie `antay_customer_session`
- `400 VALIDATION` bila email atau kata sandi kosong (`details` per field)
- `401 INVALID_CREDENTIALS` untuk email tidak dikenal, akun nonaktif, maupun kata
  sandi salah
- `429 RATE_LIMITED` setelah 10 percobaan dari satu IP dalam 10 menit. Kuotanya
  terpisah dari login petugas dan dari pendaftaran.

### `POST /customer/v1/auth/logout`

Tanpa body, tidak butuh sesi valid supaya cookie yang sudah kedaluwarsa pun bisa
dibersihkan. Selalu `204`, cookie dihapus.

### `GET /customer/v1/me`

- `200` `{ "customer": Customer }`
- `401 UNAUTHORIZED` bila tanpa sesi, sesi kedaluwarsa, atau akun sudah tidak ada
  atau nonaktif (cookie ikut dihapus)

### `PATCH /customer/v1/me`

```json
{ "name": "Budi Santoso", "phone": "+62 812 3456 7890" }
```

Keduanya opsional, minimal satu. Email tidak bisa diubah (key tidak dikenal
dijawab `400`).

- `200` `{ "customer": Customer }`
- `400 VALIDATION` bila kedua field kosong (`details` menunjuk `name`) atau isian
  tidak lolos aturan
- `401 UNAUTHORIZED` sama seperti `GET /customer/v1/me`

### `POST /customer/v1/orders/quote`

Menghitung harga pesanan tanpa menahan kuota apa pun. Butuh sesi pembeli.

```json
{
  "eventId": "uuid",
  "items": [{ "packageId": "uuid", "quantity": 2 }],
  "promoCode": "HEMAT10"
}
```

`promoCode` opsional dan boleh `null`.

Sukses `200`:

```json
{
  "quote": {
    "eventId": "uuid",
    "items": [{
      "packageId": "uuid", "packageName": "Berdua", "categoryId": "uuid",
      "categoryName": "Festival", "pax": 2, "quantity": 2,
      "unitPrice": 300000, "lineTotal": 600000, "discountAmount": 0
    }],
    "totalPax": 4,
    "subtotal": 600000,
    "discountTotal": 0,
    "fee": 15000,
    "total": 615000,
    "appliedDiscounts": [{ "discountId": "uuid", "name": "Early bird",
                           "kind": "auto", "code": "", "amount": 50000 }],
    "promoRejection": null
  }
}
```

- `items[]` urut sama dengan request. `lineTotal = unitPrice x quantity`.
- `total = subtotal - discountTotal + fee`.
- `fee` adalah bagian biaya layanan yang dibayar pembeli: persen (`feePercentBp`
  dari harga setelah diskon) ditambah `feeFlat`. Bila event memakai
  `feeBearer: "organizer"`, `fee` selalu `0`. Pesanan yang jadi gratis karena
  diskon tidak dikenai biaya apa pun.
- `appliedDiscounts[].kind` adalah `auto` (langsung terpasang) atau `code`
  (dari kode promo).
- `promoCode` dirapikan spasinya dan tidak peka huruf besar/kecil. Kode promo yang
  tidak terpasang **tidak** membuat quote gagal: quote tetap `200` tanpa diskon
  itu, dan alasannya ada di `promoRejection`. `promoRejection` `null` bila kode
  tidak diisi atau berhasil terpasang. Nilainya stabil, snake_case, untuk
  dipetakan frontend ke kalimat:
  `unknown_code`, `inactive`, `not_started`, `expired`, `quota_exhausted`,
  `customer_limit`, `not_applicable`, `min_subtotal`, `not_combinable` (kode sah
  tapi kombinasi lain lebih murah buat pembeli), `no_effect` (kode sah tapi
  potongannya nol).
- Tabel diskon belum ada, jadi untuk sekarang `appliedDiscounts` selalu kosong dan
  kode promo apa pun mendapat `promoRejection: "unknown_code"`.

Urutan cek dari yang paling murah: isi body, event, lalu stok.

- `400 VALIDATION` bila body tidak valid, `eventId` kosong, `items` kosong,
  `items[i].packageId` bukan UUID, `quantity` kurang dari 1, atau paket yang sama
  muncul dua kali (`details` menunjuk `items`, `items[i].packageId`, atau
  `items[i].quantity`)
- `401 UNAUTHORIZED` tanpa sesi pembeli
- `404 NOT_FOUND` bila event tidak ada, `eventId` bukan UUID, atau event tidak
  `published`
- `422 SALE_ENDED` bila tanggal event sudah lewat atau `saleEndsAt` sudah tercapai
- `422 SALE_NOT_OPEN` bila `saleStartsAt` belum tiba
- `422 PACKAGE_UNAVAILABLE` bila ada paket yang tidak ada, nonaktif, atau milik
  event lain (`details` per `items[i].packageId`)
- `422 MIXED_CATEGORY` bila paket berasal dari lebih dari satu kategori. Satu
  pesanan hanya boleh satu kategori.
- `422 PAX_LIMIT` bila total orang (`pax x quantity`, dijumlah) lebih dari 10,
  atau `items` lebih dari 10 baris (`details` menunjuk `items`)
- `422 QUOTA_EXCEEDED` bila `quantity` melewati sisa kuota paket
  (`items[i].quantity`) atau total orang melewati sisa kategori (`items`)
- `429 RATE_LIMITED` berbagi kuota 30 per 10 menit per IP dengan pesan dan batal
  tiket; request tanpa sesi ikut terhitung

---

## Operational: loket (butuh sesi, role staff)

Organizer mendapat `403 FORBIDDEN` di semua rute bagian ini.

### `GET /operational/v1/events`

Semua event hari ini (semua status), untuk pemilih event di halaman petugas.
Angka slot sama dengan halaman pengunjung (lihat Perhitungan).

```json
{ "events": [Event] }
```

### `POST /operational/v1/events` (role admin)

Alur dasbor versi 1. Body:

```json
{
  "name": "Penukaran Tiket Konser",
  "place": "Exhibition Hall",
  "item": "Gelang masuk",
  "requirement": "E-ticket + KTP sesuai nama",
  "openTime": "10:00",
  "closeTime": "18:00",
  "slotMinutes": 30,
  "slotCapacity": 40,
  "counterCount": 2,
  "serviceSeconds": 90
}
```

`codePrefix` dibuat server dari huruf awal nama (2 huruf besar). `eventDate`
otomatis hari ini. `createdBy` diisi user yang login. `organizerId` kosong.

Event langsung berstatus `published` (dulu `open`). Teks dirapikan spasinya di
ujung. Untuk event dengan kategori, paket, dan periode jual, pakai
`/operational/v1/manage/events`.

- `201` `{ "event": Event }`
- `400 VALIDATION` bila teks kosong atau di luar batas (`name` 3-70, `place` 1-50,
  `item` 1-50, `requirement` 1-80 karakter) atau jam bukan `HH:MM`; `details`
  per field
- `422 INVALID_SCHEDULE` bila angka di luar batas (`slotMinutes` 10-120,
  `slotCapacity` 1-500, `counterCount` 1-20, `serviceSeconds` 30-600; `details`
  per field), `closeTime` tidak lebih lambat dari `openTime`, atau selisihnya
  kurang dari satu slot
- `403 FORBIDDEN` bila role bukan admin
- `409 CONFLICT` bila prefix + tanggal sudah dipakai event lain

### `GET /operational/v1/events/{eventId}/waiting?slot=10:30,11:00`

Daftar pemegang tiket yang belum ditukar pada slot yang diminta. `slot` boleh
beberapa jam dipisah koma; tanpa `slot`, dipakai slot yang sedang berjalan dan
slot berikutnya.

```json
{ "tickets": [Ticket], "slots": ["10:30", "11:00"] }
```

Tiket diurutkan dari yang paling awal dipesan. Di luar jam event tanpa `slot`,
dipakai slot terdekat berikutnya; setelah semua slot lewat, `tickets` dan `slots`
kosong.

- `400 VALIDATION` bila ada jam di `slot` yang bukan `HH:MM`
- `404 NOT_FOUND` bila event tidak ada

### `PATCH /operational/v1/events/{eventId}/queue`

Body (semua opsional, minimal satu):

```json
{ "waitingCount": 34, "counterCount": 3 }
```

- `200` `{ "event": Event }`
- `400 VALIDATION` bila body tidak valid atau kedua field kosong
- `422 INVALID_QUEUE` bila `waitingCount` negatif atau `counterCount` di luar 1-20
  (`details` per field)
- `404 NOT_FOUND` bila event tidak ada

### `GET /operational/v1/tickets/{code}`

Untuk petugas mengecek tiket. Query `eventId` opsional: bila diisi, tiket dari
event lain ditandai `wrongEvent`. Kode hanya dirapikan spasi di ujung dan dijadikan
huruf besar; tanda hubung tidak ditambahkan otomatis.

- `404 NOT_FOUND` bila kode tidak ada
- `400 VALIDATION` bila `eventId` diisi tapi bukan UUID

```json
{
  "ticket": Ticket,
  "check": {
    "timing": "early | on_time | late | past_slot",
    "wrongEvent": false,
    "alreadyRedeemed": false,
    "canRedeem": true
  }
}
```

`timing`: `early` bila lebih dari 15 menit sebelum slot, `on_time` dari 15 menit
sebelum slot sampai slot selesai (tamu boleh dilayani lebih awal), `late` bila slot
sudah lewat dan tiket belum ditukar, `past_slot` bila slot lewat dan sudah ditukar.
`canRedeem` = status `booked` dan bukan event lain.

### `POST /operational/v1/tickets/{code}/redemptions`

Body:

```json
{ "eventId": "uuid", "counter": 1, "ktpChecked": true }
```

Kode dirapikan sama seperti cek tiket. Bila dua loket menukar tiket yang sama
bersamaan, hanya satu yang berhasil; yang lain mendapat `409 ALREADY_REDEEMED`.

- `200` `{ "ticket": Ticket }` setelah status jadi `redeemed`
- `400 VALIDATION` bila body tidak valid atau `eventId` bukan UUID
- `422 KTP_REQUIRED` bila `ktpChecked` bukan `true`
- `404 NOT_FOUND` bila kode tidak ada
- `409 WRONG_EVENT` bila `eventId` tidak cocok dengan event tiket
- `422 INVALID_COUNTER` bila `counter` di luar 1 sampai `counterCount` event
- `409 ALREADY_REDEEMED` bila tiket sudah ditukar
- `409 NOT_BOOKED` bila status tiket bukan `booked`

---

## Operational: kelola event (role organizer atau admin)

Prefix `/operational/v1/manage` supaya tidak bentrok dengan rute loket. Staff
mendapat `403 FORBIDDEN`. Semua id milik penyelenggara lain dijawab `404`.

Alur status:

| Aksi | Endpoint | Dari | Ke | Siapa |
|---|---|---|---|---|
| ajukan | `POST .../events/{eventId}/submissions` | `draft` | `review` | organizer, admin |
| setujui | `POST .../events/{eventId}/approvals` | `review` | `published` | admin |
| tolak | `POST .../events/{eventId}/rejections` | `review` | `draft` | admin |
| batalkan | `POST .../events/{eventId}/cancellations` | `published` | `cancelled` | admin |
| tutup | `POST .../events/{eventId}/closures` | `published` | `closed` | admin |

Yang boleh diubah per status:

| Status | Data event | Kategori dan paket | Gambar | Denah |
|---|---|---|---|---|
| `draft` | semua field | boleh | boleh | boleh |
| `review` | tidak | tidak | boleh | boleh |
| `published` | hanya `description`, `saleStartsAt`, `saleEndsAt`, `openTime`, `closeTime`, `slotMinutes`, `slotCapacity`, `counterCount`, `serviceSeconds` | boleh | boleh | boleh |
| `closed`, `cancelled` | tidak | tidak | tidak | tidak |

Yang ditolak dijawab `422 EVENT_NOT_EDITABLE`.

### `GET /operational/v1/manage/events?status=draft`

`status` opsional: `draft`, `review`, `published`, `closed`, atau `cancelled`.
Tanpa `status`, semua status. Urut `eventDate` terbaru lalu nama.

```json
{ "events": [ManagedEventSummary] }
```

- `400 VALIDATION` bila `status` tidak dikenal (`details` menunjuk `status`)

### `POST /operational/v1/manage/events`

```json
{
  "name": "Konser Senja",
  "place": "Atrium utama",
  "item": "Gelang masuk",
  "requirement": "E-ticket + KTP",
  "eventDate": "2026-12-20",
  "openTime": "10:00",
  "closeTime": "18:00",
  "slotMinutes": 30,
  "slotCapacity": 40,
  "counterCount": 2,
  "serviceSeconds": 90,
  "description": "Konser akustik sore hari.",
  "saleStartsAt": "2026-12-01T10:00:00+07:00",
  "saleEndsAt": "2026-12-20T12:00:00+07:00",
  "feeBearer": "customer",
  "feePercentBp": 250,
  "feeFlat": 2000,
  "organizerId": "uuid"
}
```

Field jadwal (`name` sampai `serviceSeconds`) memakai aturan yang sama dengan
`POST /operational/v1/events`. Tambahannya:

- `eventDate` wajib, `YYYY-MM-DD`, tidak boleh sebelum hari ini
- `description` opsional, maksimal 2000 karakter
- `saleStartsAt`, `saleEndsAt` opsional atau `null`, RFC3339; `saleEndsAt` harus
  setelah `saleStartsAt`
- `feeBearer` `customer` (bawaan bila kosong) atau `organizer`
- `feePercentBp` 0 sampai 10000, `feeFlat` 0 sampai 100000000; bawaan 0
- `organizerId` hanya dibaca untuk admin dan boleh kosong (event tanpa
  penyelenggara). Organizer selalu jadi pemilik event yang dibuatnya, apa pun isi
  field ini.

Event selalu dibuat `draft`. `codePrefix` ikut nama selama masih draft. `posterUrl`
diurus endpoint gambar.

- `201` `{ "event": ManagedEvent }` dengan `categories: []`
- `400 VALIDATION` bila teks, jam, tanggal, waktu jual, atau biaya tidak valid, atau
  `organizerId` bukan UUID (`details` per field)
- `422 INVALID_SCHEDULE` bila angka jadwal di luar batas atau jam tutup tidak
  masuk akal (sama dengan versi 1)
- `422 ORGANIZER_INVALID` bila admin mengisi `organizerId` yang tidak ada atau
  nonaktif, atau akun organizer tidak terikat ke penyelenggara
- `409 CONFLICT` bila prefix + tanggal sudah dipakai event lain

### `GET /operational/v1/manage/events/{eventId}`

`200` `{ "event": ManagedEvent }` lengkap dengan kategori dan paket (termasuk paket
nonaktif). `404 NOT_FOUND` bila tidak ada.

### `PATCH /operational/v1/manage/events/{eventId}`

Field sama dengan create kecuali `organizerId`; semua opsional. `saleStartsAt` dan
`saleEndsAt` boleh `null` untuk mengosongkan. `posterUrl` dan `organizerId` tidak
diterima (`400`). Patch digabung ke data lama lalu divalidasi ulang semuanya.
Field yang nilainya sama dengan yang tersimpan tidak dihitung perubahan, jadi
frontend boleh mengirim ulang seluruh form. Tanggal lampau hanya ditolak bila
`eventDate` memang diganti.

- `200` `{ "event": ManagedEvent }`
- `400 VALIDATION`, `422 INVALID_SCHEDULE` seperti create
- `422 EVENT_NOT_EDITABLE`:
  - status `published` dan ada field di luar daftar yang boleh berubah; `details`
    berisi satu baris per field (`issue: "tidak bisa diubah setelah event tayang"`)
  - status `review`, `closed`, atau `cancelled`, atau statusnya berubah di tengah
    jalan; tanpa `details`
- `409 CONFLICT` bila nama baru menghasilkan prefix yang sudah dipakai di tanggal
  itu
- `404 NOT_FOUND`

### `DELETE /operational/v1/manage/events/{eventId}`

Hanya untuk `draft`. Kategori, paket, gambar, dan denahnya ikut terhapus. Event
yang pernah diajukan dibatalkan atau ditutup saja.

- `200` `{ "id": "uuid" }`
- `422 EVENT_NOT_EDITABLE` bila status bukan `draft`
- `404 NOT_FOUND`

### Aksi alur status

`submissions`, `approvals`, `cancellations`, `closures` tanpa body. `rejections`
wajib body:

```json
{ "reason": "Poster belum sesuai, mohon ganti." }
```

Semua mengembalikan `200` `{ "event": ManagedEvent }`. Alasan tolak tersimpan di
`rejectionReason` dan dikosongkan lagi saat event diajukan ulang atau disetujui.
Pengajuan mengisi `submittedAt`, persetujuan mengisi `publishedAt`.

- `400 VALIDATION` bila `reason` di luar 3-300 karakter setelah dirapikan
  (`details` menunjuk `reason`)
- `403 FORBIDDEN` bila organizer memanggil aksi khusus admin
- `404 NOT_FOUND`
- `409 INVALID_STATUS` bila status sekarang tidak cocok dengan aksi (misalnya
  menyetujui event yang masih draft), termasuk bila pemanggil lain lebih dulu
  mengubahnya. Frontend sebaiknya memuat ulang event.
- `422 EVENT_INCOMPLETE` (hanya pengajuan) bila event belum lengkap. `details`
  berisi semua alasan sekaligus:

| `field` | Kapan |
|---|---|
| `saleStartsAt` | periode jual belum diisi |
| `saleEndsAt` | periode jual belum diisi, atau berakhir setelah loket tutup di hari event (zona Jakarta) |
| `categories` | belum ada kategori |
| `categories.{categoryId}.packages` | kategori belum punya paket aktif |
| `categories.{categoryId}.seats` | kategori berkursi belum punya kursi aktif di denah |

### Kategori

- `GET /operational/v1/manage/events/{eventId}/categories` → `200`
  `{ "categories": [ManagedCategory] }`, urut `sortOrder` lalu nama
- `POST /operational/v1/manage/events/{eventId}/categories` → `201`
  `{ "category": ManagedCategory }`
- `PATCH /operational/v1/manage/categories/{categoryId}` → `200`
  `{ "category": ManagedCategory }`
- `DELETE /operational/v1/manage/categories/{categoryId}` → `200` `{ "id": "uuid" }`

Body create:

```json
{ "name": "Festival", "description": "Berdiri", "sortOrder": 0, "isSeated": false, "quota": 500 }
```

- `name` 1 sampai 60 karakter, unik per event tanpa peduli huruf besar/kecil
- `description` maksimal 300 karakter
- `sortOrder` 0 sampai 9999
- `quota` dalam orang: wajib minimal 1 untuk kategori tanpa kursi, harus `null`
  atau tidak dikirim untuk kategori berkursi (kuotanya jumlah kursi di denah)

PATCH: semua opsional, `quota` boleh `null`. Mengubah `isSeated` ke `true` tanpa
mengirim `quota` otomatis membuang kuota lama.

- `400 VALIDATION` dengan `details` per field
- `409 CATEGORY_NAME_TAKEN` bila nama sudah dipakai di event yang sama
- `409 CATEGORY_HAS_SEATS` bila mengubah `isSeated` atau menghapus kategori yang
  sudah punya blok kursi. Hapus bloknya dulu.
- `409 ALREADY_SOLD` bila kuota diturunkan di bawah yang terjual, atau menghapus
  kategori yang sudah ada penjualan
- `422 EVENT_NOT_EDITABLE` bila event `review`, `closed`, atau `cancelled`
- `404 NOT_FOUND` bila event atau kategori tidak ada

### Paket

- `GET /operational/v1/manage/categories/{categoryId}/packages` → `200`
  `{ "packages": [ManagedPackage] }`, urut `sortOrder` lalu nama
- `POST /operational/v1/manage/categories/{categoryId}/packages` → `201`
  `{ "package": ManagedPackage }`
- `PATCH /operational/v1/manage/packages/{packageId}` → `200`
  `{ "package": ManagedPackage }`
- `DELETE /operational/v1/manage/packages/{packageId}` → `200` `{ "id": "uuid" }`

Body create:

```json
{ "name": "Berdua", "pax": 2, "price": 300000, "quota": 100, "sortOrder": 0, "isActive": true }
```

- `name` 1 sampai 40 karakter, unik per kategori tanpa peduli huruf besar/kecil
- `pax` 1 sampai 10 orang per paket
- `price` 0 sampai 100000000, harga satu paket (bukan per orang)
- `quota` dalam jumlah paket, minimal 1, atau `null` bila hanya ikut kuota kategori
- `sortOrder` 0 sampai 9999
- `isActive` opsional, bawaan `true`

PATCH: semua opsional, `quota` boleh `null`.

- `400 VALIDATION` dengan `details` per field
- `409 PACKAGE_NAME_TAKEN` bila nama sudah dipakai di kategori yang sama
- `409 ALREADY_SOLD` bila mengubah `price` atau `pax`, menurunkan kuota di bawah
  yang terjual, atau menghapus paket yang sudah terjual. Untuk sekarang tabel
  pesanan belum ada, jadi kode ini belum pernah keluar.
- `422 EVENT_NOT_EDITABLE` bila event `review`, `closed`, atau `cancelled`
- `404 NOT_FOUND` bila kategori atau paket tidak ada

---

## Operational: gambar event (role organizer atau admin)

Satu event punya paling banyak satu poster dan 8 gambar galeri. Gambar boleh
diubah selama event belum `closed` atau `cancelled`.

```ts
type MediaImage = {
  id: string; kind: 'poster' | 'gallery'; url: string // "/media/<nama>.webp"
  width: number; height: number; alt: string; sortOrder: number
}
```

### `GET /operational/v1/manage/events/{eventId}/images`

`200` `{ "images": [MediaImage] }`, poster dulu lalu galeri urut `sortOrder`.
Tetap bisa dibaca untuk event `closed` dan `cancelled`.

### `POST /operational/v1/manage/events/{eventId}/poster`
### `POST /operational/v1/manage/events/{eventId}/images`

`multipart/form-data` dengan field `file` (tepat satu berkas) dan `alt` opsional
(teks alternatif, maksimal 200 karakter, tanpa baris baru). Poster mengganti
poster lama dan mengisi `posterUrl` event. Gambar galeri ditaruh di urutan
terakhir.

Isi berkas diperiksa dari byte-nya, bukan dari `Content-Type` atau ekstensi
kiriman klien. Batasnya:

- ukuran maksimal `MEDIA_MAX_BYTES` (bawaan 5 MiB = 5242880 byte); seluruh body
  dibatasi ukuran itu ditambah 64 KiB untuk overhead form
- format JPG, PNG, atau WebP
- resolusi minimal 400 x 400, maksimal 6000 x 6000 piksel

Jawaban:

- `201` `{ "image": MediaImage }`
- `400 VALIDATION` bila body bukan multipart, field `file` tidak ada, kosong, atau
  dikirim dua kali (`details` menunjuk `file`), atau `alt` tidak valid (`details`
  menunjuk `alt`)
- `404 NOT_FOUND` bila event tidak ada atau milik penyelenggara lain
- `413 FILE_TOO_LARGE`
- `415 UNSUPPORTED_MEDIA_TYPE`
- `422 IMAGE_TOO_SMALL`, `422 IMAGE_TOO_LARGE` untuk resolusi
- `422 GALLERY_FULL` bila galeri sudah 8 gambar (hanya galeri)
- `422 EVENT_NOT_EDITABLE` bila event `closed` atau `cancelled`

### `PUT /operational/v1/manage/events/{eventId}/images/order`

```json
{ "imageIds": ["uuid", "uuid"] }
```

Harus memuat semua gambar galeri event itu, masing-masing satu kali, tanpa poster.

- `200` `{ "images": [MediaImage] }` (poster + galeri dengan urutan baru)
- `400 VALIDATION` bila `imageIds` tidak ada, ada yang bukan UUID, atau isinya
  tidak persis semua galeri (`details` menunjuk `imageIds`)
- `404 NOT_FOUND`, `422 EVENT_NOT_EDITABLE`

### `PATCH /operational/v1/manage/images/{imageId}`

```json
{ "alt": "Panggung utama dari tribun" }
```

`alt` wajib ada, boleh string kosong.

- `200` `{ "image": MediaImage }`
- `400 VALIDATION` bila `alt` tidak dikirim, lebih dari 200 karakter, atau memuat
  karakter kontrol
- `404 NOT_FOUND`, `422 EVENT_NOT_EDITABLE`

### `DELETE /operational/v1/manage/images/{imageId}`

`204`. Menghapus poster ikut mengosongkan `posterUrl` event.
`404 NOT_FOUND`, `422 EVENT_NOT_EDITABLE`.

---

## Operational: denah kursi (role organizer atau admin)

Denah berbasis blok. Penyelenggara menaruh beberapa blok di kanvas sekitar
panggung, dan posisi tiap kursi dihitung server dari parameter blok. Hanya
kategori `isSeated` yang bisa punya blok. Denah boleh diubah selama event belum
`closed` atau `cancelled`.

Label kursi `{code}-{row}{number}`, misalnya `A-B12`. Baris dimulai dari
`firstRowLabel` dan setelah `Z` lanjut `AA`, `AB`, dan seterusnya.

### `GET /operational/v1/manage/events/{eventId}/seat-map`

```json
{ "layout": SeatLayout, "blocks": [SeatBlock], "seats": [Seat] }
```

`status` kursi apa adanya: `available`, `held`, `sold`, atau `disabled`. Event yang
belum pernah menyimpan layout mendapat layout bawaan (kanvas 1000 x 700, panggung
`x 350, y 20, 300 x 60`, label `Panggung`).

### `PUT /operational/v1/manage/events/{eventId}/layout`

```json
{
  "canvasWidth": 1000, "canvasHeight": 700,
  "stage": { "x": 350, "y": 20, "width": 300, "height": 60, "label": "Panggung" }
}
```

Kanvas 200 sampai 5000 per sisi, panggung lebih besar dari nol dan harus berada di
dalam kanvas, label panggung 1 sampai 40 karakter setelah dirapikan.

- `200` `{ "layout": SeatLayout }`
- `400 VALIDATION` bila body tidak valid
- `422 INVALID_SEAT_MAP` dengan `details` per field (`canvasWidth`,
  `canvasHeight`, `stage`, `stage.label`)
- `422 EVENT_NOT_EDITABLE`, `404 NOT_FOUND`

### `POST /operational/v1/manage/events/{eventId}/seat-blocks`

```json
{
  "categoryId": "uuid", "name": "Tribun Barat", "code": "A",
  "x": 500, "y": 140, "rowCount": 10, "seatsPerRow": 20,
  "rotation": 0, "curve": 0, "seatSpacing": 28, "rowSpacing": 32,
  "firstRowLabel": "A", "numbering": "ltr", "aisleAfter": [10], "sortOrder": 0
}
```

| Field | Wajib | Bawaan | Aturan |
|---|---|---|---|
| `categoryId` | ya | | kategori berkursi milik event ini |
| `name` | ya | | 1 sampai 40 karakter setelah dirapikan |
| `code` | ya | | `^[A-Z0-9]{1,3}$`, unik per event |
| `x`, `y` | ya | | titik tengah baris terdepan, -20000 sampai 20000 |
| `rowCount` | ya | | 1 sampai 50 |
| `seatsPerRow` | ya | | 1 sampai 80 |
| `rotation` | | 0 | -180 sampai 180 derajat, searah jarum jam |
| `curve` | | 0 | 0 (lurus) sampai 100 |
| `seatSpacing`, `rowSpacing` | | 28, 32 | 16 sampai 80 |
| `firstRowLabel` | | `A` | satu huruf kapital |
| `numbering` | | `ltr` | `ltr` atau `rtl` |
| `aisleAfter` | | `[]` | nomor kursi 1 sampai `seatsPerRow - 1`, tanpa dobel |
| `sortOrder` | | 0 | |

Sukses `201`:

```json
{ "block": SeatBlock, "seatCount": 200, "warnings": ["Blok A menabrak panggung"] }
```

`warnings` tidak menggagalkan simpan, karena editor sering melewati posisi
bertumpuk saat blok digeser. Isinya salah satu dari: `Blok {code} bertabrakan
dengan blok {code lain}`, `Blok {code} menabrak panggung`, `Sebagian kursi blok
{code} berada di luar kanvas`. Selalu array, kosong bila tidak ada masalah.

- `400 VALIDATION` bila field wajib tidak dikirim (`issue: "wajib diisi"`) atau
  `categoryId` bukan UUID
- `422 INVALID_SEAT_MAP` bila angka atau teks di luar aturan (`details` per field;
  posisi `x` dan `y` dilaporkan di field `x`)
- `422 CATEGORY_NOT_SEATED` bila kategori bukan milik event ini atau tidak berkursi
- `409 BLOCK_CODE_TAKEN` bila `code` sudah dipakai blok lain di event ini
- `422 EVENT_NOT_EDITABLE`, `404 NOT_FOUND`

### `PATCH /operational/v1/manage/seat-blocks/{blockId}`

Field sama dengan create, semua opsional. Jawaban `200` dengan bentuk yang sama
dengan create.

Bila bentuk blok berubah (apa pun selain `name` dan `sortOrder`), semua kursinya
ditulis ulang. Kursi `disabled` dipertahankan lewat baris dan nomor, jadi tetap
tertandai walau kode bloknya diganti. Ganti `name` atau `sortOrder` saja tidak
menyentuh kursi, jadi tetap boleh walau kursinya sudah terjual.

- kode error sama dengan create
- `409 BLOCK_LOCKED` bila bentuk diubah padahal ada kursi `held` atau `sold`

### `DELETE /operational/v1/manage/seat-blocks/{blockId}`

`204`. `409 BLOCK_LOCKED` bila ada kursi `held` atau `sold`.
`422 EVENT_NOT_EDITABLE`, `404 NOT_FOUND`.

### `PATCH /operational/v1/manage/events/{eventId}/seats`

Menandai kursi tidak dipakai (tiang, meja teknis) atau mengaktifkannya lagi,
dalam satu transaksi.

```json
{ "disable": ["A-A1", "A-A2"], "enable": ["B-C5"] }
```

Keduanya opsional. Hanya `available` ↔ `disabled`; kursi yang sudah berstatus
tujuan dilewati, jadi kirim ulang aman.

- `200` `{ "seats": [Seat] }`, hanya kursi yang benar-benar berubah, urut label
- `400 VALIDATION` bila satu label ada di `disable` dan `enable` sekaligus
- `422 SEAT_NOT_FOUND` bila ada label yang tidak ada di denah (`details.field`
  berisi labelnya)
- `409 SEAT_LOCKED` bila ada kursi `held` atau `sold`; tidak ada yang diubah
  (`details.field` berisi labelnya)
- `422 EVENT_NOT_EDITABLE`, `404 NOT_FOUND`

### `POST /operational/v1/manage/seat-blocks/preview`

Menghitung posisi kursi tanpa menyimpan, untuk editor yang menggeser slider.
Body memakai field blok yang sama (aturan wajib dan bawaan sama dengan create)
ditambah:

- `eventId` wajib, UUID
- `blockId` opsional: blok yang sedang diedit, supaya tidak dianggap menabrak
  posisinya sendiri yang lama

`categoryId`, `name`, dan `sortOrder` diterima tapi tidak dipakai. Pratinjau
tetap jalan untuk event `closed` atau `cancelled`.

```json
{
  "seats": [{ "label": "A-A1", "row": "A", "number": 1, "x": 234, "y": 140 }],
  "warnings": []
}
```

- `400 VALIDATION` bila `eventId` atau `blockId` bukan UUID, atau field wajib
  kosong
- `422 INVALID_SEAT_MAP`, `404 NOT_FOUND`

---

## Operational: penyelenggara dan akun (role admin)

### Penyelenggara

```ts
type Organizer = {
  id: string; name: string; contactEmail: string; contactPhone: string; isActive: boolean
}
```

- `GET /operational/v1/organizers` → `200` `{ "organizers": [Organizer] }`, urut nama
- `POST /operational/v1/organizers` → `201` `{ "organizer": Organizer }`
- `PATCH /operational/v1/organizers/{organizerId}` → `200` `{ "organizer": Organizer }`

Body create:

```json
{ "name": "Klub Lari Kota", "contactEmail": "halo@klub.id", "contactPhone": "0812-3456-7890" }
```

`name` 2 sampai 100 karakter, `contactEmail` wajib, `contactPhone` opsional
(bila diisi, aturan nomor sama dengan pembeli). PATCH: `name`, `contactEmail`,
`contactPhone` (`""` mengosongkan), dan `isActive`; semua opsional, minimal satu.

- `400 VALIDATION` dengan `details` per field (PATCH kosong menunjuk `name`)
- `404 NOT_FOUND` bila penyelenggara tidak ada (PATCH)

### Akun internal

```ts
type ManagedUser = User & { isActive: boolean }
```

- `GET /operational/v1/users` → `200` `{ "users": [ManagedUser] }`, urut waktu dibuat
- `POST /operational/v1/users` → `201` `{ "user": ManagedUser }`
- `PATCH /operational/v1/users/{userId}` → `200` `{ "user": ManagedUser }`

Body create:

```json
{ "email": "eo@klub.id", "password": "rahasia123", "name": "Admin Klub",
  "role": "organizer", "organizerId": "uuid" }
```

`role` `staff`, `admin`, atau `organizer`. `organizerId` wajib untuk `organizer`
dan harus kosong atau `null` untuk role lain. Email, kata sandi, dan nama (2
sampai 80 karakter) memakai aturan yang sama dengan pembeli.

PATCH: `name`, `isActive`, `password`; semua opsional, minimal satu. Role dan email
tidak bisa diganti; pindah role berarti buat akun baru.

- `400 VALIDATION` dengan `details` per field
- `409 EMAIL_TAKEN` bila email sudah dipakai akun internal lain (create)
- `422 ORGANIZER_INVALID` bila `organizerId` tidak ada atau nonaktif (`details`
  menunjuk `organizerId`)
- `422 CANNOT_DEACTIVATE_SELF` bila admin menonaktifkan akunnya sendiri, supaya
  mal tidak terkunci tanpa admin aktif
- `404 NOT_FOUND` bila akun tidak ada (PATCH)

---

## Analytics (butuh sesi, role admin)

Akun staff dan organizer mendapat `403 FORBIDDEN`.

### `GET /analytics/v1/events/{eventId}/summary`

```json
{
  "event": EventRef,
  "totals": {
    "registered": 120, "redeemed": 80, "pending": 40, "cancelled": 0,
    "noShow": 12, "capacity": 480, "left": 360
  },
  "slots": [
    { "start": "10:00", "end": "10:30", "registered": 20, "redeemed": 15,
      "capacity": 40, "past": false, "current": true }
  ]
}
```

`capacity` = jumlah slot x `slotCapacity`. `left` = `max(0, capacity - registered)`.
`registered` tidak menghitung tiket yang dibatalkan.
`noShow` = tiket `booked` yang slotnya sudah lewat. Semua slot event selalu muncul,
termasuk yang belum punya tiket. `404 NOT_FOUND` bila event tidak ada.

### `GET /analytics/v1/overview`

```json
{ "events": [OverviewEvent] }
```

```json
{
  "id": "uuid", "name": "...", "place": "...", "openTime": "10:00",
  "closeTime": "20:00", "registered": 120, "redeemed": 80,
  "queue": Queue
}
```

---

## Health (tanpa sesi, tanpa envelope)

| Endpoint | Isi |
|---|---|
| `GET /` | envelope sukses `{ "service": "antay-api", "version": "..." }` |
| `GET /health/live` | `200`, tidak menyentuh database |
| `GET /health/ready`, `/health/startup` | `200` bila database bisa di-ping, `503` bila tidak |
| `GET /health/dependencies` | sama dengan ready; untuk dashboard internal, jangan diekspos ke publik |

```json
{ "status": "UP", "service": "antay-api", "version": "dev",
  "timestamp": "2026-11-08T11:15:00+07:00", "checks": { "database": "UP" } }
```

---

## Bentuk data bersama

```ts
type EventStatus = 'draft' | 'review' | 'published' | 'closed' | 'cancelled'

type Slot = {
  start: string; end: string; capacity: number; booked: number
  redeemed: number; left: number; past: boolean; current: boolean
}

type Queue = { waiting: number; waitMinutes: number; countersNeeded: number; long: boolean }

type EventRef = {
  id: string; name: string; place: string; item: string
  requirement: string; slotMinutes: number
}

type Event = {
  id: string; codePrefix: string; name: string; place: string; item: string
  requirement: string; eventDate: string; openTime: string; closeTime: string
  slotMinutes: number; slotCapacity: number; counterCount: number
  serviceSeconds: number; waitingCount: number; status: EventStatus
  leftTotal: number; slots: Slot[]
}

type Ticket = {
  id: string; code: string; visitorName: string; slotStart: string; slotEnd: string
  status: 'booked' | 'redeemed' | 'cancelled'
  redeemedAt: string | null; redeemedCounter: number | null
  event: EventRef; queue: Queue
}

// Katalog publik: semua field Event versi 1 ditambah data jualan.
type CatalogEvent = Event & {
  description: string
  posterUrl: string            // "" bila belum ada poster
  saleStartsAt: string | null  // RFC3339 zona Jakarta
  saleEndsAt: string | null
  onSale: boolean
  priceFrom: number | null     // harga paket aktif termurah, null bila belum ada paket
  left: number                 // jumlah sisa semua kategori, dalam orang
}

type CatalogEventDetail = CatalogEvent & {
  categories: CatalogCategory[]
  gallery: { url: string; width: number; height: number; alt: string }[]
}

type CatalogCategory = {
  id: string; name: string; description: string; sortOrder: number
  isSeated: boolean
  priceFrom: number | null
  left: number                 // dalam orang
  soldOut: boolean
  packages: CatalogPackage[]   // hanya paket aktif
}

type CatalogPackage = {
  id: string; name: string; pax: number; price: number
  pricePerPax: number          // price / pax dibulatkan ke bawah, hanya pembanding
  left: number | null          // null bila paket tidak punya kuota sendiri
}

type ManagedEventSummary = {
  id: string; codePrefix: string; name: string; place: string
  eventDate: string; openTime: string; closeTime: string; status: EventStatus
  organizerId: string | null; organizerName: string // "" bila tanpa penyelenggara
  posterUrl: string
  saleStartsAt: string | null; saleEndsAt: string | null
  rejectionReason: string | null
  submittedAt: string | null; publishedAt: string | null
}

type ManagedEvent = {
  id: string; codePrefix: string; name: string; place: string; item: string
  requirement: string; eventDate: string; openTime: string; closeTime: string
  slotMinutes: number; slotCapacity: number; counterCount: number
  serviceSeconds: number; status: EventStatus; organizerId: string | null
  description: string; posterUrl: string
  saleStartsAt: string | null; saleEndsAt: string | null
  feeBearer: 'customer' | 'organizer'; feePercentBp: number; feeFlat: number
  rejectionReason: string | null
  submittedAt: string | null; publishedAt: string | null
  categories: ManagedCategory[]
}

type ManagedCategory = {
  id: string; name: string; description: string; sortOrder: number
  isSeated: boolean; quota: number | null
  seatCount: number            // kursi selain disabled
  packages: ManagedPackage[]   // termasuk paket nonaktif
}

type ManagedPackage = {
  id: string; name: string; pax: number; price: number; quota: number | null
  sortOrder: number; isActive: boolean
}

type SeatLayout = {
  canvasWidth: number; canvasHeight: number
  stage: { x: number; y: number; width: number; height: number; label: string }
}

type SeatBlock = {
  id: string; categoryId: string; categoryName: string; code: string; name: string
  x: number; y: number; rotation: number; rowCount: number; seatsPerRow: number
  curve: number; seatSpacing: number; rowSpacing: number
  firstRowLabel: string; numbering: 'ltr' | 'rtl'; aisleAfter: number[]
  sortOrder: number
  seatCount: number            // semua kursi blok, termasuk disabled
}

type Seat = {
  id: string; label: string; row: string; number: number; x: number; y: number
  blockId: string; categoryId: string
  status: 'available' | 'held' | 'sold' | 'disabled' // denah publik: 'available' | 'disabled' | 'taken'
}
```

Waktu di `ManagedEvent` dan `ManagedEventSummary` boleh membawa pecahan detik,
sedangkan di `CatalogEvent` selalu dibulatkan ke detik. Keduanya RFC3339 zona
Jakarta.

## Perhitungan

- `waitMinutes = ceil(waiting * serviceSeconds / 60 / counterCount)`
- `countersNeeded = max(1, ceil(waiting * serviceSeconds / 60 / 15))`
- `long = waitMinutes > 15`
- `left = max(0, slotCapacity - booked)`, `booked` menghitung semua tiket yang
  tidak `cancelled` (termasuk yang sudah `redeemed`), sama dengan pengecekan kuota
  saat memesan. Berlaku untuk endpoint public dan operational.
- `leftTotal` = jumlah `left` dari slot yang belum lewat
- slot lewat bila `start + slotMinutes <= sekarang` (menit). Untuk event hari
  depan tidak ada slot yang lewat.

Katalog versi 2:

- `onSale` = `saleStartsAt` kosong atau sudah tiba (inklusif), dan `saleEndsAt`
  kosong atau belum tiba (eksklusif)
- sisa kategori (`left`, dalam orang): kategori berkursi = jumlah kursi
  `available` (kursi `held`, `sold`, dan `disabled` tidak dihitung); kategori
  tanpa kursi = `quota`. Tabel pesanan belum ada, jadi yang terjual belum
  dikurangkan.
- `soldOut = left <= 0`
- `priceFrom` kategori = `price` paket aktif termurah (harga paket, bukan per
  orang); `priceFrom` event = yang termurah dari semua kategori
- `left` event = jumlah `left` semua kategori
- `left` paket = `quota` paket, atau `null` bila tanpa kuota sendiri
