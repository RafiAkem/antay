import { callApi } from '@/lib/api'

export type ProfilePatch = {
  name?: string
  phone?: string
}

// Bentuk respons PATCH belum dipastikan, jadi isinya tidak dibaca di sini.
// Pemanggil menyegarkan sesi lewat refresh() supaya data yang tampil selalu
// datang dari GET /me yang sudah pasti bentuknya.
export async function updateProfile(patch: ProfilePatch): Promise<void> {
  await callApi<unknown>('/customer/v1/me', { method: 'PATCH', body: patch })
}
