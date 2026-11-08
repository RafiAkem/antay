import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react'
import { ApiError, createEvent } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import {
  INITIAL_VALUES,
  slotCount,
  toEventPayload,
  validateEvent,
  type EventFormValues,
} from '@/components/dashboard/event-form-schedule'
import type { EventDetail } from '@/types/api'

type FormFieldProps = {
  id: keyof EventFormValues
  label: string
  value: string
  error?: string
  className?: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>

function FormField({ id, label, value, error, className, onChange, ...input }: FormFieldProps) {
  return (
    <Field label={label} error={Boolean(error)} className={className}>
      <Input id={id} value={value} onChange={onChange} error={Boolean(error)} {...input} />
    </Field>
  )
}

export function CreateEventForm({ onCreated }: { onCreated: (event: EventDetail) => Promise<void> }) {
  const toast = useToast()
  const [values, setValues] = useState<EventFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const update = (key: keyof EventFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }))
    setPreviewError(null)
  }

  const field = (key: keyof EventFormValues) => ({
    id: key,
    value: values[key],
    error: errors[key],
    onChange: update(key),
  })

  const slots = slotCount(values.openTime, values.closeTime, Number(values.slotMinutes))
  const capacity = Number(values.slotCapacity)
  const scheduleOk = slots > 0 && capacity > 0
  const preview = scheduleOk
    ? `${slots} slot x ${capacity} orang = ${slots * capacity} kuota, ${values.openTime}-${values.closeTime}`
    : 'Jam tutup harus lebih lambat dari jam buka, minimal satu slot.'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPreviewError(null)
    const localErrors = validateEvent(values)
    setErrors(localErrors)
    const firstInvalid = Object.keys(localErrors)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setBusy(true)
    try {
      const created = await createEvent(toEventPayload(values))
      toast.show(`Event ${created.name} dibuat.`, 'ok')
      setValues((current) => ({ ...current, name: '', place: '' }))
      setErrors({})
      await onCreated(created)
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.code === 'INVALID_SCHEDULE') {
          setPreviewError(cause.message)
        } else if (cause.status === 409) {
          toast.error('Kode event untuk tanggal ini sudah dipakai.')
        } else if (Object.keys(cause.field).length > 0) {
          setErrors(cause.field)
          document.getElementById(Object.keys(cause.field)[0])?.focus()
        } else {
          toast.error(cause.message)
        }
      } else {
        toast.error('Event gagal dibuat. Coba lagi.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHead title="Buat event baru" />
      <p className="mb-4 text-[13px] leading-[19px] text-muted">
        Untuk penyelenggara yang menyewa tempat di mal ini.
      </p>
      <form noValidate onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormField
          {...field('name')}
          label="Nama event"
          className="sm:col-span-2"
          maxLength={70}
          placeholder="contoh: Penukaran Tiket Konser"
        />
        <FormField
          {...field('place')}
          label="Lokasi loket"
          maxLength={50}
          placeholder="contoh: Exhibition Hall"
        />
        <FormField
          {...field('item')}
          label="Item yang ditukar"
          maxLength={50}
          placeholder="contoh: Gelang masuk"
        />
        <FormField {...field('openTime')} label="Jam buka" maxLength={5} placeholder="10:00" inputMode="numeric" />
        <FormField {...field('closeTime')} label="Jam tutup" maxLength={5} placeholder="18:00" inputMode="numeric" />
        <FormField {...field('slotMinutes')} label="Durasi slot (menit)" type="number" min={10} max={120} step={5} />
        <FormField {...field('slotCapacity')} label="Kuota per slot" type="number" min={1} max={500} />
        <FormField {...field('counterCount')} label="Jumlah loket" type="number" min={1} max={20} />
        <FormField {...field('serviceSeconds')} label="Detik per orang" type="number" min={30} max={600} step={5} />
        <FormField
          {...field('requirement')}
          label="Syarat penukaran"
          className="sm:col-span-2"
          maxLength={80}
          placeholder="contoh: E-ticket + KTP sesuai nama"
        />
        <p
          role={previewError ? 'status' : undefined}
          className={`num rounded-[var(--radius-control)] border p-3 text-[13px] leading-[19px] sm:col-span-2 ${
            scheduleOk && !previewError
              ? 'border-tint-200 bg-tint-50 text-accent-ink'
              : 'border-warning-border bg-warning-bg text-warning-ink'
          }`}
        >
          {previewError ?? preview}
        </p>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Menyimpan...' : 'Buat event'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
