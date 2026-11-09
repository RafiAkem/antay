import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input } from '@/components/ui/field'

type Props = {
  name: string
  ktp: boolean
  slotLabel: string | null
  submitting: boolean
  nameInvalid: boolean
  error: string | null
  onNameChange: (value: string) => void
  onKtpChange: (checked: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function BookingForm({
  name,
  ktp,
  slotLabel,
  submitting,
  nameInvalid,
  error,
  onNameChange,
  onKtpChange,
  onSubmit,
}: Props) {
  return (
    <form noValidate className="grid gap-4" onSubmit={onSubmit}>
      <Field label="Nama sesuai KTP" hint="3 sampai 60 karakter." error={nameInvalid}>
        <Input
          value={name}
          maxLength={60}
          autoComplete="off"
          placeholder="contoh: Rizky Pratama"
          error={nameInvalid}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>
      <Checkbox checked={ktp} onChange={onKtpChange}>
        Saya membawa KTP asli saat menukar. Nomor KTP tidak diminta dan tidak disimpan.
      </Checkbox>
      {error ? (
        <p role="alert" className="text-[13px] leading-[19px] text-negative">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!slotLabel || submitting} className="w-full">
        {submitting ? 'Memesan...' : slotLabel ? `Pesan ${slotLabel}` : 'Pilih jam dulu'}
      </Button>
    </form>
  )
}
