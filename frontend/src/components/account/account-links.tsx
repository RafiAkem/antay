import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useLogout } from './use-logout'

// Pintasan di bawah profil. Tiket saya dibuat sebagai baris besar karena itu
// alasan utama orang membuka halaman Akun; Keluar sengaja kecil dan terpisah.
export function AccountLinks() {
  const { busy, logout } = useLogout()

  return (
    <div className="grid gap-4">
      <Link
        to="/tickets"
        className="group flex items-center justify-between gap-4 rounded-card border border-border-soft bg-surface px-4 py-4 transition-colors hover:border-control sm:px-5"
      >
        <span className="grid gap-0.5">
          <b className="text-[15px] leading-[22px] font-semibold text-ink">Tiket saya</b>
          <span className="text-[13px] leading-[19px] text-muted">QR tiket dan jadwal tukar ada di sini.</span>
        </span>
        <span aria-hidden="true" className="text-lg text-muted transition-transform group-hover:translate-x-0.5">
          ›
        </span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <span className="text-[13px] leading-[19px] text-muted">Pakai perangkat bersama? Keluar setelah selesai.</span>
        <Button variant="ghost" size="small" onClick={() => void logout()} disabled={busy}>
          {busy ? 'Keluar...' : 'Keluar'}
        </Button>
      </div>
    </div>
  )
}
