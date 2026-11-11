import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandMark, NavIcon } from '@/components/navigation/icons'
import { visibleMenu } from '@/components/navigation/menu-items'
import { useSession } from '@/lib/session'
import type { Role } from '@/types/api'

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Manajemen mal',
  staff: 'Petugas loket',
  organizer: 'Penyelenggara',
}

export function AppLayout() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const items = visibleMenu(user?.role ?? null)

  async function handleLogout() {
    await logout().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <div className="grid min-h-full grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border-soft px-3 pt-5 pb-4 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center gap-2.5 px-2">
          <BrandMark />
          <b className="text-[18px] font-bold tracking-[-0.01em]">Antay</b>
        </div>
        <div className="grid gap-0.5 px-2 pt-1.5 pb-4 text-[13px] leading-[18px] text-muted">
          <strong className="text-sm font-semibold text-ink">{user?.name ?? ''}</strong>
          <span>{user ? ROLE_LABEL[user.role] : ''}</span>
        </div>
        <nav aria-label="Menu utama" className="grid gap-0.5">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              target={item.newTab ? '_blank' : undefined}
              rel={item.newTab ? 'noopener' : undefined}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex h-8 items-center gap-2.5 rounded-control px-2.5 text-sm ${
                  isActive ? 'bg-tint-100 font-semibold text-accent-ink' : 'text-muted hover:bg-raised hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-accent' : ''}>
                    <NavIcon name={item.icon} />
                  </span>
                  {item.label}
                  {item.newTab ? <span className="sr-only"> (tab baru)</span> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-3 border-t border-border-soft px-2 pt-3">
          <p className="text-xs leading-[17px] text-muted">Prototipe Bandung Build Challenge 2026. Data contoh, bukan layanan resmi.</p>
          <button
            type="button"
            onClick={handleLogout}
            className="text-left text-[13px] font-semibold text-muted hover:text-ink"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-[52px] items-center justify-between gap-3 border-b border-border-soft bg-surface px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <b className="text-base font-bold">Antay</b>
          </div>
          <button type="button" onClick={handleLogout} className="text-[13px] font-semibold text-muted">
            Keluar
          </button>
        </header>

        <main className="pb-28 lg:pb-12">
          <Outlet />
        </main>

        <nav
          aria-label="Menu utama"
          className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-border-soft bg-surface px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] lg:hidden"
        >
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              target={item.newTab ? '_blank' : undefined}
              rel={item.newTab ? 'noopener' : undefined}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex h-12 flex-[1_0_72px] flex-col items-center justify-center gap-0.5 rounded px-1 text-center text-[11px] leading-[14px] ${
                  isActive ? 'text-accent-ink' : 'text-muted'
                }`
              }
            >
              <NavIcon name={item.icon} />
              {item.label}
              {item.newTab ? <span className="sr-only"> (tab baru)</span> : null}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
