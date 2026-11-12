import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchCustomer, loginCustomer, logoutCustomer, registerCustomer } from './catalog-api'
import type { Customer, RegisterPayload } from '@/types/catalog'

// Sesi pembeli terpisah dari sesi petugas (cookie dan endpoint beda), jadi
// provider-nya juga terpisah. Satu orang bisa saja masuk sebagai keduanya.
type CustomerSessionState = {
  customer: Customer | null
  loading: boolean
  login: (email: string, password: string) => Promise<Customer>
  register: (payload: RegisterPayload) => Promise<Customer>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const CustomerSessionContext = createContext<CustomerSessionState | null>(null)
const HINT = 'antay-customer-hint'

// Probe /me hanya kalau pernah masuk di perangkat ini, atau halamannya memang
// butuh akun. Pengunjung yang cuma melihat-lihat tidak perlu kena 401.
const ACCOUNT_PATHS = ['/account', '/tickets', '/orders']

function needsProbe(): boolean {
  try {
    if (localStorage.getItem(HINT) === '1') return true
  } catch {
    return true
  }
  const path = window.location.pathname
  if (path.endsWith('/checkout')) return true
  return ACCOUNT_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function remember(customer: Customer | null) {
  try {
    if (customer) localStorage.setItem(HINT, '1')
    else localStorage.removeItem(HINT)
  } catch {
    // mode privat atau storage penuh: sesi tetap jalan, cuma probe-nya tidak diingat
  }
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(needsProbe)

  const refresh = useCallback(async () => {
    try {
      const current = await fetchCustomer()
      setCustomer(current)
      remember(current)
    } catch {
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!needsProbe()) return
    let alive = true
    fetchCustomer()
      .then((current) => {
        if (!alive) return
        setCustomer(current)
        remember(current)
      })
      .catch(() => {
        if (alive) setCustomer(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const current = await loginCustomer(email, password)
    remember(current)
    setCustomer(current)
    setLoading(false)
    return current
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const current = await registerCustomer(payload)
    remember(current)
    setCustomer(current)
    setLoading(false)
    return current
  }, [])

  const logout = useCallback(async () => {
    await logoutCustomer()
    remember(null)
    setCustomer(null)
  }, [])

  const value = useMemo(
    () => ({ customer, loading, login, register, logout, refresh }),
    [customer, loading, login, register, logout, refresh],
  )
  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>
}

export function useCustomer(): CustomerSessionState {
  const context = useContext(CustomerSessionContext)
  if (!context) throw new Error('useCustomer harus dipakai di dalam CustomerSessionProvider')
  return context
}
