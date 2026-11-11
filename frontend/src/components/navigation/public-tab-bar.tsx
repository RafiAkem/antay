import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/components/ui/cn'
import { useCustomer } from '@/lib/customer-session'
import { NavIcon } from './icons'
import { PUBLIC_MENU } from './menu-items'

// Tab bar ponsel. Tingginya dari token --spacing-tabbar; PublicLayout memakai
// angka yang sama untuk padding bawah, jadi jangan ganti tinggi di sini saja.
export function PublicTabBar() {
  const { customer } = useCustomer()
  const { pathname } = useLocation()
  // Halaman masuk dan daftar tetap dihitung bagian dari tab Akun.
  const inAccount = pathname === '/account' || pathname.startsWith('/account/')

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border-soft bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
    >
      {PUBLIC_MENU.map((item) => {
        const isAccount = item.path === '/account'
        // Belum masuk: Akun langsung ke halaman masuk, bukan lewat pengalihan dari /account.
        const to = isAccount && !customer ? '/account/login' : item.path
        return (
          <NavLink
            key={item.path}
            to={to}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-tabbar flex-col items-center justify-center gap-1 text-[11px] leading-[14px] font-semibold',
                (isAccount ? inAccount : isActive) ? 'text-accent' : 'text-muted',
              )
            }
          >
            <NavIcon name={item.icon} size={20} />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
