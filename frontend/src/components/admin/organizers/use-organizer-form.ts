import { useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/toast'
import { createOrganizer, updateOrganizer } from '@/lib/accounts-api'
import { ApiError } from '@/lib/api'
import type { Organizer, OrganizerDraft, OrganizerPatch } from '@/types/accounts'
import { focusFirstError, messageOf, serverFieldErrors, type FieldErrors } from '../shared/validation'
import { ORGANIZER_FIELDS, draftOf, trimDraft, validateOrganizer } from './organizer-labels'

type Callbacks = {
  onSaved: (saved: Organizer, created: boolean) => void
  // reload true berarti daftar perlu dimuat ulang walau tidak ada yang tersimpan.
  onClose: (reload: boolean) => void
}

// Satu form, dua mode: row null berarti tambah. Komponen modal di-mount ulang
// tiap kali dibuka (lihat key di OrganizerDialogs), jadi state awal cukup
// dihitung sekali dari row.
export function useOrganizerForm(row: Organizer | null, { onSaved, onClose }: Callbacks) {
  const toast = useToast()
  const [values, setValues] = useState<OrganizerDraft>(() => draftOf(row))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)

  function change(key: keyof OrganizerDraft, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function fail(next: FieldErrors, message: string) {
    setErrors(next)
    focusFirstError(next, ORGANIZER_FIELDS)
    toast.error(message)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const local = validateOrganizer(values)
    if (Object.keys(local).length > 0) {
      fail(local, 'Periksa isian yang ditandai merah.')
      return
    }

    const clean = trimDraft(values)
    // Saat mengubah, kirim hanya field yang berubah. PATCH kosong ditolak
    // server, jadi kalau tidak ada yang berubah cukup tutup modalnya.
    const before = draftOf(row)
    const patch: OrganizerPatch = {}
    if (row) {
      if (clean.name !== before.name) patch.name = clean.name
      if (clean.contactEmail !== before.contactEmail) patch.contactEmail = clean.contactEmail
      if (clean.contactPhone !== before.contactPhone) patch.contactPhone = clean.contactPhone
      if (Object.keys(patch).length === 0) {
        toast.show('Tidak ada yang berubah.', 'info')
        onClose(false)
        return
      }
    }

    setBusy(true)
    try {
      const saved = row ? await updateOrganizer(row.id, patch) : await createOrganizer(clean)
      onSaved(saved, !row)
    } catch (cause) {
      const fields = serverFieldErrors(cause)
      if (Object.keys(fields).length > 0) {
        fail(fields, 'Server menolak beberapa isian. Periksa yang ditandai merah.')
      } else if (cause instanceof ApiError && cause.status === 404) {
        toast.error('Penyelenggara ini sudah tidak ada. Daftar dimuat ulang.')
        onClose(true)
      } else {
        toast.error(messageOf(cause, 'Penyelenggara gagal disimpan. Coba lagi.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return { values, errors, busy, change, submit }
}
