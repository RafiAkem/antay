import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { Empty } from '@/components/ui/pill'
import type { Ticket } from '@/types/api'

const MAX_ROWS = 6

export function WaitingList({
  slots,
  tickets,
  search,
  onSearchChange,
  onPick,
}: {
  slots: string[]
  tickets: Ticket[]
  search: string
  onSearchChange: (value: string) => void
  onPick: (code: string) => void
}) {
  const query = search.trim().toLowerCase()
  const filtered = query
    ? tickets.filter(
        (ticket) =>
          ticket.visitorName.toLowerCase().includes(query) || ticket.code.toLowerCase().includes(query),
      )
    : tickets
  const rows = filtered.slice(0, MAX_ROWS)
  const slotLabel = slots.length > 0 ? slots.join(' & ') : 'yang berjalan'

  return (
    <Card>
      <CardHead title={`Menunggu di slot ${slotLabel}`} meta={`${tickets.length} tiket`} />
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Cari nama atau kode"
        aria-label="Cari nama atau kode di daftar menunggu"
        className="mb-2"
      />

      {rows.length > 0 ? (
        <div className="grid">
          {rows.map((ticket) => (
            <div
              key={ticket.id}
              className="flex min-h-11 items-center justify-between gap-3 border-t border-rule first:border-t-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ticket.visitorName}</p>
                <p className="truncate font-mono text-xs text-muted">
                  {ticket.code} · slot {ticket.slotStart}
                </p>
              </div>
              <Button variant="ghost" size="small" onClick={() => onPick(ticket.code)}>
                Pilih
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={query ? 'Tidak ada yang cocok' : 'Belum ada yang menunggu'}
          hint={
            query
              ? 'Coba potongan nama atau kode lain.'
              : 'Tiket di slot yang sedang berjalan akan muncul di sini.'
          }
        />
      )}

      {filtered.length > 0 ? (
        <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px] text-muted">
          <span className="num">
            {Math.min(MAX_ROWS, filtered.length)} dari {filtered.length} ditampilkan
          </span>
          <span>{query ? 'hasil pencarian' : 'urut waktu pesan'}</span>
        </div>
      ) : null}
    </Card>
  )
}
