// Panggilan kelola event untuk penyelenggara dan admin. Semua JSON lewat callApi;
// cuma unggah gambar yang lewat XHR karena butuh multipart dan progres unggah.
import { ApiError, callApi } from './api'
import type {
  CategoryPayload,
  EventImage,
  EventPayload,
  EventStatus,
  ManagedCategory,
  ManagedEvent,
  ManagedEventSummary,
  ManagedPackage,
  PackagePayload,
} from '@/types/manage'

const BASE = '/operational/v1/manage'
const id = encodeURIComponent

// --- Event ---

export async function fetchManagedEvents(status?: EventStatus, signal?: AbortSignal): Promise<ManagedEventSummary[]> {
  const query = status ? `?status=${status}` : ''
  const data = await callApi<{ events: ManagedEventSummary[] }>(`${BASE}/events${query}`, { signal })
  return data.events
}

export async function fetchManagedEvent(eventId: string, signal?: AbortSignal): Promise<ManagedEvent> {
  const data = await callApi<{ event: ManagedEvent }>(`${BASE}/events/${id(eventId)}`, { signal })
  return data.event
}

export async function createManagedEvent(payload: EventPayload): Promise<ManagedEvent> {
  const data = await callApi<{ event: ManagedEvent }>(`${BASE}/events`, { method: 'POST', body: payload })
  return data.event
}

export async function updateManagedEvent(eventId: string, payload: Partial<EventPayload>): Promise<ManagedEvent> {
  const data = await callApi<{ event: ManagedEvent }>(`${BASE}/events/${id(eventId)}`, {
    method: 'PATCH',
    body: payload,
  })
  return data.event
}

export async function deleteManagedEvent(eventId: string): Promise<void> {
  await callApi<void>(`${BASE}/events/${id(eventId)}`, { method: 'DELETE' })
}

// Perpindahan status. Responsnya tidak dipakai: halaman selalu memuat ulang event
// supaya status, alasan tolak, dan waktu pengajuan datang dari satu sumber.
export type Transition = 'submissions' | 'approvals' | 'rejections' | 'cancellations' | 'closures'

export async function transitionEvent(eventId: string, transition: Transition, reason?: string): Promise<void> {
  await callApi<unknown>(`${BASE}/events/${id(eventId)}/${transition}`, {
    method: 'POST',
    body: reason === undefined ? undefined : { reason },
  })
}

// --- Kategori dan paket ---

export async function fetchCategories(eventId: string, signal?: AbortSignal): Promise<ManagedCategory[]> {
  const data = await callApi<{ categories: ManagedCategory[] }>(`${BASE}/events/${id(eventId)}/categories`, { signal })
  return data.categories
}

export async function createCategory(eventId: string, payload: CategoryPayload): Promise<ManagedCategory> {
  const data = await callApi<{ category: ManagedCategory }>(`${BASE}/events/${id(eventId)}/categories`, {
    method: 'POST',
    body: payload,
  })
  return data.category
}

export async function updateCategory(categoryId: string, payload: Partial<CategoryPayload>): Promise<void> {
  await callApi<unknown>(`${BASE}/categories/${id(categoryId)}`, { method: 'PATCH', body: payload })
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await callApi<void>(`${BASE}/categories/${id(categoryId)}`, { method: 'DELETE' })
}

export async function createPackage(categoryId: string, payload: PackagePayload): Promise<ManagedPackage> {
  const data = await callApi<{ package: ManagedPackage }>(`${BASE}/categories/${id(categoryId)}/packages`, {
    method: 'POST',
    body: payload,
  })
  return data.package
}

export async function updatePackage(packageId: string, payload: Partial<PackagePayload>): Promise<void> {
  await callApi<unknown>(`${BASE}/packages/${id(packageId)}`, { method: 'PATCH', body: payload })
}

export async function deletePackage(packageId: string): Promise<void> {
  await callApi<void>(`${BASE}/packages/${id(packageId)}`, { method: 'DELETE' })
}

// --- Gambar ---

export async function fetchEventImages(eventId: string, signal?: AbortSignal): Promise<EventImage[]> {
  const data = await callApi<{ images: EventImage[] }>(`${BASE}/events/${id(eventId)}/images`, { signal })
  return data.images
}

export async function updateImageAlt(imageId: string, alt: string): Promise<void> {
  await callApi<unknown>(`${BASE}/images/${id(imageId)}`, { method: 'PATCH', body: { alt } })
}

export async function reorderImages(eventId: string, imageIds: string[]): Promise<void> {
  await callApi<unknown>(`${BASE}/events/${id(eventId)}/images/order`, { method: 'PUT', body: { imageIds } })
}

export async function deleteImage(imageId: string): Promise<void> {
  await callApi<void>(`${BASE}/images/${id(imageId)}`, { method: 'DELETE' })
}

type UploadOptions = { alt?: string; onProgress?: (percent: number) => void; signal?: AbortSignal }

export function uploadPoster(eventId: string, file: File, options: UploadOptions = {}): Promise<void> {
  return upload(`${BASE}/events/${id(eventId)}/poster`, file, options)
}

export function uploadGalleryImage(eventId: string, file: File, options: UploadOptions = {}): Promise<void> {
  return upload(`${BASE}/events/${id(eventId)}/images`, file, options)
}

const CSRF_COOKIE = 'antay_csrf'

function readCsrf(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// callApi selalu meng-encode JSON, jadi multipart ditulis sendiri. Token CSRF
// diambil dari cookie yang sama; kalau belum ada, minta dulu lewat GET /csrf.
async function csrfToken(): Promise<string | null> {
  const existing = readCsrf()
  if (existing) return existing
  await fetch('/csrf', { credentials: 'same-origin' }).catch(() => undefined)
  return readCsrf()
}

type ErrorBody = { error?: { message?: string; code?: string; traceId?: string; details?: Array<{ field: string; issue: string }> } }

function toUploadError(xhr: XMLHttpRequest): ApiError {
  let body: ErrorBody | null = null
  try {
    body = xhr.responseText ? (JSON.parse(xhr.responseText) as ErrorBody) : null
  } catch {
    body = null
  }
  const field: Record<string, string> = {}
  for (const detail of body?.error?.details ?? []) {
    if (!(detail.field in field)) field[detail.field] = detail.issue
  }
  const message = body?.error?.message || `Unggahan gagal (HTTP ${xhr.status}).`
  return new ApiError(message, xhr.status, body?.error?.code ?? null, body?.error?.traceId ?? null, field)
}

// XHR, bukan fetch, karena fetch belum bisa melaporkan progres unggah di semua browser.
async function upload(path: string, file: File, options: UploadOptions): Promise<void> {
  const token = await csrfToken()
  const form = new FormData()
  form.append('file', file)
  if (options.alt) form.append('alt', options.alt)

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', path)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('X-Request-ID', crypto.randomUUID())
    if (token) xhr.setRequestHeader('X-CSRF-TOKEN', token)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(toUploadError(xhr)))
    xhr.onerror = () => reject(new ApiError('Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.', 0))
    xhr.onabort = () => reject(new DOMException('Unggahan dibatalkan', 'AbortError'))
    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(form)
  })
}
