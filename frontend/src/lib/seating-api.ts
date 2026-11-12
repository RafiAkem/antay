import { callApi } from './api'
import type {
  ManageSeat,
  ManageSeatMap,
  SeatBlock,
  SeatBlockPreview,
  SeatBlockResult,
  SeatBlockSpec,
  SeatLayout,
  SeatStatusChange,
} from '@/types/seating'

const MANAGE = '/operational/v1/manage'

// Slice kosong dari Go bisa keluar sebagai null, jadi daftar dirapikan di sini
// sekali saja supaya komponen tidak perlu menulis `?? []` di mana-mana.
function normalizeBlock(block: SeatBlock): SeatBlock {
  return { ...block, aisleAfter: block.aisleAfter ?? [] }
}

function normalizeResult(result: SeatBlockResult): SeatBlockResult {
  return {
    block: normalizeBlock({ ...result.block, seatCount: result.seatCount ?? result.block.seatCount }),
    seatCount: result.seatCount,
    warnings: result.warnings ?? [],
  }
}

function eventPath(eventId: string): string {
  return `${MANAGE}/events/${encodeURIComponent(eventId)}`
}

function blockPath(blockId: string): string {
  return `${MANAGE}/seat-blocks/${encodeURIComponent(blockId)}`
}

export async function fetchManageSeatMap(eventId: string, signal?: AbortSignal): Promise<ManageSeatMap> {
  const data = await callApi<ManageSeatMap>(`${eventPath(eventId)}/seat-map`, { signal })
  return {
    layout: data.layout,
    blocks: (data.blocks ?? []).map(normalizeBlock),
    seats: data.seats ?? [],
  }
}

export async function saveSeatLayout(eventId: string, layout: SeatLayout): Promise<SeatLayout> {
  const data = await callApi<{ layout: SeatLayout }>(`${eventPath(eventId)}/layout`, {
    method: 'PUT',
    body: layout,
  })
  return data.layout
}

export async function createSeatBlock(eventId: string, spec: SeatBlockSpec): Promise<SeatBlockResult> {
  const data = await callApi<SeatBlockResult>(`${eventPath(eventId)}/seat-blocks`, {
    method: 'POST',
    body: spec,
  })
  return normalizeResult(data)
}

export async function updateSeatBlock(blockId: string, patch: Partial<SeatBlockSpec>): Promise<SeatBlockResult> {
  const data = await callApi<SeatBlockResult>(blockPath(blockId), { method: 'PATCH', body: patch })
  return normalizeResult(data)
}

export async function deleteSeatBlock(blockId: string): Promise<void> {
  await callApi<void>(blockPath(blockId), { method: 'DELETE' })
}

export async function changeSeatStatus(eventId: string, change: SeatStatusChange): Promise<ManageSeat[]> {
  const data = await callApi<{ seats: ManageSeat[] }>(`${eventPath(eventId)}/seats`, {
    method: 'PATCH',
    body: change,
  })
  return data.seats ?? []
}

// Pratinjau tidak menyimpan apa pun. Server memakai rumus yang sama dengan
// saat menyimpan, jadi yang terlihat di editor sama dengan hasil akhirnya.
export async function previewSeatBlock(
  eventId: string,
  spec: SeatBlockSpec,
  signal?: AbortSignal,
): Promise<SeatBlockPreview> {
  const data = await callApi<SeatBlockPreview>(`${MANAGE}/seat-blocks/preview`, {
    method: 'POST',
    body: { eventId, ...spec },
    signal,
  })
  return { seats: data.seats ?? [], warnings: data.warnings ?? [] }
}
