# Antay

*Ngantay mah santai.* Sistem penukaran tiket dan antrean untuk event di Summarecon Mall Bandung. Versi ini menggantikan prototipe satu berkas dengan backend Go, database PostgreSQL, dan frontend React.

Prototipe aslinya tetap ada di branch `prototype` (`loket-pintar.html` + `server.mjs`).

## Isi

| Halaman | Route | Untuk | Fungsi |
|---|---|---|---|
| Beranda | `/` | Pengunjung | Penjelasan produk dan cara pakai |
| Event | `/events` | Pengunjung | Card semua event hari ini |
| Detail event | `/events/:eventId` | Pengunjung | Pilih slot jam datang, dapat kode + QR, lihat dan batalkan tiket |
| Papan | `/board` | Layar TV | Antrean, perkiraan tunggu, slot berjalan dan berikutnya |
| Masuk | `/login` | Petugas | Login akun staff atau admin |
| Loket | `/counter` | Petugas loket | Cek kode, cocokkan KTP, serahkan item, koreksi antrean |
| Dasbor | `/dashboard` | Admin mal | Statistik per slot, ringkasan semua event, buat event baru |

Nama route dan folder memakai bahasa Inggris; isi teks tetap bahasa Indonesia.

## Struktur

```
backend/                       Go 1.27, net/http, pgx, sqlc — Domain-Driven Design
  cmd/api/                     composition root: rangkai repo -> service -> handler
  cmd/seed/                    data contoh + migrasi
  internal/domain/             inti bisnis, tanpa pgx dan tanpa HTTP
    shared/                    jam slot (menit sejak tengah malam) dan Clock
    event/                     aggregate event: slot, kuota, antrean, validasi jadwal
    ticket/                    aggregate tiket: kode, slot kedatangan, timing loket
    user/                      akun petugas/admin dan sesi
  internal/application/        use case, hanya bergantung ke interface domain
    catalog/                   daftar event dan papan antrean (pengunjung)
    booking/                   pesan tiket + retry kode bentrok, lihat dan batalkan tiket
    identity/                  login dan sesi petugas
    counter/                   loket: pemegang tiket, koreksi antrean, cek, tukar
    scheduling/                admin membuat event
    reporting/                 dasbor; read model sendiri untuk query agregat
  internal/infrastructure/
    config/                    baca environment dan .env
    postgres/                  pool, migrasi tertanam, implementasi repository
      queries/                 query sqlc
      store/                   hasil generate sqlc (jangan diedit)
      migrations/              skema SQL
    security/                  JWT RS256 dan bcrypt
  internal/interfaces/http/    router dan rute
    handler/                   handler per area, memetakan error domain ke HTTP
    middleware/                sesi cookie HttpOnly, CSRF double submit, batas per IP, log, recover
    dto/                       bentuk JSON yang dikirim ke frontend
    response/                  envelope sukses/error standar
  openapi.yaml                 spec OpenAPI 3.1
frontend/                      React 19 + TypeScript + Vite 8 + Tailwind 4
  src/lib/api.ts               satu-satunya pemanggil fetch
  src/components/ui/           primitif (Button, Input, Select, Modal, Toast)
  src/pages/                   halaman per menu
docs/api-contract.md           kontrak API yang dipakai bersama
docs/system-map.html           peta sistem: halaman, nginx, API, use case, database (EN/ID)
docs/erd.html                  ERD database: tabel, relasi, aturan (EN/ID)
```

Dua berkas HTML di `docs/` bisa dibuka langsung di browser. Kalau skema, rute, atau alur berubah, perbarui keduanya di commit yang sama.

Arah dependensi: `interfaces -> application -> domain <- infrastructure`. Domain tidak mengimpor layer lain; repository didefinisikan sebagai interface di domain dan diimplementasikan di `infrastructure/postgres`.

## Menjalankan

Butuh Go 1.27, Node 20+, dan PostgreSQL (Docker opsional).

```bash
# 1. Database
docker compose up -d db          # atau pakai PostgreSQL lokal

# 2. Backend
cd backend
cp .env.example .env
go run ./cmd/seed                # migrasi + data contoh
go run ./cmd/api                 # http://localhost:8080

# 3. Frontend
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

Akun demo:

| Email | Kata sandi | Peran |
|---|---|---|
| `admin@antay.id` | `admin123` | admin, bisa semua halaman |
| `petugas@antay.id` | `petugas123` | staff, tanpa dasbor |

Tanpa Docker dan tanpa `DATABASE_URL`, backend memakai `postgres://antay:antay@127.0.0.1:5432/antay`. Buat role dan database sekali:

```sql
CREATE ROLE antay LOGIN PASSWORD 'antay';
CREATE DATABASE antay OWNER antay;
```

Perintah lain: `make seed`, `make api`, `make web`, `make build`, `make test`, `make lint`, `make sqlc`.

### Produksi di balik nginx

API membatasi request per IP, jadi nginx harus meneruskan IP asli pengunjung. Tanpa header ini batas dilewati sama sekali (lebih aman daripada semua pengunjung berbagi satu kuota), dan tiket bisa dipesan tanpa batas:

```nginx
location ~ ^/(public|operational|analytics|csrf|health) {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Header itu hanya dipercaya bila koneksi datang dari loopback, jadi API dan nginx harus di mesin yang sama. Di produksi juga set `COOKIE_SECURE=true` karena situsnya HTTPS.

## Keputusan yang perlu diketahui

- Semua primary key UUID (`gen_random_uuid()`).
- Jam slot disimpan sebagai menit sejak tengah malam. Acara berjalan satu hari di satu zona waktu, jadi aritmetika slot bebas masalah zona waktu. API tetap mengirim `"HH:MM"`.
- Kuota slot dicek di dalam transaksi dengan `SELECT ... FOR UPDATE` pada baris event, supaya dua pemesan bersamaan tidak melewati kapasitas.
- Pengunjung tidak punya akun. Hanya kode tiket dan id event-nya yang disimpan di perangkat, detailnya selalu diambil dari server.
- Karena tanpa akun, memegang kode berarti pemilik tiket. Pengunjung bisa membatalkan tiket yang belum ditukar (`POST /public/v1/tickets/{code}/cancellations`); tiket `cancelled` tidak dihitung ke kuota, jadi tempatnya langsung bisa dipesan lagi.
- Pesan dan batal tiket dibatasi 30 request per 10 menit per IP, login 10 per 10 menit (`429 RATE_LIMITED` + `Retry-After`). Batasnya longgar karena pengunjung di WiFi mal atau CGNAT operator berbagi satu IP. Hitungannya di memori satu proses, jadi kalau API dijalankan lebih dari satu instance, pindahkan ke Postgres atau Redis.
- Sesi petugas: JWT RS256 berumur pendek di cookie `HttpOnly; SameSite=Strict`, plus token CSRF double submit untuk semua tulis.
- Antrean dihitung manual oleh petugas di versi ini. Kamera dan AI (COCO-SSD + Jev) dari prototipe belum dibawa.
- Grafik dasbor digambar dengan SVG biasa, tanpa library chart.

## Belum ada

Scan QR kamera, asisten WhatsApp, dan impor massal. Hitungan antrean otomatis dari kamera menyusul.

## Catatan

Semua event, nama, dan angka adalah data contoh, bukan layanan resmi Summarecon.
