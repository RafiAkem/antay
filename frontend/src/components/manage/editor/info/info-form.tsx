import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { createManagedEvent, updateManagedEvent } from '@/lib/manage-api'
import type { ManagedEvent } from '@/types/manage'
import { errorMessage, priceFrom } from '../../shared/manage-labels'
import type { FieldBind } from './info-field'
import { BasicsCard, ScheduleCard } from './info-sections'
import { EMPTY_VALUES, FIELD_LABEL, FIELD_ORDER, SERVER_FIELD, fromEvent, toPayload, validateInfo, type InfoKey, type InfoValues } from './info-values'
import { SaleFeeCard } from './sale-fee-card'

type InfoFormProps = {
  event: ManagedEvent | null
  isAdmin: boolean
  editable: boolean
  onSaved: (event: ManagedEvent, created: boolean) => void
  onDirtyChange: (dirty: boolean) => void
}

type Errors = Partial<Record<InfoKey, string>>

const EXAMPLE_PRICE = 250_000

function focusFirst(errors: Errors) {
  const first = FIELD_ORDER.find((key) => errors[key])
  if (first) document.getElementById(first)?.focus()
}

export function InfoForm({ event, isAdmin, editable, onSaved, onDirtyChange }: InfoFormProps) {
  const toast = useToast()
  const initial = useMemo(() => (event ? fromEvent(event) : EMPTY_VALUES), [event])
  const [values, setValues] = useState<InfoValues>(initial)
  const [base, setBase] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  // Setelah simpan (atau dimuat ulang), event dari server jadi patokan baru dan form ikut
  // disegarkan. Disesuaikan saat render, bukan di effect, supaya tidak ada render basi.
  if (base !== initial) {
    setBase(initial)
    setValues(initial)
  }

  const dirty = useMemo(() => FIELD_ORDER.some((key) => values[key] !== initial[key]), [values, initial])
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  function set(key: InfoKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    // Tanda merah hilang begitu field itu diubah, tidak menunggu simpan berikutnya.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const bind = (key: InfoKey): FieldBind => ({
    id: key,
    value: values[key],
    error: errors[key],
    onChange: (change) => set(key, change.target.value),
  })

  function applyServerError(cause: ApiError): boolean {
    const mapped: Errors = {}
    for (const [field, issue] of Object.entries(cause.field)) {
      const key = SERVER_FIELD[field] ?? (field in values ? (field as InfoKey) : null)
      if (key) mapped[key] = issue
    }
    if (cause.code === 'INVALID_SCHEDULE') mapped.closeTime = cause.message
    // 409 tanpa details = kode event dari nama ini sudah dipakai di tanggal yang sama
    if (cause.status === 409 && Object.keys(mapped).length === 0) mapped.name = cause.message
    const first = FIELD_ORDER.find((key) => mapped[key])
    if (!first) return false
    setErrors(mapped)
    focusFirst(mapped)
    const issue = mapped[first] ?? cause.message
    // Kalimat utuh dari server ditampilkan apa adanya; potongan seperti "wajib diisi" diberi nama field.
    toast.error(/^[A-Z]/.test(issue) ? issue : `${FIELD_LABEL[first]}: ${issue}`)
    return true
  }

  async function handleSubmit(submit: FormEvent<HTMLFormElement>) {
    submit.preventDefault()
    const local = validateInfo(values)
    setErrors(local)
    const first = FIELD_ORDER.find((key) => local[key])
    if (first) {
      focusFirst(local)
      toast.error(local[first] ?? 'Periksa isian yang ditandai merah.')
      return
    }

    setBusy(true)
    try {
      // organizerId hanya dikirim admin saat membuat; pemilik event tidak dipindah lewat form ini.
      const payload = toPayload(values, isAdmin && !event)
      if (event) {
        const saved = await updateManagedEvent(event.id, payload)
        toast.show('Info event disimpan.', 'ok')
        onSaved(saved, false)
      } else {
        const created = await createManagedEvent(payload)
        toast.show(`Draf ${created.name} tersimpan. Lanjut atur kategori dan paket di tab Tiket.`, 'ok')
        onSaved(created, true)
      }
    } catch (cause) {
      if (!(cause instanceof ApiError && applyServerError(cause))) {
        toast.error(errorMessage(cause, 'Info event gagal disimpan. Coba lagi.'))
      }
    } finally {
      setBusy(false)
    }
  }

  const shared = { values, errors, bind, set, disabled: !editable || busy }
  const lowest = event ? priceFrom(event) : null

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <BasicsCard {...shared} showOrganizer={isAdmin && !event} />
      <ScheduleCard {...shared} />
      <SaleFeeCard {...shared} examplePrice={lowest ?? EXAMPLE_PRICE} />
      {editable ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {dirty ? <span className="text-[13px] text-muted">Ada perubahan yang belum disimpan.</span> : null}
          {event && dirty ? (
            <Button variant="ghost" onClick={() => setValues(initial)} disabled={busy}>
              Batalkan perubahan
            </Button>
          ) : null}
          <Button type="submit" disabled={busy || (Boolean(event) && !dirty)}>
            {busy ? 'Menyimpan...' : event ? 'Simpan info' : 'Simpan draf'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}
