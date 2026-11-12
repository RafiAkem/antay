import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { useCustomer } from '@/lib/customer-session'
import {
  checkEmail,
  checkName,
  checkNewPassword,
  checkPhone,
  cleanPhone,
  collectErrors,
  passwordHint,
} from './auth-rules'
import { FormField } from './form-field'
import { PasswordInput } from './password-input'
import { useAuthForm } from './use-auth-form'
import { WaitNotice } from './wait-notice'

const FIELDS = ['name', 'email', 'phone', 'password'] as const
type FieldName = (typeof FIELDS)[number]

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register } = useCustomer()
  const form = useAuthForm('register', FIELDS)
  const [values, setValues] = useState<Record<FieldName, string>>({ name: '', email: '', phone: '', password: '' })

  function change(field: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    form.clear(field)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = collectErrors({
      name: checkName(values.name),
      email: checkEmail(values.email),
      phone: checkPhone(values.phone),
      password: checkNewPassword(values.password),
    })
    if (form.reject(invalid)) return
    await form.run(
      async () => {
        await register({
          name: values.name.trim().replace(/\s+/g, ' '),
          email: values.email.trim(),
          phone: cleanPhone(values.phone),
          password: values.password,
        })
        onSuccess()
      },
      (error) => (error.code === 'EMAIL_TAKEN' ? { email: error.message } : null),
    )
  }

  const shared = (field: FieldName) => ({
    name: field,
    value: values[field],
    error: form.errors[field] !== undefined,
    disabled: form.busy,
    onChange: (event: { target: { value: string } }) => change(field, event.target.value),
  })

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <FormField id={form.inputId('name')} label="Nama lengkap" error={form.errors.name}>
        {(control) => <Input {...control} {...shared('name')} autoComplete="name" placeholder="Nama lengkap kamu" />}
      </FormField>

      <FormField id={form.inputId('email')} label="Email" error={form.errors.email}>
        {(control) => (
          <Input
            {...control}
            {...shared('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
          />
        )}
      </FormField>

      <FormField
        id={form.inputId('phone')}
        label="Nomor WhatsApp"
        hint="Dipakai untuk kabar pesanan."
        error={form.errors.phone}
      >
        {(control) => (
          <Input {...control} {...shared('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" />
        )}
      </FormField>

      <FormField
        id={form.inputId('password')}
        label="Kata sandi"
        hint={passwordHint(values.password)}
        liveHint
        error={form.errors.password}
      >
        {(control) => (
          <PasswordInput {...control} {...shared('password')} autoComplete="new-password" />
        )}
      </FormField>

      <p className="text-[13px] leading-[19px] text-muted">
        Dengan mendaftar, kamu setuju nomor WhatsApp ini dipakai untuk kabar pesanan saja. SummaPass tidak pernah
        meminta nomor KTP.
      </p>

      <WaitNotice seconds={form.waitSeconds} />

      <Button
        type="submit"
        size="large"
        block
        disabled={form.busy || form.waitSeconds > 0}
        aria-busy={form.busy || undefined}
      >
        {form.busy ? 'Membuat akun...' : 'Daftar'}
      </Button>
    </form>
  )
}
