import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { WHEN_OPTIONS, type WhenFilter } from './event-dates'
import { parseSort, SORT_OPTIONS, type EventSort } from './event-filters'

type EventsToolbarProps = {
  query: string
  when: WhenFilter
  sort: EventSort
  onQueryChange: (value: string) => void
  onWhenChange: (value: WhenFilter) => void
  onSortChange: (value: EventSort) => void
}

export function EventsToolbar({ query, when, sort, onQueryChange, onWhenChange, onSortChange }: EventsToolbarProps) {
  return (
    <div className="grid gap-3">
      <form role="search" onSubmit={(event) => event.preventDefault()} className="relative">
        <label htmlFor="events-search" className="sr-only">
          Cari event
        </label>
        <SearchGlyph />
        <Input
          id="events-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cari nama event, tempat, atau item"
          autoComplete="off"
          enterKeyHint="search"
          className="pl-9"
        />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Di ponsel chip digeser, bukan dibungkus ke baris kedua. */}
        <div
          role="group"
          aria-label="Saring menurut tanggal"
          className="-mx-gutter flex min-w-0 flex-1 gap-2 overflow-x-auto px-gutter [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {WHEN_OPTIONS.map((option) => (
            <Chip key={option.value} selected={when === option.value} onClick={() => onWhenChange(option.value)}>
              {option.label}
            </Chip>
          ))}
        </div>
        {/* Select belum menerima aria-labelledby, jadi labelnya ditempel lewat group. */}
        <div role="group" aria-labelledby="events-sort-label" className="flex flex-none items-center gap-2">
          <span id="events-sort-label" className="text-[13px] font-semibold text-muted">
            Urutkan
          </span>
          <Select
            value={sort}
            options={SORT_OPTIONS}
            onChange={(value) => onSortChange(parseSort(value))}
            className="w-[132px]"
          />
        </div>
      </div>
    </div>
  )
}

function SearchGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
    >
      <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
