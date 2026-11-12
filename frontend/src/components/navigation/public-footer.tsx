import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/container'
import { useSession } from '@/lib/session'

const LINK = 'font-semibold text-muted hover:text-ink'

// Tautan petugas sengaja di footer: pembeli tidak butuh, tapi petugas loket
// dan layar TV papan antrean tetap bisa dibuka dari halaman publik.
export function PublicFooter() {
  const { user } = useSession()
  const staffPath = user ? (user.role === 'admin' ? '/dashboard' : '/counter') : '/login'

  return (
    <footer className="border-t border-border-soft bg-surface">
      <Container size="wide" className="grid gap-3 py-6 text-[13px] leading-[19px]">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <b className="font-bold text-ink">SummaPass · Summarecon Mall Bandung</b>
          <nav aria-label="Tautan lain" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/events" className={LINK}>
              Semua event
            </Link>
            <Link to="/board" target="_blank" rel="noopener" className={LINK}>
              Papan antrean
              <span className="sr-only"> (tab baru)</span>
            </Link>
            <Link to={staffPath} className={LINK}>
              {user ? 'Buka loket' : 'Masuk petugas'}
            </Link>
          </nav>
        </div>
        <p className="text-xs leading-[17px] text-muted">
          Ngantri dengan santai. Beli tiket, pilih kursi, lalu tukar di loket sesuai jam yang kamu pilih.
        </p>
      </Container>
    </footer>
  )
}
