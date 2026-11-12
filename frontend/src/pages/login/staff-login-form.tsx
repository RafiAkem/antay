import { FormRow } from '@/components/admin/shared/form-row'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import type { StaffLogin } from './use-staff-login'

export function StaffLoginForm({ login }: { login: StaffLogin }) {
  return (
    <form className="mt-5 grid gap-4" noValidate onSubmit={login.submit}>
      <FormRow id="staff-email" label="Email">
        <Input
          id="staff-email"
          type="email"
          name="email"
          autoComplete="username"
          value={login.email}
          onChange={(event) => login.setEmail(event.target.value)}
          placeholder="petugas@antay.id"
          disabled={login.busy}
          error={login.invalid.email}
        />
      </FormRow>
      <FormRow id="staff-password" label="Kata sandi">
        <Input
          id="staff-password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={login.password}
          onChange={(event) => login.setPassword(event.target.value)}
          placeholder="Kata sandi akun"
          disabled={login.busy}
          error={login.invalid.password}
        />
      </FormRow>

      {login.error ? (
        <p role="alert" className="rounded-control bg-negative-bg px-3 py-2.5 text-sm text-negative-ink">
          {login.error}
        </p>
      ) : null}

      <Button type="submit" size="large" block disabled={login.busy || login.sessionLoading}>
        {login.busy ? 'Memeriksa...' : 'Masuk'}
      </Button>
    </form>
  )
}
