import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

const QUICK_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/events', label: 'Event hari ini' },
  { to: '/board', label: 'Papan antrean' },
  { to: '/login', label: 'Masuk petugas' },
]

// Halaman penuh di luar layout, jadi boleh memusatkan diri di layar.
export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ground px-4 py-10">
      <Card className="w-full max-w-lg">
        <div className="grid gap-4">
          <p aria-hidden="true" className="font-mono text-[64px] font-bold leading-none text-tint-200">
            404
          </p>
          <div className="grid gap-1">
            <h1 className="text-xl font-semibold tracking-[-0.01em]">Halaman tidak ditemukan</h1>
            <p className="text-sm leading-5 text-muted">
              Alamat yang kamu buka tidak ada atau salah tulis. Pilih tautan di bawah untuk
              melanjutkan.
            </p>
          </div>
          <Link
            to="/events"
            className="inline-flex h-[38px] w-fit items-center justify-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-ink"
          >
            Lihat event hari ini
          </Link>
          <nav aria-label="Tautan cepat" className="grid gap-1 border-t border-rule pt-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="w-fit text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Card>
    </div>
  )
}
