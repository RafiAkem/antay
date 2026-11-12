import type { Role } from '@/types/api'

// Akun demo dari seed backend (backend/cmd/seed). Tombol masuk sekali ketuk ini
// untuk prototipe dan demo, jadi harus dinyalakan sendiri lewat
// VITE_DEMO_LOGIN=true saat build. Build produksi tidak menyalakannya, dan
// daftar akun di bawah ikut kosong: sandi demo tidak pernah masuk ke berkas
// JavaScript yang diunduh browser.
export const DEMO_LOGIN_ENABLED = import.meta.env.VITE_DEMO_LOGIN === 'true'

export type DemoAccount = {
  key: 'customer' | Role
  label: string
  hint: string
  email: string
  password: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = DEMO_LOGIN_ENABLED
  ? [
      { key: 'customer', label: 'Pembeli', hint: 'Beli tiket dan pilih kursi', email: 'pembeli@antay.id', password: 'pembeli123' },
      { key: 'organizer', label: 'Penyelenggara', hint: 'Atur event dan denah kursi', email: 'organizer@antay.id', password: 'organizer123' },
      { key: 'staff', label: 'Petugas loket', hint: 'Cek dan tukar tiket', email: 'petugas@antay.id', password: 'petugas123' },
      { key: 'admin', label: 'Admin mal', hint: 'Persetujuan dan dasbor', email: 'admin@antay.id', password: 'admin123' },
    ]
  : []
