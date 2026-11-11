import { useSyncExternalStore } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { HeaderAccount } from '@/components/account/header-account'
import { Container } from '@/components/ui/container'
import { cn } from '@/components/ui/cn'
import { BrandMark } from './icons'
import { PUBLIC_MENU } from './menu-items'

function subscribeScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

// Snapshot-nya boolean, jadi header hanya render ulang saat melewati ambang,
// bukan di setiap piksel gulir.
function useScrolledPast(threshold: number): boolean {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > threshold,
    () => false,
  )
}

// overlay: halaman dibuka dengan foto hero. Header melayang transparan di atas
// foto dengan scrim gelap, lalu berubah putih begitu halaman digulir.
export function PublicHeader({ overlay }: { overlay: boolean }) {
  const scrolled = useScrolledPast(24)
  const solid = !overlay || scrolled

  return (
    <header
      className={cn(
        'top-0 z-30 transition-colors',
        overlay ? 'fixed inset-x-0' : 'sticky',
        solid ? 'border-b border-border-soft bg-surface text-ink' : 'border-b border-transparent text-white',
      )}
    >
      {solid ? null : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -bottom-10 bg-linear-to-b from-night/60 to-transparent"
        />
      )}
      <Container size="wide" className="relative flex h-header items-center gap-6">
        <Link to="/" className="flex flex-none items-center gap-2">
          <BrandMark size={24} />
          <b className="text-[17px] font-bold tracking-[-0.01em]">Antay</b>
        </Link>

        <nav aria-label="Menu utama" className="hidden h-full items-stretch gap-1 lg:flex">
          {PUBLIC_MENU.filter((item) => item.desktop).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center border-b-2 px-3 text-sm font-semibold transition-colors',
                  isActive
                    ? solid
                      ? 'border-accent text-ink'
                      : 'border-white text-white'
                    : solid
                      ? 'border-transparent text-muted hover:text-ink'
                      : 'border-transparent text-white/85 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <HeaderAccount solid={solid} />
      </Container>
    </header>
  )
}
