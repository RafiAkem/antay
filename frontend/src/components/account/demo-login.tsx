import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { homeForRole } from '@/components/admin/shared/role-home'
import { cn } from '@/components/ui/cn'
import { ApiError } from '@/lib/api'
import { useCustomer } from '@/lib/customer-session'
import { useSession } from '@/lib/session'
import { DEMO_ACCOUNTS, DEMO_LOGIN_ENABLED, type DemoAccount } from './demo-accounts'

type DemoLoginProps = {
  // Tujuan pembeli setelah masuk. Peran internal selalu ke halaman kerjanya.
  customerDestination: string
  className?: string
}

// Pilih peran, langsung masuk dengan akun demo peran itu. Pembeli masuk lewat
// sesi pembeli, tiga peran lain lewat sesi internal, jadi tiap tombol memakai
// jalur login yang sama dengan form biasa.
export function DemoLogin({ customerDestination, className }: DemoLoginProps) {
  const customerSession = useCustomer()
  const staffSession = useSession()
  const navigate = useNavigate()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!DEMO_LOGIN_ENABLED) return null

  async function enter(account: DemoAccount) {
    if (busyKey) return
    setBusyKey(account.key)
    setError(null)
    try {
      if (account.key === 'customer') {
        await customerSession.login(account.email, account.password)
        navigate(customerDestination, { replace: true })
      } else {
        const user = await staffSession.login(account.email, account.password)
        navigate(homeForRole(user.role), { replace: true })
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Akun demo belum bisa dipakai. Pastikan seed sudah dijalankan.')
      setBusyKey(null)
    }
  }

  return (
    <section aria-labelledby="demo-login-title" className={cn('grid gap-3 rounded-card border border-dashed border-control bg-raised p-4', className)}>
      <div className="grid gap-0.5">
        <h2 id="demo-login-title" className="text-sm font-bold text-ink">
          Masuk cepat dengan akun demo
        </h2>
        <p className="text-[13px] text-muted">Pilih peran, langsung masuk tanpa mengetik sandi.</p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.key}>
            <button
              type="button"
              onClick={() => void enter(account)}
              disabled={busyKey !== null}
              className="grid h-full w-full gap-0.5 rounded-control border border-border-soft bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent disabled:cursor-wait disabled:opacity-60"
            >
              <span className="text-sm font-semibold text-ink">{busyKey === account.key ? 'Masuk...' : account.label}</span>
              <span className="text-xs text-muted">{account.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-[13px] text-negative">
          {error}
        </p>
      ) : null}
    </section>
  )
}
