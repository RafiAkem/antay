import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { homeForRole, safeNext } from '@/components/admin/shared/role-home'
import { ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Role } from '@/types/api'

export type StaffLogin = ReturnType<typeof useStaffLogin>

export function useStaffLogin() {
  const { user, loading, login } = useSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState<{ email: boolean; password: boolean }>({ email: false, password: false })

  // ?next= menang kalau aman, karena biasanya orang dilempar ke sini dari
  // halaman yang tadi ingin dibuka. Kalau tidak ada, pakai halaman kerja perannya.
  const next = safeNext(params.get('next'))
  const destination = (role: Role) => next ?? homeForRole(role)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const missing = { email: !email.trim(), password: !password }
    setInvalid(missing)
    if (missing.email || missing.password) {
      setError('Email dan kata sandi wajib diisi.')
      document.getElementById(missing.email ? 'staff-email' : 'staff-password')?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const current = await login(email.trim(), password)
      navigate(destination(current.role), { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Tidak bisa masuk. Coba lagi sebentar lagi.')
    } finally {
      setBusy(false)
    }
  }

  return {
    redirectTo: !loading && user ? destination(user.role) : null,
    sessionLoading: loading,
    email,
    password,
    busy,
    error,
    invalid,
    setEmail: (value: string) => {
      setEmail(value)
      setInvalid((prev) => ({ ...prev, email: false }))
    },
    setPassword: (value: string) => {
      setPassword(value)
      setInvalid((prev) => ({ ...prev, password: false }))
    },
    submit,
  }
}
