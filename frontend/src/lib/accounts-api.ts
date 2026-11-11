// Panel admin mal: penyelenggara dan akun internal. Semua lewat callApi
// supaya CSRF, amplop respons, dan pesan galat diurus di satu tempat.
import { callApi } from './api'
import type {
  ManagedUser,
  NewUserPayload,
  Organizer,
  OrganizerDraft,
  OrganizerPatch,
  UserPatch,
} from '@/types/accounts'

const ORGANIZERS = '/operational/v1/organizers'
const USERS = '/operational/v1/users'

export async function fetchOrganizers(signal?: AbortSignal): Promise<Organizer[]> {
  const data = await callApi<{ organizers: Organizer[] }>(ORGANIZERS, { signal })
  return data.organizers
}

export async function createOrganizer(payload: OrganizerDraft): Promise<Organizer> {
  const data = await callApi<{ organizer: Organizer }>(ORGANIZERS, { method: 'POST', body: payload })
  return data.organizer
}

export async function updateOrganizer(organizerId: string, patch: OrganizerPatch): Promise<Organizer> {
  const data = await callApi<{ organizer: Organizer }>(`${ORGANIZERS}/${encodeURIComponent(organizerId)}`, {
    method: 'PATCH',
    body: patch,
  })
  return data.organizer
}

export async function fetchUsers(signal?: AbortSignal): Promise<ManagedUser[]> {
  const data = await callApi<{ users: ManagedUser[] }>(USERS, { signal })
  return data.users
}

export async function createUser(payload: NewUserPayload): Promise<ManagedUser> {
  const data = await callApi<{ user: ManagedUser }>(USERS, { method: 'POST', body: payload })
  return data.user
}

export async function updateUser(userId: string, patch: UserPatch): Promise<ManagedUser> {
  const data = await callApi<{ user: ManagedUser }>(`${USERS}/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: patch,
  })
  return data.user
}
