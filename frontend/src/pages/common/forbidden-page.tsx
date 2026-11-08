import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

export function ForbiddenPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ground px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-lg font-semibold">Tidak punya akses</h1>
        <p className="mt-1 text-sm leading-5 text-muted">
          Akun ini tidak boleh membuka halaman tersebut. Kalau merasa ini keliru, hubungi admin mal.
        </p>
        <div className="mt-5 flex gap-2">
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
