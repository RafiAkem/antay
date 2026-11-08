import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const FALLBACK_MESSAGE = 'Data halaman ini tidak bisa dimuat. Periksa koneksi lalu coba lagi.'

// Dipakai di dalam layout untuk kegagalan memuat data tingkat halaman.
export function ErrorPage({
  title = 'Halaman gagal dimuat',
  message,
  onRetry,
}: {
  title?: string
  message?: string | null
  onRetry?: () => void
}) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <div className="grid justify-items-start gap-3">
        <div className="grid gap-1">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm leading-5 text-muted">{message || FALLBACK_MESSAGE}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {onRetry ? <Button onClick={onRetry}>Coba lagi</Button> : null}
          <Link
            to="/events"
            className="inline-flex h-[38px] items-center justify-center rounded-[var(--radius-control)] border border-control bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-raised"
          >
            Lihat daftar event
          </Link>
        </div>
      </div>
    </Card>
  )
}
