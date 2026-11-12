import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { useCustomer } from '@/lib/customer-session'
import { checkEmail, collectErrors } from './auth-rules'
import { FormField } from './form-field'
import { PasswordInput } from './password-input'
import { useAuthForm } from './use-auth-form'
import { WaitNotice } from './wait-notice'

const FIELDS = ['email', 'password'] as const

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useCustomer()
  const form = useAuthForm('login', FIELDS)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = collectErrors({
      email: checkEmail(email),
      password: password ? undefined : 'Kata sandi wajib diisi.',
    })
    if (form.reject(invalid)) return
    await form.run(
      async () => {
        await login(email.trim(), password)
        onSuccess()
      },
      // Sengaja tidak bilang mana yang salah, email atau sandinya. Dua-duanya
      // dibingkai merah dan kalimat server muncul di bawah sandi.
      (error) => (error.code === 'INVALID_CREDENTIALS' ? { email: '', password: error.message } : null),
    )
  }

  const locked = form.busy || form.waitSeconds > 0

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <FormField id={form.inputId('email')} label="Email" error={form.errors.email}>
        {(control) => (
          <Input
            {...control}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            error={form.errors.email !== undefined}
            disabled={form.busy}
            onChange={(event) => {
              setEmail(event.target.value)
              form.clear('email')
            }}
          />
        )}
      </FormField>

      <FormField id={form.inputId('password')} label="Kata sandi" error={form.errors.password}>
        {(control) => (
          <PasswordInput
            {...control}
            name="password"
            autoComplete="current-password"
            value={password}
            error={form.errors.password !== undefined}
            disabled={form.busy}
            onChange={(event) => {
              setPassword(event.target.value)
              form.clear('password')
              // bingkai merah email dari "sandi salah" ikut hilang, galat format email tidak
              if (form.errors.email === '') form.clear('email')
            }}
          />
        )}
      </FormField>

      <WaitNotice seconds={form.waitSeconds} />

      <Button type="submit" size="large" block disabled={locked} aria-busy={form.busy || undefined}>
        {form.busy ? 'Memeriksa...' : 'Masuk'}
      </Button>
    </form>
  )
}
