// Satu-satunya tempat yang memanggil fetch. Halaman tidak boleh fetch sendiri.
import { listTicketsByCode, rememberTicket } from './visitor-storage'

const CSRF_COOKIE = 'antay_csrf'
const CSRF_HEADER = 'X-CSRF-TOKEN'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export class ApiError extends Error {
  status: number
  code: string | null
  traceId: string | null
  field: Record<string, string>
  retryAfter: number | null

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    traceId: string | null = null,
    field: Record<string, string> = {},
    retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.traceId = traceId
    this.field = field
    this.retryAfter = retryAfter
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

type Envelope<T> = {
  message: string
  data: T
  meta: { timestamp: string; version: string }
}

type ErrorEnvelope = {
  error: {
    message?: string
    code?: string
    traceId?: string
    details?: Array<{ field: string; issue: string }>
  }
}

let csrfPromise: Promise<void> | null = null

function readCsrf(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

async function ensureCsrf(): Promise<string | null> {
  const existing = readCsrf()
  if (existing) return existing
  csrfPromise ??= fetch('/csrf', { credentials: 'same-origin' })
    .then(() => undefined, () => undefined)
    .finally(() => {
      csrfPromise = null
    })
  await csrfPromise
  return readCsrf()
}

const STATUS_FALLBACK: Record<number, string> = {
  0: 'Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.',
  401: 'Sesi sudah berakhir. Masuk lagi.',
  403: 'Akun ini tidak punya akses ke tindakan tersebut.',
  404: 'Data yang dicari tidak ada.',
  409: 'Data sudah berubah. Muat ulang halaman.',
  429: 'Terlalu banyak permintaan. Tunggu sebentar.',
  500: 'Terjadi kesalahan di server. Coba lagi sebentar lagi.',
  503: 'Layanan sedang tidak siap. Coba lagi sebentar lagi.',
}

async function toError(res: Response | null, fallback?: string): Promise<ApiError> {
  if (!res) return new ApiError(fallback ?? STATUS_FALLBACK[0], 0)
  let body: ErrorEnvelope | null = null
  try {
    const text = await res.text()
    body = text ? (JSON.parse(text) as ErrorEnvelope) : null
  } catch {
    body = null
  }
  const field: Record<string, string> = {}
  for (const detail of body?.error.details ?? []) {
    if (!(detail.field in field)) field[detail.field] = detail.issue
  }
  const retryHeader = Number(res.headers.get('Retry-After'))
  return new ApiError(
    body?.error.message || fallback || STATUS_FALLBACK[res.status] || `Permintaan gagal (HTTP ${res.status}).`,
    res.status,
    body?.error.code ?? null,
    body?.error.traceId ?? res.headers.get('X-Request-ID'),
    field,
    Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null,
  )
}

async function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  headers['X-Request-ID'] = crypto.randomUUID()
  if (!SAFE_METHODS.has(method)) {
    const token = await ensureCsrf()
    if (token) headers[CSRF_HEADER] = token
  }
  return fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })
}

export async function callApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await send(path, options)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(STATUS_FALLBACK[0], 0)
  }
  if (res.status === 204) return undefined as T
  if (!res.ok) throw await toError(res)
  const text = await res.text()
  const envelope = text ? (JSON.parse(text) as Envelope<T>) : null
  return envelope?.data as T
}

// --- Auth ---

import type { User } from '@/types/api'

export async function fetchSession(): Promise<User | null> {
  try {
    const data = await callApi<{ user: User }>('/operational/v1/auth/me')
    return data.user
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 401) return null
    throw cause
  }
}

