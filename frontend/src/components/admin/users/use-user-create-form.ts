import { useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/toast'
import { createUser } from '@/lib/accounts-api'
import { ApiError } from '@/lib/api'
import type { ManagedUser, NewUserPayload } from '@/types/accounts'
import type { Role } from '@/types/api'
import { focusFirstError, messageOf, serverFieldErrors, type FieldErrors } from '../shared/validation'
import { EMPTY_USER, USER_FIELDS, validateNewUser, type NewUserValues } from './user-labels'

type Callbacks = {
  onCreated: (user: ManagedUser) => void
  // Penyelenggara yang dipilih ternyata nonaktif atau hilang: muat ulang pilihannya.
  onOrganizersStale: () => void
}

export function useUserCreateForm({ onCreated, onOrganizersStale }: Callbacks) {
  const toast = useToast()
  const [values, setValues] = useState<NewUserValues>(EMPTY_USER)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function change(key: 'name' | 'email' | 'password' | 'organizerId', value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    clearError(key)
  }

  // Ganti role mengosongkan pilihan penyelenggara, karena server menolak
  // organizerId untuk role selain organizer.
  function changeRole(role: Role) {
    setValues((prev) => ({ ...prev, role, organizerId: role === 'organizer' ? prev.organizerId : '' }))
    clearError('role')
    clearError('organizerId')
  }

  function fail(next: FieldErrors, message: string) {
    setErrors(next)
    focusFirstError(next, USER_FIELDS)
    toast.error(message)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const local = validateNewUser(values)
    if (Object.keys(local).length > 0) {
      fail(local, 'Periksa isian yang ditandai merah.')
      return
    }

    const payload: NewUserPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      role: values.role,
      ...(values.role === 'organizer' ? { organizerId: values.organizerId } : {}),
    }

    setBusy(true)
    try {
      onCreated(await createUser(payload))
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'EMAIL_TAKEN') {
        fail({ email: cause.message }, cause.message)
      } else if (cause instanceof ApiError && cause.code === 'ORGANIZER_INVALID') {
        setValues((prev) => ({ ...prev, organizerId: '' }))
        fail({ organizerId: cause.message }, cause.message)
        onOrganizersStale()
      } else {
        const fields = serverFieldErrors(cause)
        if (Object.keys(fields).length > 0) fail(fields, 'Server menolak beberapa isian. Periksa yang ditandai merah.')
        else toast.error(messageOf(cause, 'Akun gagal dibuat. Coba lagi.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return { values, errors, busy, change, changeRole, submit }
}
