import type { ManageSeatStatus } from '@/types/seating'

const ITEMS: Array<{ status: ManageSeatStatus; label: string }> = [
  { status: 'available', label: 'Tersedia' },
  { status: 'disabled', label: 'Tidak dipakai' },
  { status: 'held', label: 'Ditahan pesanan' },
  { status: 'sold', label: 'Terjual' },
]

// Contoh kursinya digambar sama persis dengan di kanvas (block-seats.tsx).
function Swatch({ status }: { status: ManageSeatStatus }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="flex-none">
      {status === 'available' ? <circle cx="8" cy="8" r="6.5" className="fill-tint-200 stroke-accent" /> : null}
      {status === 'held' ? (
        <circle cx="8" cy="8" r="6.5" className="fill-warning-bg stroke-warning-ink" strokeWidth="1.5" strokeDasharray="2.5 2" />
      ) : null}
      {status === 'sold' ? <circle cx="8" cy="8" r="6.5" className="fill-muted stroke-ink" /> : null}
      {status === 'disabled' ? (
        <>
          <circle cx="8" cy="8" r="6.5" className="fill-surface stroke-control" />
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" className="stroke-muted" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}

export function SeatLegend({ counts }: { counts?: Record<ManageSeatStatus, number> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]" aria-label="Keterangan status kursi">
      {ITEMS.map((item) => (
        <li key={item.status} className="flex items-center gap-1.5">
          <Swatch status={item.status} />
          <span>{item.label}</span>
          {counts ? <span className="font-mono text-xs text-muted">{counts[item.status]}</span> : null}
        </li>
      ))}
    </ul>
  )
}
