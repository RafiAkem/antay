import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/components/ui/cn'
import { useCustomer } from '@/lib/customer-session'
import { AccountMenu } from './account-menu'
import { nextAfterAuth, withNext } from './auth-rules'

// Sisi kanan header publik: Masuk saat belum masuk, menu akun saat sudah.
export function HeaderAccount({ solid }: { solid: boolean }) {
  const { customer, loading } = useCustomer()
  const location = useLocation()

  // Selama sesi dicek, sisakan tempat seukuran tombol supaya header tidak bergeser.
  if (loading) return <span aria-hidden="true" className="ml-auto h-9 w-[76px] flex-none" />
  if (customer) return <AccountMenu customer={customer} solid={solid} />

  // Pembeli yang menekan Masuk dari halaman event dikembalikan ke event itu.
  const here = `${location.pathname}${location.search}`
  const next = location.pathname === '/' ? null : nextAfterAuth(here)

  return (
    <Link
      to={withNext('/account/login', next)}
      className={cn(
        'ml-auto inline-flex h-9 flex-none items-center rounded-control border px-3.5 text-[13px] font-semibold transition-colors',
        solid ? 'border-control text-ink hover:bg-raised' : 'border-white/60 text-white hover:bg-white/10',
      )}
    >
      Masuk
    </Link>
  )
}
