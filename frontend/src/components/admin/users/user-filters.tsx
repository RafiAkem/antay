import { Chip } from '@/components/ui/chip'
import type { ManagedUser } from '@/types/accounts'
import { SearchInput } from '../shared/search-input'
import { ROLE_FILTERS, type RoleFilter } from './user-labels'

type Props = {
  rows: ManagedUser[]
  filter: RoleFilter
  query: string
  onFilterChange: (filter: RoleFilter) => void
  onQueryChange: (query: string) => void
}

// Jumlah di tiap chip dihitung dari semua akun, bukan hasil pencarian, supaya
// angkanya tidak ikut berubah-ubah saat admin mengetik.
export function UserFilters({ rows, filter, query, onFilterChange, onQueryChange }: Props) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.role] = (acc[row.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
      <div
        role="group"
        aria-label="Saring menurut peran"
        className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {ROLE_FILTERS.map((item) => (
          <Chip key={item.value} selected={filter === item.value} onClick={() => onFilterChange(item.value)}>
            {item.label}
            <span className="num ml-1 font-normal opacity-80">{item.value === 'all' ? rows.length : (counts[item.value] ?? 0)}</span>
          </Chip>
        ))}
      </div>
      <SearchInput value={query} onChange={onQueryChange} placeholder="Cari nama atau email" label="Cari akun" />
    </div>
  )
}