export async function login(email: string, password: string): Promise<User> {
  const data = await callApi<{ user: User }>('/operational/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  return data.user
}

export async function logout(): Promise<void> {
  await callApi<void>('/operational/v1/auth/logout', { method: 'POST' })
}

// --- Public ---

import type {
  BoardData,
  CreateEventPayload,
  CreateTicketPayload,
  EventDetail,
  OverviewEvent,
  AnalyticsSummary,
  Queue,
  Ticket,
  TicketCheck,
} from '@/types/api'

export async function fetchOpenEvents(): Promise<EventDetail[]> {
  const data = await callApi<{ events: EventDetail[] }>('/public/v1/events')
  return data.events
}

export async function fetchOpenEvent(eventId: string): Promise<EventDetail> {
  const data = await callApi<{ event: EventDetail }>(`/public/v1/events/${eventId}`)
  return data.event
}

export async function fetchBoard(eventId: string): Promise<BoardData> {
  return callApi<BoardData>(`/public/v1/events/${eventId}/board`)
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const data = await callApi<{ ticket: Ticket }>('/public/v1/tickets', { method: 'POST', body: payload })
  rememberTicket(data.ticket.code, data.ticket.event.id)
  return data.ticket
}

export async function fetchTicket(code: string): Promise<Ticket> {
  const data = await callApi<{ ticket: Ticket }>(`/public/v1/tickets/${encodeURIComponent(code)}`)
  return data.ticket
}

export async function cancelTicket(code: string): Promise<Ticket> {
  const data = await callApi<{ ticket: Ticket }>(
    `/public/v1/tickets/${encodeURIComponent(code)}/cancellations`,
    { method: 'POST' },
  )
  return data.ticket
}

// Tiket pengunjung disimpan lokal karena pengunjung tidak punya akun. Detailnya
// tetap diambil dari server supaya status penukaran selalu yang terbaru.
export async function fetchMyTickets(): Promise<Ticket[]> {
  const saved = listTicketsByCode()
  if (saved.length === 0) return []
  const results = await Promise.allSettled(saved.map((entry) => fetchTicket(entry.code)))
  return results
    .filter((result): result is PromiseFulfilledResult<Ticket> => result.status === 'fulfilled')
    .map((result) => result.value)
}

// --- Operational ---

export async function fetchStaffEvents(): Promise<EventDetail[]> {
  const data = await callApi<{ events: EventDetail[] }>('/operational/v1/events')
  return data.events
}

export async function fetchWaiting(eventId: string, slots?: string[]): Promise<{ tickets: Ticket[]; slots: string[] }> {
  const query = slots && slots.length > 0 ? `?slot=${slots.map(encodeURIComponent).join(',')}` : ''
  return callApi<{ tickets: Ticket[]; slots: string[] }>(
    `/operational/v1/events/${eventId}/waiting${query}`,
  )
}

export async function lookupTicket(code: string, eventId?: string): Promise<{ ticket: Ticket; check: TicketCheck }> {
  const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''
  return callApi<{ ticket: Ticket; check: TicketCheck }>(
    `/operational/v1/tickets/${encodeURIComponent(code)}${query}`,
  )
}

export async function redeemTicket(code: string, payload: RedeemPayloadShape): Promise<Ticket> {
  const data = await callApi<{ ticket: Ticket }>(
    `/operational/v1/tickets/${encodeURIComponent(code)}/redemptions`,
    { method: 'POST', body: payload },
  )
  return data.ticket
}

type RedeemPayloadShape = { eventId: string; counter: number; ktpChecked: boolean }

export async function updateQueue(
  eventId: string,
  payload: { waitingCount?: number; counterCount?: number },
): Promise<EventDetail> {
  const data = await callApi<{ event: EventDetail }>(`/operational/v1/events/${eventId}/queue`, {
    method: 'PATCH',
    body: payload,
  })
  return data.event
}

export async function createEvent(payload: CreateEventPayload): Promise<EventDetail> {
  const data = await callApi<{ event: EventDetail }>('/operational/v1/events', {
    method: 'POST',
    body: payload,
  })
  return data.event
}

// --- Analytics ---

export async function fetchSummary(eventId: string): Promise<AnalyticsSummary> {
  return callApi<AnalyticsSummary>(`/analytics/v1/events/${eventId}/summary`)
}

export async function fetchOverview(): Promise<OverviewEvent[]> {
  const data = await callApi<{ events: OverviewEvent[] }>('/analytics/v1/overview')
  return data.events
}

export type { Queue }
