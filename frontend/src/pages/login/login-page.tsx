import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '@/components/navigation/icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'

function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
}

export function LoginPage() {
  const { user, loading, login } = useSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = safeNext(params.get('next'))
  const destination = (role: string) => next ?? (role === 'admin' ? '/dasbor' : '/loket')

  if (!loading && user) return <Navigate to={destination(user.role)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.')
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

  return (
    <div className="grid min-h-screen place-items-center bg-ground px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <BrandMark />
          <b className="text-lg font-bold tracking-[-0.01em]">Antay</b>
        </div>

        <Card>
          <h1 className="text-xl font-semibold tracking-[-0.01em]">Masuk petugas</h1>
          <p className="mt-1 text-sm leading-5 text-muted">
            Pakai akun yang diberikan admin mal untuk membuka loket penukaran dan papan antrean.
          </p>

          <form className="mt-5 grid gap-4" noValidate onSubmit={handleSubmit}>
            <Field label="Email">
              <Input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="petugas@antay.id"
                disabled={busy}
              />
            </Field>
            <Field label="Kata sandi">
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Kata sandi"
                disabled={busy}
              />
            </Field>

            {error ? (
              <p role="alert" className="rounded-[var(--radius-control)] bg-negative-bg px-3 py-2.5 text-sm text-negative-ink">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy || loading} className="w-full">
              {busy ? 'Memeriksa...' : 'Masuk'}
            </Button>
          </form>
        </Card>

        <p className="mt-3 text-center text-xs leading-5 text-muted">
          Akun demo: admin@antay.id / admin123 · petugas@antay.id / petugas123
        </p>
      </div>
    </div>
  )
}
