import type { Organizer, OrganizerDraft } from '@/types/accounts'
import { emailIssue, nameIssue, phoneIssue, type FieldErrors } from '../shared/validation'

// Batas nama mengikuti CHECK di tabel organizers (2 sampai 100 huruf).
const NAME_MIN = 2
const NAME_MAX = 100

export const ORGANIZER_FIELDS = [
  { key: 'name', id: 'organizer-name' },
  { key: 'contactEmail', id: 'organizer-email' },
  { key: 'contactPhone', id: 'organizer-phone' },
] as const

export const EMPTY_ORGANIZER: OrganizerDraft = { name: '', contactEmail: '', contactPhone: '' }

export function draftOf(row: Organizer | null): OrganizerDraft {
  if (!row) return EMPTY_ORGANIZER
  return { name: row.name, contactEmail: row.contactEmail, contactPhone: phoneLabel(row.contactPhone) }
}

export function validateOrganizer(values: OrganizerDraft): FieldErrors {
  const errors: FieldErrors = {}
  const name = nameIssue(values.name, NAME_MIN, NAME_MAX)
  if (name) errors.name = name
  const email = emailIssue(values.contactEmail)
  if (email) errors.contactEmail = email
  const phone = phoneIssue(values.contactPhone)
  if (phone) errors.contactPhone = phone
  return errors
}

export function trimDraft(values: OrganizerDraft): OrganizerDraft {
  return {
    name: values.name.trim(),
    contactEmail: values.contactEmail.trim(),
    contactPhone: values.contactPhone.trim(),
  }
}

// Server menyimpan 6281234567890. Admin mal lebih terbiasa membaca 0812 3456 7890.
export function phoneLabel(stored: string): string {
  if (!stored) return ''
  const local = stored.startsWith('62') ? `0${stored.slice(2)}` : stored
  return local.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function matchesOrganizer(row: Organizer, query: string): boolean {
  if (!query) return true
  const digits = query.replace(/\D/g, '')
  return (
    row.name.toLowerCase().includes(query) ||
    row.contactEmail.toLowerCase().includes(query) ||
    (digits.length >= 3 && phoneLabel(row.contactPhone).replace(/\D/g, '').includes(digits))
  )
}
