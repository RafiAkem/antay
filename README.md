# Antay

*Ngantay mah santai.* Sistem penukaran tiket dan antrean untuk event di Summarecon Mall Bandung. Versi ini menggantikan prototipe satu berkas dengan backend Go, database PostgreSQL, dan frontend React.

Prototipe aslinya tetap ada di branch `prototype` (`loket-pintar.html` + `server.mjs`).

## Isi

| Halaman | Untuk | Fungsi |
|---|---|---|
| `/` | Pengunjung | Pilih event dan slot jam datang, dapat kode + QR, lihat status tiket |
| `/loket` | Petugas loket | Cek kode, cocokkan KTP, serahkan item, koreksi antrean, atur loket buka |
| `/papan` | Layar TV | Antrean, perkiraan tunggu, slot berjalan dan berikutnya |
| `/dasbor` | Admin mal | Statistik per slot, ringkasan semua event, buat event baru |

## Struktur

```
backend/                 Go 1.27, net/http, pgx, sqlc
  cmd/api/               server HTTP
  cmd/seed/              data contoh + migrasi
  internal/app/          dependensi bersama, helper slot dan antrean, DTO
  internal/auth/         JWT RS256 di cookie HttpOnly, CSRF double submit
  internal/public/       endpoint tanpa sesi (pengunjung, papan)
  internal/operational/  endpoint petugas dan admin
  internal/analytics/    endpoint dasbor
  internal/health/       /health/live, /ready, /startup, /dependencies
  internal/db/           pool + migrasi tertanam
  db/queries/            query sqlc
  internal/store/        hasil generate sqlc (jangan diedit)
  openapi.yaml           spec OpenAPI 3.1
frontend/                React 19 + TypeScript + Vite 8 + Tailwind 4
  src/lib/api.ts         satu-satunya pemanggil fetch
  src/components/ui/     primitif (Button, Input, Select, Modal, Toast)
  src/pages/             halaman per menu
docs/api-contract.md     kontrak API yang dipakai bersama
```

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

## Keputusan yang perlu diketahui

- Semua primary key UUID (`gen_random_uuid()`).
- Jam slot disimpan sebagai menit sejak tengah malam. Acara berjalan satu hari di satu zona waktu, jadi aritmetika slot bebas masalah zona waktu. API tetap mengirim `"HH:MM"`.
- Kuota slot dicek di dalam transaksi dengan `SELECT ... FOR UPDATE` pada baris event, supaya dua pemesan bersamaan tidak melewati kapasitas.
- Pengunjung tidak punya akun. Hanya kode tiket yang disimpan di perangkat, detailnya selalu diambil dari server.
- Sesi petugas: JWT RS256 berumur pendek di cookie `HttpOnly; SameSite=Strict`, plus token CSRF double submit untuk semua tulis.
- Antrean dihitung manual oleh petugas di versi ini. Kamera dan AI (COCO-SSD + Jev) dari prototipe belum dibawa.
- Grafik dasbor digambar dengan SVG biasa, tanpa library chart.

## Belum ada

Scan QR kamera, asisten WhatsApp, dan impor massal. Hitungan antrean otomatis dari kamera menyusul.

## Catatan

Semua event, nama, dan angka adalah data contoh, bukan layanan resmi Summarecon.
