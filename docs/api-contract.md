# Kontrak API Antay

Berlaku untuk backend Go (`backend/`) dan frontend React (`frontend/`). Kalau kode
dan dokumen ini berbeda, kode yang menang, lalu dokumen ini diperbarui di commit
yang sama.

## Aturan umum

- Base path per domain: `/public/v1`, `/operational/v1`, `/analytics/v1`.
- Semua id adalah UUID string.
- Semua key JSON camelCase.
- Jam dikirim sebagai string `"HH:MM"` (24 jam). Di database disimpan sebagai
  menit sejak tengah malam.
- Tanggal dikirim `"YYYY-MM-DD"`.
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
  `Cache-Control: no-store`, kecuali `405` dari router.

## Status code

| Kode | Dipakai untuk |
|---|---|
| 200 | baca dan update berhasil |
| 201 | tiket atau event baru dibuat |
| 204 | logout, `GET /csrf` |
| 400 | body bukan JSON valid, key tidak dikenal, field kosong atau salah bentuk |
| 401 | tidak ada sesi / sesi kedaluwarsa |
| 403 | sesi ada tapi role tidak cukup, atau token CSRF tidak cocok |
| 404 | event, kode tiket, atau path tidak ada |
| 409 | tiket sudah ditukar atau milik event lain, prefix event bentrok |
| 422 | format benar tapi tidak lolos aturan bisnis (slot penuh, event sudah tutup, KTP belum dicentang, jam di luar slot) |
| 500 | kesalahan tak terduga |
| 503 | database tidak siap (hanya endpoint health) |

Body request dibatasi 1 MB, harus berisi tepat satu objek JSON, dan tidak boleh
memuat `\u0000`.

### Kode error umum

| `code` | Status | Arti |
|---|---|---|
| `VALIDATION` | 400 | body tidak valid, key tidak dikenal, field wajib kosong atau salah bentuk |
| `UNAUTHORIZED` | 401 | tidak ada sesi atau sesi kedaluwarsa |
| `FORBIDDEN` | 403 | role tidak cukup |
| `CSRF_MISSING` | 403 | header `X-CSRF-TOKEN` tidak ada atau tidak cocok dengan cookie |
| `NOT_FOUND` | 404 | event atau tiket tidak ada |
| `CONFLICT` | 409 | data bentrok dengan yang sudah ada |
| `INTERNAL` | 500 | kesalahan tak terduga; detailnya hanya di log server dengan `traceId` yang sama |

Kode khusus per endpoint ditulis di bagian masing-masing.

## Autentikasi

- `POST /operational/v1/auth/login` body `{ "email": "...", "password": "..." }`.
  Sukses `200` `{ "user": User }` + cookie `antay_session` (JWT RS256, HttpOnly,
  SameSite=Strict, umur sesuai `SESSION_TTL`).
  - `400 VALIDATION` bila email atau kata sandi kosong (`details` per field)
  - `401 INVALID_CREDENTIALS` untuk email tidak dikenal maupun kata sandi salah;
    pesan dan waktu responsnya sengaja sama supaya tidak membocorkan email yang
    terdaftar
- `POST /operational/v1/auth/logout` → `204`, cookie dihapus.
- `GET /operational/v1/auth/me` → `200` `{ "user": User }`, `401` bila tanpa sesi
  atau akun sudah nonaktif.
- Semua POST/PATCH/DELETE wajib mengirim header `X-CSRF-TOKEN` yang nilainya sama
  dengan cookie `antay_csrf`, termasuk login dan `POST /public/v1/tickets`. Token
  diambil lewat `GET /csrf` (`204`). Bila tidak cocok, server menjawab
  `403 CSRF_MISSING` sebelum memeriksa sesi.
- Role: `staff` dan `admin`. Admin boleh semua aksi staff.

```ts
type User = { id: string; email: string; name: string; role: 'staff' | 'admin' }
```

---

## Public (tanpa sesi)

### `GET /public/v1/events`

Daftar event `open` pada hari ini, sudah termasuk slot dan sisa kuota.

```json
{ "events": [Event] }
```

### `GET /public/v1/events/{eventId}`

```json
{ "event": Event }
```

`404 NOT_FOUND` bila event tidak ada atau tidak berstatus `open`.

### `GET /public/v1/events/{eventId}/board`

Data untuk layar TV. `404` bila event tidak ada atau tidak `open`.

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

### `GET /public/v1/tickets/{code}`

```json
{ "ticket": Ticket }
```

`404 NOT_FOUND` bila kode tidak dikenal. Kode dinormalisasi supaya tahan salah
ketik: huruf besar, spasi dibuang, dan tanda hubung ditambahkan setelah 2 huruf
pertama bila lupa (`ab 3k` → `AB-3K`).

---

## Operational (butuh sesi)

### `GET /operational/v1/events`

Semua event hari ini (semua status), untuk pemilih event di halaman petugas.
Angka slot sama dengan halaman pengunjung (lihat Perhitungan).

```json
{ "events": [Event] }
```

### `POST /operational/v1/events` (role admin)

Body:

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
otomatis hari ini. `createdBy` diisi user yang login.

Event langsung berstatus `open`. Teks dirapikan spasinya di ujung.

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

## Analytics (butuh sesi, role admin)

Akun staff mendapat `403 FORBIDDEN`.

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
  serviceSeconds: number; waitingCount: number; status: 'draft' | 'open' | 'closed'
  leftTotal: number; slots: Slot[]
}

type Ticket = {
  id: string; code: string; visitorName: string; slotStart: string; slotEnd: string
  status: 'booked' | 'redeemed' | 'cancelled'
  redeemedAt: string | null; redeemedCounter: number | null
  event: EventRef; queue: Queue
}
```

## Perhitungan

- `waitMinutes = ceil(waiting * serviceSeconds / 60 / counterCount)`
- `countersNeeded = max(1, ceil(waiting * serviceSeconds / 60 / 15))`
- `long = waitMinutes > 15`
- `left = max(0, slotCapacity - booked)`, `booked` menghitung semua tiket yang
  tidak `cancelled` (termasuk yang sudah `redeemed`), sama dengan pengecekan kuota
  saat memesan. Berlaku untuk endpoint public dan operational.
- `leftTotal` = jumlah `left` dari slot yang belum lewat
- slot lewat bila `start + slotMinutes <= sekarang` (menit)
