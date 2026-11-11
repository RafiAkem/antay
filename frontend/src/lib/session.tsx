import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchSession, login as loginRequest, logout as logoutRequest } from './api'
import type { User } from '@/types/api'

type SessionState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)
const HINT = 'antay-session-hint'

// Hanya halaman yang dijaga yang perlu menanyakan sesi. Selain itu, probe /me
// hanya menghasilkan 401 yang mengotori console pengunjung.
const GUARDED_PATHS = ['/counter', '/dashboard', '/manage', '/admin', '/403']

function needsProbe(): boolean {
  try {
    if (localStorage.getItem(HINT) === '1') return true
  } catch {
    return true
  }
  const path = window.location.pathname
  return GUARDED_PATHS.some((guarded) => path === guarded || path.startsWith(`${guarded}/`))
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(needsProbe)

  useEffect(() => {
    if (!needsProbe()) return
    let alive = true
    fetchSession()
      .then((current) => {
        if (alive) setUser(current)
        if (current) localStorage.setItem(HINT, '1')
        else localStorage.removeItem(HINT)
      })
      .catch(() => {
        if (alive) setUser(null)
        localStorage.removeItem(HINT)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const current = await loginRequest(email, password)
    localStorage.setItem(HINT, '1')
    setUser(current)
    setLoading(false)
    return current
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    localStorage.removeItem(HINT)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession harus dipakai di dalam SessionProvider')
  return context
}
