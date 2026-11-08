import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'

// Dipakai sebagai guard konten di dalam AppLayout, jadi tidak boleh memaksa tinggi layar penuh.
export function ForbiddenPage() {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <div className="grid justify-items-start gap-3">
        <Pill tone="bad">403</Pill>
        <div className="grid gap-1">
          <h1 className="text-lg font-semibold">Tidak punya akses ke halaman ini</h1>
          <p className="text-sm leading-5 text-muted">
            Sesi petugas yang sedang aktif tidak punya peran untuk membuka halaman ini. Biasanya ini
            terjadi karena akun yang dipakai bukan akun loket atau admin mal yang berhak.
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to="/events"
            className="inline-flex h-[38px] items-center justify-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-ink"
          >
            Lihat daftar event
          </Link>
          <Link
            to="/login"
            className="inline-flex h-[38px] items-center justify-center rounded-[var(--radius-control)] border border-control bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-raised"
          >
            Masuk dengan akun lain
          </Link>
        </div>
      </div>
    </Card>
  )
}
