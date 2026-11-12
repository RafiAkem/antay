import { Button } from '@/components/ui/button'
import { ListEmpty, ListError, ListSkeleton } from '../shared/list-states'
import { UserFilters } from './user-filters'
import { UserList } from './user-list'
import type { RoleFilter } from './user-labels'
import type { useUsersPage } from './use-users-page'

type Page = ReturnType<typeof useUsersPage>

// Kosong karena filter peran berbeda dengan kosong karena pencarian;
// masing-masing diberi kalimat dan aksi sendiri.
const EMPTY_BY_ROLE: Record<Exclude<RoleFilter, 'all'>, { title: string; hint: string }> = {
  staff: {
    title: 'Belum ada akun petugas loket',
    hint: 'Buat satu akun per petugas supaya catatan penukaran menunjukkan siapa yang melayani.',
  },
  organizer: {
    title: 'Belum ada akun penyelenggara',
    hint: 'Pastikan penyelenggaranya sudah terdaftar di halaman Penyelenggara, lalu buatkan akunnya di sini.',
  },
  admin: {
    title: 'Belum ada admin mal lain',
    hint: 'Tambahkan admin kedua supaya persetujuan event tidak tertahan saat kamu cuti.',
  },
}

export function UserListSection({ page }: { page: Page }) {
  if (page.error) return <ListError title="Daftar akun gagal dimuat" message={page.error} onRetry={page.retry} />
  if (page.loading) return <ListSkeleton label="Memuat daftar akun" />

  const searching = page.query.trim().length > 0

  return (
    <div className="grid gap-4">
      <UserFilters
        rows={page.rows}
        filter={page.filter}
        query={page.query}
        onFilterChange={page.setFilter}
        onQueryChange={page.setQuery}
      />

      {page.visible.length > 0 ? (
        <UserList
          rows={page.visible}
          meId={page.meId}
          organizerNames={page.organizerNames}
          onReset={page.openReset}
          onToggle={page.askToggle}
        />
      ) : searching ? (
        <ListEmpty
          title={`Tidak ada akun yang cocok dengan "${page.query.trim()}"`}
          hint="Cari pakai potongan nama atau email. Pencarian hanya di peran yang sedang dipilih."
          action={
            <Button variant="ghost" size="small" onClick={() => page.setQuery('')}>
              Hapus pencarian
            </Button>
          }
        />
      ) : page.filter !== 'all' ? (
        <ListEmpty
          title={EMPTY_BY_ROLE[page.filter].title}
          hint={EMPTY_BY_ROLE[page.filter].hint}
          action={
            <Button size="small" onClick={page.openCreate}>
              Tambah akun
            </Button>
          }
        />
      ) : (
        <ListEmpty title="Belum ada akun internal" hint="Buat akun untuk petugas loket, penyelenggara, atau admin mal lain." />
      )}
    </div>
  )
}
