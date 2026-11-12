import { useEffect, useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { errorMessage } from '../../shared/manage-labels'
import { sameValues } from './ticket-values'

type Errors<T> = Partial<Record<keyof T, string>>

type InlineFormOptions<T extends Record<string, unknown>> = {
  initial: T
  // id unik per form supaya fokus ke field salah tidak nyasar ke form lain
  prefix: string
  order: Array<keyof T & string>
  validate: (values: T) => Errors<T>
  // nama field untuk toast, karena isu dari server berupa potongan seperti "wajib diisi"
  labels: Record<keyof T, string>
  onSave: (values: T) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  failMessage: string
}

// Pola form kecil di tab Tiket: validasi lokal, tanda merah + satu toast,
// galat field dari server dipetakan balik, dan laporan dirty ke editor.
export function useInlineForm<T extends Record<string, unknown>>(options: InlineFormOptions<T>) {
  const { initial, prefix, order, validate, labels, onSave, onDirtyChange, failMessage } = options
  const toast = useToast()
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Errors<T>>({})
  const [busy, setBusy] = useState(false)

  const dirty = !sameValues(values, initial)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  // Form ditutup = tidak ada lagi isian yang menggantung.
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  function set<K extends keyof T>(key: K, value: T[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  function fail(found: Errors<T>, message?: string) {
    setErrors(found)
    const first = order.find((key) => found[key])
    if (first) document.getElementById(`${prefix}-${first}`)?.focus()
    toast.error(message ?? (first ? found[first] : undefined) ?? failMessage)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const local = validate(values)
    if (order.some((key) => local[key])) {
      fail(local)
      return
    }
    setBusy(true)
    try {
      await onSave(values)
    } catch (cause) {
      const mapped: Errors<T> = {}
      if (cause instanceof ApiError) {
        for (const [field, issue] of Object.entries(cause.field)) {
          if ((order as string[]).includes(field)) mapped[field as keyof T] = issue
        }
        // CATEGORY_NAME_TAKEN dan PACKAGE_NAME_TAKEN datang tanpa details
        if (cause.code?.endsWith('_NAME_TAKEN') && 'name' in values) mapped['name' as keyof T] = cause.message
      }
      const first = order.find((key) => mapped[key])
      if (first) {
        const issue = mapped[first] ?? ''
        fail(mapped, /^[A-Z]/.test(issue) ? issue : `${labels[first]}: ${issue}`)
      } else {
        toast.error(errorMessage(cause, failMessage))
      }
      setBusy(false)
    }
  }

  const fieldId = (key: keyof T & string) => `${prefix}-${key}`

  return { values, errors, busy, set, submit, fieldId }
}
