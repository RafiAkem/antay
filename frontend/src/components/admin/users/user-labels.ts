import type { ManagedUser } from '@/types/accounts'
import type { Role } from '@/types/api'
import { emailIssue, nameIssue, passwordIssue, type FieldErrors } from '../shared/validation'

// Batas nama akun mengikuti application/accounts/users.go (2 sampai 80).
const NAME_MIN = 2
const NAME_MAX = 80

export const ROLE_LABEL: Record<Role, string> = {
  staff: 'Petugas loket',
  organizer: 'Penyelenggara',
  admin: 'Admin mal',
}

export const ROLE_HINT: Record<Role, string> = {
  staff: 'Membuka loket penukaran dan papan antrean.',
  organizer: 'Menyusun event, kategori, harga, dan kursi miliknya sendiri.',
  admin: 'Akses penuh: dasbor, persetujuan event, dan semua akun.',
}

export type RoleFilter = Role | 'all'

export const ROLE_FILTERS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'staff', label: ROLE_LABEL.staff },
  { value: 'organizer', label: ROLE_LABEL.organizer },
  { value: 'admin', label: ROLE_LABEL.admin },
]

export const ROLE_OPTIONS = (['staff', 'organizer', 'admin'] as const).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}))

export type NewUserValues = {
  name: string
  email: string
  password: string
  role: Role
  organizerId: string
}

export const EMPTY_USER: NewUserValues = { name: '', email: '', password: '', role: 'staff', organizerId: '' }

export const USER_FIELDS = [
  { key: 'name', id: 'user-name' },
  { key: 'email', id: 'user-email' },
  { key: 'password', id: 'user-password' },
  { key: 'role', id: 'user-role' },
  { key: 'organizerId', id: 'user-organizer' },
]

export function validateNewUser(values: NewUserValues): FieldErrors {
  const errors: FieldErrors = {}
  const name = nameIssue(values.name, NAME_MIN, NAME_MAX)
  if (name) errors.name = name
  const email = emailIssue(values.email)
  if (email) errors.email = email
  const password = passwordIssue(values.password)
  if (password) errors.password = password
  if (values.role === 'organizer' && !values.organizerId) errors.organizerId = 'Pilih penyelenggara untuk akun ini.'
  return errors
}

export function matchesUser(row: ManagedUser, filter: RoleFilter, query: string): boolean {
  if (filter !== 'all' && row.role !== filter) return false
  if (!query) return true
  return row.name.toLowerCase().includes(query) || row.email.toLowerCase().includes(query)
}
