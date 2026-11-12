import { cn } from '@/components/ui/cn'
import { percent } from '@/lib/format'
import type { AnalyticsSummary } from '@/types/api'

// Garis antarsel ditulis per posisi karena grid berubah dari 2 kolom di ponsel
// jadi 4 kolom; divide-x saja akan meninggalkan garis di tepi kiri baris kedua.
const BORDERS = [
  '',
  'border-l border-border-soft',
  'border-t border-border-soft sm:border-t-0 sm:border-l',
  'border-t border-l border-border-soft sm:border-t-0',
]

export function SummaryKpis({ summary }: { summary: AnalyticsSummary }) {
  const { totals } = summary
  const items = [
    { label: 'Terdaftar', value: totals.registered, note: `dari ${totals.capacity} kuota hari ini`, lead: true },
    {
      label: 'Sudah ditukar',
      value: totals.redeemed,
      note: `${percent(totals.redeemed, totals.registered)}% dari terdaftar`,
      lead: false,
    },
    { label: 'Belum datang', value: totals.noShow, note: 'slot sudah lewat', lead: false },
    { label: 'Sisa kuota', value: totals.left, note: 'di slot berikutnya', lead: false },
  ]

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-card border border-border-soft bg-surface sm:grid-cols-4">
      {items.map((item, index) => (
        <div key={item.label} className={cn('grid content-start gap-1 p-4 sm:p-5', BORDERS[index])}>
          <dt className="text-xs leading-4 font-semibold text-muted">{item.label}</dt>
          <dd className={cn('num text-[28px] leading-8 font-bold tracking-[-0.02em]', item.lead ? 'text-accent-ink' : 'text-ink')}>
            {item.value}
          </dd>
          <dd className="text-xs leading-4 text-muted">{item.note}</dd>
        </div>
      ))}
    </dl>
  )
}
