import { Link, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/navigation/icons'
import { useSession } from '@/lib/session'

// Halaman pengunjung dan papan TV: tanpa sidebar, hanya header tipis.
export function PublicLayout() {
  const { user } = useSession()

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-border-soft bg-ground">
        <div className="mx-auto flex h-[52px] w-full max-w-[1280px] items-center justify-between gap-3 px-[clamp(16px,4vw,40px)]">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark size={22} />
            <b className="text-base font-bold tracking-[-0.01em]">Antay</b>
          </Link>
          <div className="flex items-center gap-3 text-[13px]">
            <span className="hidden text-muted sm:inline">Summarecon Mall Bandung</span>
            <Link to="/events" className="hidden font-medium text-muted hover:text-ink sm:inline">
              Event
            </Link>
            <Link to="/board" target="_blank" rel="noopener" className="font-medium text-muted hover:text-ink">
              Papan
            </Link>
            <Link
              to={user ? (user.role === 'admin' ? '/dashboard' : '/counter') : '/login'}
              className="font-medium text-accent-ink hover:underline"
            >
              {user ? 'Buka loket' : 'Masuk petugas'}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] px-[clamp(16px,4vw,40px)] pt-6 pb-16">
        <Outlet />
      </main>
      <footer className="border-t border-border-soft py-6">
        <div className="mx-auto w-full max-w-[1280px] px-[clamp(16px,4vw,40px)] text-xs leading-[17px] text-muted">
          Prototipe Bandung Build Challenge 2026. Semua event, nama, dan angka adalah data contoh.
        </div>
      </footer>
    </div>
  )
}
