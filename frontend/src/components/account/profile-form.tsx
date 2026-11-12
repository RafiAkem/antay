import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useCustomer } from '@/lib/customer-session'
import type { Customer } from '@/types/catalog'
import { updateProfile, type ProfilePatch } from './account-api'
import { checkName, checkPhone, cleanPhone, collectErrors } from './auth-rules'
import { FormField } from './form-field'
import { useAuthForm } from './use-auth-form'
import { WaitNotice } from './wait-notice'

const FIELDS = ['name', 'phone'] as const

type Props = {
  customer: Customer
  onDone: () => void
}

export function ProfileForm({ customer, onDone }: Props) {
  const { refresh } = useCustomer()
  const toast = useToast()
  const form = useAuthForm('profile', FIELDS)
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.reject(collectErrors({ name: checkName(name), phone: checkPhone(phone) }))) return

    // Hanya kirim yang berubah, supaya PATCH tidak menimpa isian yang tidak disentuh.
    const patch: ProfilePatch = {}
    const nextName = name.trim().replace(/\s+/g, ' ')
    const nextPhone = cleanPhone(phone)
    if (nextName !== customer.name) patch.name = nextName
    if (nextPhone !== customer.phone) patch.phone = nextPhone
    if (!patch.name && !patch.phone) {
      onDone()
      return
    }

    await form.run(async () => {
      await updateProfile(patch)
      await refresh()
      toast.show('Profil disimpan.', 'ok')
      onDone()
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <FormField id={form.inputId('name')} label="Nama lengkap" error={form.errors.name}>
        {(control) => (
          <Input
            {...control}
            autoFocus
            name="name"
            autoComplete="name"
            value={name}
            error={form.errors.name !== undefined}
            disabled={form.busy}
            onChange={(event) => {
              setName(event.target.value)
              form.clear('name')
            }}
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
          <Input
            {...control}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            error={form.errors.phone !== undefined}
            disabled={form.busy}
            onChange={(event) => {
              setPhone(event.target.value)
              form.clear('phone')
            }}
          />
        )}
      </FormField>

      <WaitNotice seconds={form.waitSeconds} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onDone} disabled={form.busy}>
          Batal
        </Button>
        <Button type="submit" disabled={form.busy || form.waitSeconds > 0} aria-busy={form.busy || undefined}>
          {form.busy ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
