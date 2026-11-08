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

- `X-Request-ID` diterima dan dikembalikan. Semua respons `Cache-Control: no-store`.

## Status code

| Kode | Dipakai untuk |
|---|---|
| 200 | baca dan update berhasil |
| 201 | tiket atau event baru dibuat |
| 204 | logout, `GET /csrf` |
| 400 | body bukan JSON valid, key tidak dikenal, field wajib kosong |
| 401 | tidak ada sesi / sesi kedaluwarsa |
| 403 | sesi ada tapi role tidak cukup, atau token CSRF tidak cocok |
| 404 | event atau kode tiket tidak ada |
| 409 | tiket sudah ditukar, event sudah tutup |
| 415 | content type bukan JSON |
| 422 | format benar tapi tidak lolos aturan bisnis (slot penuh, KTP belum dicentang, jam di luar slot) |
| 500 | kesalahan tak terduga |
| 503 | database tidak siap |

## Autentikasi

- `POST /operational/v1/auth/login` body `{ "email": "...", "password": "..." }`.
  Sukses `200` + cookie `antay_session` (HttpOnly, SameSite=Strict).
- `POST /operational/v1/auth/logout` → `204`, cookie dihapus.
- `GET /operational/v1/auth/me` → `200` `{ "user": User }`, `401` bila tanpa sesi.
- Semua POST/PATCH/DELETE wajib mengirim header `X-CSRF-TOKEN` yang nilainya sama
  dengan cookie `antay_csrf`. Token diambil lewat `GET /csrf` (`204`).
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

`upcoming` maksimal 4 slot yang belum lewat, urut jam.

### `POST /public/v1/tickets`

Body:

```json
{ "eventId": "uuid", "slotStart": "10:30", "visitorName": "Rizky Pratama" }
```

Aturan: `visitorName` 3 sampai 60 karakter setelah spasi dirapikan; `slotStart`
harus tepat di batas slot event dan belum lewat; kuota slot belum penuh.

- `201` `{ "ticket": Ticket }` dan header `Location: /public/v1/tickets/{code}`
- `422 SLOT_FULL`, `422 SLOT_PAST`, `422 SLOT_INVALID`, `422 EVENT_CLOSED`
- `404 NOT_FOUND` bila event tidak ada
- `400 VALIDATION` untuk nama terlalu pendek atau field kosong

### `GET /public/v1/tickets/{code}`

```json
{ "ticket": Ticket }
```

`404 NOT_FOUND` bila kode tidak dikenal. Kode dinormalisasi ke huruf besar.

---

## Operational (butuh sesi)

### `GET /operational/v1/events`

Semua event hari ini (semua status), untuk pemilih event di halaman petugas.

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

- `201` `{ "event": Event }`
- `422 INVALID_SCHEDULE` bila `closeTime` tidak lebih lambat dari `openTime`,
  selisihnya kurang dari satu slot, atau angka di luar batas
  (`slotMinutes` 10-120, `slotCapacity` 1-500, `counterCount` 1-20,
  `serviceSeconds` 30-600)
- `409 CONFLICT` bila prefix + tanggal sudah dipakai event lain

### `GET /operational/v1/events/{eventId}/waiting?slot=10:30,11:00`

Daftar pemegang tiket yang belum ditukar pada slot yang diminta. `slot` boleh
beberapa jam dipisah koma; tanpa `slot`, dipakai slot yang sedang berjalan dan
slot berikutnya.

```json
{ "tickets": [Ticket], "slots": ["10:30", "11:00"] }
```

### `PATCH /operational/v1/events/{eventId}/queue`

Body (semua opsional, minimal satu):

```json
{ "waitingCount": 34, "counterCount": 3 }
```

`200` `{ "event": Event }`. `422` bila `waitingCount` negatif atau `counterCount`
di luar 1-20.

### `GET /operational/v1/tickets/{code}`

Untuk petugas mengecek tiket. `404` hanya bila kode tidak ada.

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

`timing`: `early` bila lebih dari 15 menit sebelum slot, `on_time` bila di dalam
slot, `late` bila sudah lewat slot tapi belum ditukar, `past_slot` bila slot lewat
dan sudah ditukar.

### `POST /operational/v1/tickets/{code}/redemptions`

Body:

```json
{ "eventId": "uuid", "counter": 1, "ktpChecked": true }
```

- `200` `{ "ticket": Ticket }` setelah status jadi `redeemed`
- `422 KTP_REQUIRED` bila `ktpChecked` bukan `true`
- `409 ALREADY_REDEEMED` bila tiket sudah ditukar
- `409 WRONG_EVENT` bila `eventId` tidak cocok dengan event tiket
- `409 NOT_BOOKED` bila status tiket bukan `booked`

---

## Analytics (butuh sesi, role admin)

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

`capacity` = jumlah slot x `slotCapacity`. `left` = `capacity` - `registered`.
`noShow` = tiket `booked` yang slotnya sudah lewat.

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
  tidak `cancelled`
- slot lewat bila `start + slotMinutes <= sekarang` (menit)
