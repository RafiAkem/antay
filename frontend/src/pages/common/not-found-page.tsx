import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ground px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-lg font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm leading-5 text-muted">
          Alamat yang kamu buka tidak ada. Kembali ke halaman pengunjung untuk memesan jam tukar.
        </p>
        <div className="mt-5">
          <Link
            to="/"
            className="inline-flex h-[38px] items-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white"
          >
            Ke halaman pengunjung
          </Link>
        </div>
      </Card>
    </div>
  )
}
