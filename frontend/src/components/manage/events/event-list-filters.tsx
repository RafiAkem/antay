import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/field'
import { STATUS_TABS, type StatusTab } from './use-manage-events'

type EventListFiltersProps = {
  tab: StatusTab
  counts: Record<StatusTab, number>
  query: string
  onTab: (tab: StatusTab) => void
  onQuery: (query: string) => void
}

export function EventListFilters({ tab, counts, query, onTab, onQuery }: EventListFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Di ponsel chip digeser ke samping, bukan dibungkus jadi dua baris. */}
      <div role="group" aria-label="Saring status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:pb-0">
        {STATUS_TABS.map((item) => (
          <Chip key={item.value} selected={tab === item.value} onClick={() => onTab(item.value)}>
            {item.label}
            <span className="font-mono text-xs font-normal text-muted">{counts[item.value]}</span>
          </Chip>
        ))}
      </div>
      <label className="lg:w-[300px]">
        <span className="sr-only">Cari event</span>
        <Input
          type="search"
          value={query}
          placeholder="Cari nama, tempat, atau kode"
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
    </div>
  )
}
