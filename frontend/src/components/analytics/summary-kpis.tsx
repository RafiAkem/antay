import { percent } from '@/lib/format'
import type { AnalyticsSummary } from '@/types/api'

const BORDERS = [
  '',
  'border-l border-rule',
  'border-t border-rule sm:border-t-0 sm:border-l',
  'border-t border-l border-rule sm:border-t-0',
]

export function SummaryKpis({ summary }: { summary: AnalyticsSummary }) {
  const { totals } = summary
  const items = [
    {
      label: 'Terdaftar',
      value: totals.registered,
      note: `dari ${totals.capacity} kuota hari ini`,
      lead: true,
    },
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
    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface sm:grid-cols-4">
      {items.map((item, index) => (
        <div key={item.label} className={`grid content-start gap-1 p-4 ${BORDERS[index]}`}>
          <span className="text-xs font-medium text-muted">{item.label}</span>
          <strong className={`num text-[26px] font-semibold leading-8 ${item.lead ? 'text-accent-ink' : 'text-ink'}`}>
            {item.value}
          </strong>
          <span className="text-xs leading-4 text-muted">{item.note}</span>
        </div>
      ))}
    </div>
  )
}
