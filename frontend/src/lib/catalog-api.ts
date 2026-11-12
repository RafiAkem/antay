// Panggilan katalog publik, akun pembeli, dan hitung harga.
// Tetap lewat callApi supaya CSRF, envelope, dan pesan galat seragam.
import { ApiError, callApi } from './api'
import type {
  CatalogEvent,
  CatalogEventDetail,
  Customer,
  Quote,
  QuotePayload,
  RegisterPayload,
  SeatMap,
} from '@/types/catalog'

export async function fetchCatalogEvents(signal?: AbortSignal): Promise<CatalogEvent[]> {
  const data = await callApi<{ events: CatalogEvent[] }>('/public/v1/events', { signal })
  return data.events
}

export async function fetchCatalogEvent(eventId: string, signal?: AbortSignal): Promise<CatalogEventDetail> {
  const data = await callApi<{ event: CatalogEventDetail }>(
    `/public/v1/events/${encodeURIComponent(eventId)}`,
    { signal },
  )
  return data.event
}

export async function fetchCustomer(): Promise<Customer | null> {
  try {
    const data = await callApi<{ customer: Customer }>('/customer/v1/me')
    return data.customer
  } catch (error) {
    // 401 di sini artinya memang belum masuk, bukan galat yang perlu ditampilkan
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function registerCustomer(payload: RegisterPayload): Promise<Customer> {
  const data = await callApi<{ customer: Customer }>('/customer/v1/auth/register', { method: 'POST', body: payload })
  return data.customer
}

export async function loginCustomer(email: string, password: string): Promise<Customer> {
  const data = await callApi<{ customer: Customer }>('/customer/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  return data.customer
}

export async function logoutCustomer(): Promise<void> {
  await callApi<null>('/customer/v1/auth/logout', { method: 'POST' })
}

export async function quoteOrder(payload: QuotePayload, signal?: AbortSignal): Promise<Quote> {
  const data = await callApi<{ quote: Quote }>('/customer/v1/orders/quote', { method: 'POST', body: payload, signal })
  return data.quote
}

export async function fetchSeatMap(eventId: string, signal?: AbortSignal): Promise<SeatMap> {
  return callApi<SeatMap>(`/public/v1/events/${encodeURIComponent(eventId)}/seat-map`, { signal })
}
