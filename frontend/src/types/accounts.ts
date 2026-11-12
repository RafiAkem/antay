// Panel admin: penyelenggara dan akun internal. Bentuknya mengikuti
// dto/accounts.go di backend 1:1. Akun pembeli tidak lewat sini.
import type { Role } from './api'

export type Organizer = {
  id: string
  name: string
  contactEmail: string
  // Server menyimpan nomor dalam bentuk 62xxxxxxxx, atau '' bila tidak diisi.
  contactPhone: string
  isActive: boolean
}

export type OrganizerDraft = {
  name: string
  contactEmail: string
  contactPhone: string
}

// Field yang tidak dikirim berarti tidak diubah. contactPhone '' berarti dikosongkan.
export type OrganizerPatch = Partial<OrganizerDraft> & { isActive?: boolean }

export type ManagedUser = {
  id: string
  email: string
  name: string
  role: Role
  organizerId: string | null
  isActive: boolean
}

export type NewUserPayload = {
  email: string
  password: string
  name: string
  role: Role
  // Wajib hanya untuk role organizer; untuk role lain jangan dikirim.
  organizerId?: string
}

// Role sengaja tidak bisa diganti lewat PATCH. Pindah role berarti buat akun baru.
export type UserPatch = {
  name?: string
  isActive?: boolean
  password?: string
}
